import os
import tempfile
import json
from google.cloud import vision
from config.settings import settings

class VisionService:
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        print("\n=== Initializing Google Vision API ===")
        try:
            service_account_data = settings.GOOGLE_SERVICE_ACCOUNT_JSON
            if not service_account_data:
                print("ERROR: No GOOGLE_SERVICE_ACCOUNT_JSON found in settings")
                return
            
            print(f"Service account data type: {type(service_account_data)}")
            print(f"Service account data length: {len(service_account_data)}")
            
            if service_account_data.endswith('.json') and os.path.exists(service_account_data):
                print(f"Using file path: {service_account_data}")
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = service_account_data
                self.client = vision.ImageAnnotatorClient()
                print("SUCCESS: Vision API initialized with file path")
            else:
                try:
                    json.loads(service_account_data)
                    print("Valid JSON detected, creating temp file...")
                    with tempfile.NamedTemporaryFile(mode="w+", delete=False, suffix=".json") as tmp_file:
                        tmp_file.write(service_account_data)
                        tmp_file_path = tmp_file.name
                    
                    print(f"Temp file created: {tmp_file_path}")
                    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp_file_path
                    self.client = vision.ImageAnnotatorClient()
                    print("SUCCESS: Vision API initialized with JSON content")
                except json.JSONDecodeError as je:
                    print(f"ERROR: Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON: {str(je)}")
                    
        except Exception as e:
            print(f"ERROR: Vision API initialization failed: {str(e)}")
            import traceback
            print(traceback.format_exc())
            self.client = None
        
        print(f"Vision API available: {self.is_available()}")
        print("=" * 40)
    
    def extract_text_from_image(self, image_bytes: bytes) -> str:
        print("\n=== Extracting Text from Image ===")
        if not self.client:
            print("ERROR: Vision API not configured")
            return "Vision API not configured"
        
        try:
            print(f"Image size: {len(image_bytes)} bytes")
            image = vision.Image(content=image_bytes)
            print("Calling Vision API text_detection...")
            response = self.client.text_detection(image=image)
            
            if response.error.message:
                print(f"ERROR: Vision API error: {response.error.message}")
                return f"Vision API error: {response.error.message}"
            
            texts = response.text_annotations
            print(f"Text annotations found: {len(texts)}")
            
            if texts and len(texts) > 0:
                extracted_text = texts[0].description.strip()
                print(f"SUCCESS: Extracted {len(extracted_text)} characters")
                print(f"Text preview: {extracted_text[:100]}...")
                return extracted_text
            
            print("WARNING: No text found in image")
            return "No text found in image"
        except Exception as e:
            print(f"ERROR: OCR error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return f"OCR error: {str(e)}"
    
    def is_available(self) -> bool:
        return self.client is not None

vision_service = VisionService()