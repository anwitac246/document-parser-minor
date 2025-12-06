import io
import PyPDF2
import docx
import fitz
from PIL import Image
from services.vision_service import vision_service

class DocumentProcessor:
    
    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        try:
            pdf_file = io.BytesIO(file_bytes)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            if text.strip():
                return text.strip()
            
            return self._extract_with_ocr(file_bytes)
        except Exception as e:
            return f"PDF extraction error: {str(e)}"
    
    def _extract_with_ocr(self, file_bytes: bytes) -> str:
        if not vision_service.is_available():
            return "No text found - OCR not available"
        
        try:
            pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
            all_text = []
            
            for page_num in range(min(pdf_doc.page_count, 20)):
                page = pdf_doc[page_num]
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img_data = pix.tobytes("png")
                
                ocr_text = vision_service.extract_text_from_image(img_data)
                if not ocr_text.startswith("Error") and ocr_text != "No text found in image":
                    all_text.append(f"--- Page {page_num + 1} ---\n{ocr_text}")
            
            pdf_doc.close()
            return "\n\n".join(all_text) if all_text else "No text extracted"
        except Exception as e:
            return f"OCR extraction error: {str(e)}"
    
    def extract_text_from_docx(self, file_bytes: bytes) -> str:
        try:
            docx_file = io.BytesIO(file_bytes)
            doc = docx.Document(docx_file)
            text = "\n".join([para.text for para in doc.paragraphs if para.text])
            return text.strip() if text.strip() else "No text found in document"
        except Exception as e:
            return f"DOCX extraction error: {str(e)}"
    
    def extract_text_from_image(self, file_bytes: bytes) -> str:
        try:
            Image.open(io.BytesIO(file_bytes)).verify()
        except Exception as e:
            return f"Invalid image: {str(e)}"
        
        return vision_service.extract_text_from_image(file_bytes)
    
    def process_file(self, file_bytes: bytes, content_type: str, filename: str) -> str:
        filename_lower = filename.lower()
        
        if content_type == "application/pdf" or filename_lower.endswith('.pdf'):
            return self.extract_text_from_pdf(file_bytes)
        
        elif (content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
              or filename_lower.endswith('.docx')):
            return self.extract_text_from_docx(file_bytes)
        
        elif content_type.startswith("image/") or filename_lower.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            return self.extract_text_from_image(file_bytes)
        
        return f"Unsupported file type: {content_type}"

document_processor = DocumentProcessor()