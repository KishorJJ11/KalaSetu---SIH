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
import logging
import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
