import os
import tempfile
from google.cloud import vision
from config.settings import settings

class VisionService:
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        try:
            service_account_json = settings.GOOGLE_SERVICE_ACCOUNT_JSON
            if not service_account_json:
                return
            
            with tempfile.NamedTemporaryFile(mode="w+", delete=False, suffix=".json") as tmp_file:
                tmp_file.write(service_account_json)
                tmp_file_path = tmp_file.name
            
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp_file_path
            self.client = vision.ImageAnnotatorClient()
        except Exception as e:
            print(f"Vision API initialization failed: {str(e)}")
            self.client = None
    
    def extract_text_from_image(self, image_bytes: bytes) -> str:
        if not self.client:
            return "Vision API not configured"
        
        try:
            image = vision.Image(content=image_bytes)
            response = self.client.text_detection(image=image)
            
            if response.error.message:
                return f"Vision API error: {response.error.message}"
            
            texts = response.text_annotations
            if texts and len(texts) > 0:
                return texts[0].description.strip()
            return "No text found in image"
        except Exception as e:
            return f"OCR error: {str(e)}"
    
    def is_available(self) -> bool:
        return self.client is not None

vision_service = VisionService()