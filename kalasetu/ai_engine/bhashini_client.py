import os
import base64
import requests
import google.generativeai as genai
import logging
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'server', '.env'))

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

logger = logging.getLogger("kalasetu.bhashini")

BHASHINI_USER_ID = os.getenv("BHASHINI_USER_ID")
BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY")

def generate_seo_description_from_audio(audio_path: str) -> str:
    """
    1. Try to use Bhashini API for ASR + Translation to English.
    2. Fallback to Gemini Multimodal if Bhashini keys are missing or API fails.
    3. Use Gemini to generate an SEO friendly description from the English text.
    """
    english_text = ""
    
    if BHASHINI_USER_ID and BHASHINI_API_KEY:
        try:
            english_text = _run_bhashini_pipeline(audio_path)
            logger.info("Bhashini successfully translated the audio.")
        except Exception as e:
            logger.warning(f"Bhashini pipeline failed: {e}. Falling back to Gemini.")
            english_text = ""
            
    if not english_text:
        logger.info("Using Gemini 1.5 Pro/Flash fallback for multilingual audio transcription.")
        english_text = _run_gemini_translation(audio_path)
        
    return _generate_seo_description(english_text)


def _run_gemini_translation(audio_path: str) -> str:
    # Use Gemini to transcribe and translate audio in one go using inline data
    model = genai.GenerativeModel("gemini-3.5-flash")
    
    with open(audio_path, "rb") as f:
        audio_data = f.read()
        
    audio_part = {
        "mime_type": "audio/m4a",
        "data": audio_data
    }
    
    prompt = "Listen to this audio. It may be in any Indian regional language. Transcribe it and translate it into clear English text. Output ONLY the translated English text."
    response = model.generate_content([prompt, audio_part])
    return response.text.strip()


def _generate_seo_description(english_text: str) -> str:
    model = genai.GenerativeModel("gemini-3.5-flash")
    prompt = f"""
    You are an expert SEO copywriter for an e-commerce platform selling handcrafted artisanal products.
    The artisan has provided the following voice note (translated to English) describing their craft:
    
    "{english_text}"
    
    Write a beautiful, SEO-friendly product description (about 3-4 sentences). 
    Highlight the craftsmanship, cultural value, and materials.
    Do not include any pleasantries, just output the final description text.
    """
    response = model.generate_content(prompt)
    return response.text.strip()


def _run_bhashini_pipeline(audio_path: str) -> str:
    """
    Executes the Bhashini ULCA pipeline for ASR + Translation.
    Since we do not know the exact language spoken, this acts as a placeholder
    for the exact Bhashini Dhruva integration structure.
    """
    with open(audio_path, "rb") as f:
        audio_b64 = base64.b64encode(f.read()).decode("utf-8")

    # 1. Fetch Pipeline config (requires source language, defaulting to 'hi' for demo)
    url_config = "https://meity-auth.ulca.org.in/ulca/apis/v0/model/getModelsPipeline"
    headers_config = {
        "userID": BHASHINI_USER_ID,
        "ulcaApiKey": BHASHINI_API_KEY,
        "Content-Type": "application/json"
    }
    payload_config = {
        "pipelineTasks": [
            {"taskType": "asr", "config": {"language": {"sourceLanguage": "hi"}}},
            {"taskType": "translation", "config": {"language": {"sourceLanguage": "hi", "targetLanguage": "en"}}}
        ],
        "pipelineRequestConfig": {"pipelineId": "64392f96daac500b55c543cd"}
    }
    
    res_config = requests.post(url_config, json=payload_config, headers=headers_config)
    res_config.raise_for_status()
    config_data = res_config.json()
    
    # Extract inference URL and auth token from config_data
    inference_url = config_data["pipelineInferenceAPIEndPoint"]["callbackUrl"]
    auth_key = config_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]["value"]
    auth_name = config_data["pipelineInferenceAPIEndPoint"]["inferenceApiKey"]["name"]
    
    # Find service IDs
    asr_service_id = ""
    trans_service_id = ""
    for task in config_data["pipelineResponseConfig"]:
        if task["taskType"] == "asr":
            asr_service_id = task["config"][0]["serviceId"]
        elif task["taskType"] == "translation":
            trans_service_id = task["config"][0]["serviceId"]

    # 2. Call Inference API
    headers_infer = {
        auth_name: auth_key,
        "Content-Type": "application/json"
    }
    payload_infer = {
        "pipelineTasks": [
            {"taskType": "asr", "config": {"language": {"sourceLanguage": "hi"}, "serviceId": asr_service_id}},
            {"taskType": "translation", "config": {"language": {"sourceLanguage": "hi", "targetLanguage": "en"}, "serviceId": trans_service_id}}
        ],
        "inputData": {
            "audio": [{"audioContent": audio_b64}]
        }
    }
    
    res_infer = requests.post(inference_url, json=payload_infer, headers=headers_infer)
    res_infer.raise_for_status()
    
    infer_data = res_infer.json()
    # The output from the last task (translation)
    translated_text = infer_data["pipelineResponse"][-1]["output"][0]["target"]
    return translated_text
