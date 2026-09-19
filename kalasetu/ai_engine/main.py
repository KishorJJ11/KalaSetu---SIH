"""
KalaSetu AI Microservice
--------------------------
FastAPI service exposing:
  POST /api/ai/enhance-image   -> AI background removal + studio composite
  POST /api/ai/suggest-price   -> Smart dynamic pricing engine
  GET  /health                 -> Service health check

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import base64
import io
import logging
import shutil
import time
from typing import Any, Dict, List

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from bhashini_client import generate_seo_description_from_audio
from image_processor import enhance_product_image
from pricing_engine import calculate_price
from schemas import HealthResponse, PriceSuggestionRequest, PriceSuggestionResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kalasetu.ai_engine")

SERVICE_VERSION = "1.0.0"

app = FastAPI(
    title="KalaSetu AI Microservice",
    description="AI image enhancement and smart pricing engine for marginalized artisans.",
    version=SERVICE_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", service="kalasetu-ai-engine", version=SERVICE_VERSION)


@app.post("/api/ai/enhance-image")
async def enhance_image(file: UploadFile = File(...), return_format: str = Form(default="binary")):
    """
    Accepts a multipart image upload, removes the background, and returns
    a studio-composited product photo.

    return_format:
      - "binary" (default): returns the PNG image directly (image/png)
      - "base64": returns a JSON payload with a base64-encoded PNG
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported content type '{file.content_type}'. "
            f"Allowed: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 15MB limit.")

    start = time.monotonic()
    try:
        enhanced_bytes = enhance_product_image(raw_bytes)
    except ValueError as ve:
        logger.warning(f"Image rejected: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Image enhancement failed")
        raise HTTPException(status_code=500, detail=f"Image enhancement failed: {exc}") from exc
    elapsed_ms = round((time.monotonic() - start) * 1000, 1)
    logger.info("Enhanced image '%s' in %sms", file.filename, elapsed_ms)

    if return_format == "base64":
        encoded = base64.b64encode(enhanced_bytes).decode("utf-8")
        return {
            "success": True,
            "processingTimeMs": elapsed_ms,
            "imageBase64": f"data:image/png;base64,{encoded}",
        }

    return Response(
        content=enhanced_bytes,
        media_type="image/png",
        headers={"X-Processing-Time-Ms": str(elapsed_ms)},
    )


@app.post("/api/ai/suggest-price", response_model=PriceSuggestionResponse)
async def suggest_price(payload: PriceSuggestionRequest):
    """
    Computes a structured price breakdown using the heuristic + market
    benchmark pricing engine.
    """
    try:
        result = calculate_price(
            category=payload.category,
            raw_material_cost=payload.rawMaterialCost,
            hours_spent=payload.hoursSpent,
            skill_level=payload.skillLevel,
            weight_or_size=payload.weightOrSize,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Price calculation failed")
        raise HTTPException(status_code=500, detail=f"Price calculation failed: {exc}") from exc

    return result


@app.post("/api/ai/chat")
async def chat_assistant(
    text: str = Form(None),
    audio: UploadFile = File(None)
):
    """
    Handles LLM chat requests. 
    Accepts text and/or audio. Returns text response.
    """
    if not text and not audio:
        raise HTTPException(status_code=400, detail="Must provide either text or audio")

    import os
    import google.generativeai as genai
    from dotenv import load_dotenv

    # Load from the Node.js server .env file
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'server', '.env'))

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing from .env")

    genai.configure(api_key=api_key)
    
    # We use gemini-3.5-flash for speed and multimodal capabilities
    model = genai.GenerativeModel(
        model_name="gemini-3.5-flash",
        system_instruction=(
            "You are the KalaSetu Assistant, a helpful AI designed specifically for rural "
            "Indian artisans and craftspeople. Your goal is to help them understand how to use "
            "the platform, catalog their products, price items fairly, and answer business queries. "
            "Speak warmly, simply, and concisely. If they ask questions in regional languages or "
            "broken English, reply back clearly in a way they can understand."
        )
    )

    contents = []
    
    if text:
        contents.append(text)
        
    if audio:
        # Read the file and pass inline to Gemini API
        audio_bytes = await audio.read()
        
        audio_part = {
            "mime_type": audio.content_type or "audio/m4a",
            "data": audio_bytes
        }
        contents.append(audio_part)
        
        try:
            # Generate content
            response = model.generate_content(contents)
        except Exception as e:
            logger.exception("Gemini audio processing failed")
            raise HTTPException(status_code=500, detail=f"LLM processing failed: {e}") from e
    else:
        # Text only
        try:
            response = model.generate_content(contents)
        except Exception as e:
            logger.exception("Gemini text processing failed")
            raise HTTPException(status_code=500, detail=f"LLM processing failed: {e}") from e

    return {"success": True, "text": response.text}


@app.post("/api/ai/generate-description")
async def generate_description_endpoint(audio: UploadFile = File(...)):
    """
    Accepts an audio file (voice note), passes it through Bhashini for ASR/Translation
    (or Gemini as a fallback), and generates an SEO-friendly description using Gemini.
    """
    import os
    import tempfile
    import mimetypes
    
    # Determine extension from mimetype or fallback
    ext = mimetypes.guess_extension(audio.content_type) or '.m4a'
    audio_bytes = await audio.read()
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_audio:
        temp_audio.write(audio_bytes)
        temp_audio_path = temp_audio.name
        
    try:
        desc = generate_seo_description_from_audio(temp_audio_path)
        return {"success": True, "description": desc}
    except Exception as e:
        logger.exception("Failed to generate description from audio")
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
