import requests
import io

url = "http://127.0.0.1:8000/api/ai/generate-description"
dummy_audio = io.BytesIO(b"dummy audio content")
files = {"audio": ("test.m4a", dummy_audio, "audio/m4a")}

response = requests.post(url, files=files)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
