from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from services.document_processor import document_processor
from services.url_scraper import url_scraper
from services.groq_service import groq_service
from services.analysis_formatter import analysis_formatter
from config.settings import settings
import traceback

router = APIRouter()

@router.post("/analyze")
async def analyze_document(
    userId: str = Form(...),
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    message: Optional[str] = Form(None)
):
    print(f"\n=== Document Analysis Request ===")
    print(f"User ID: {userId}")
    print(f"Has file: {file is not None}")
    print(f"Has URL: {url is not None}")
    print(f"User message: {message}")
    
    if file:
        print(f"File name: {file.filename}")
        print(f"File type: {file.content_type}")
    
    if not file and not url:
        print("ERROR: Neither file nor URL provided")
        raise HTTPException(status_code=400, detail="Either file or URL required")
    
    try:
        document_text = ""
        source_name = ""
        
        if file:
            print("Processing file upload...")
            file_bytes = await file.read()
            print(f"File size: {len(file_bytes)} bytes")
            
            if len(file_bytes) > settings.MAX_FILE_SIZE:
                print("ERROR: File too large")
                raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
            
            if not file_bytes:
                print("ERROR: Empty file")
                raise HTTPException(status_code=400, detail="Empty file uploaded")
            
            content_type = file.content_type.lower() if file.content_type else ""
            filename_lower = file.filename.lower() if file.filename else ""
            
            print(f"Content type: {content_type}")
            print(f"Filename: {filename_lower}")
            
            allowed = False
            if content_type in settings.ALLOWED_FILE_TYPES:
                allowed = True
            elif any(filename_lower.endswith(ext) for ext in ['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp']):
                allowed = True
            
            if not allowed:
                print(f"ERROR: File type not allowed")
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type. Allowed: PDF, DOCX, Images"
                )
            
            print("Extracting text from file...")
            document_text = document_processor.process_file(
                file_bytes,
                content_type,
                file.filename
            )
            print(f"Extracted text length: {len(document_text)}")
            print(f"Text preview: {document_text[:100]}...")
            source_name = file.filename
        
        elif url:
            print(f"Processing URL: {url}")
            result = url_scraper.extract_text_from_url(url)
            
            if not result["success"]:
                print(f"ERROR: URL extraction failed: {result['error']}")
                raise HTTPException(status_code=400, detail=result["error"])
            
            document_text = result["text"]
            source_name = result.get("title", url)
            print(f"Extracted text length: {len(document_text)}")
        
        if document_text.startswith("Error") or document_text.startswith("No text"):
            print(f"ERROR: Text extraction failed: {document_text}")
            raise HTTPException(status_code=400, detail=document_text)
        
        if len(document_text) < 50:
            print(f"ERROR: Text too short ({len(document_text)} chars)")
            raise HTTPException(
                status_code=400,
                detail="Document text too short - please upload a valid document"
            )
        
        print("Analyzing document with GROQ...")
        analysis = groq_service.analyze_document(document_text, user_query=message if message else None)
        print(f"Analysis complete. Fishy clauses found: {len(analysis.get('fishy_clauses', []))}")
        
        print("Formatting response...")
        formatted_response = analysis_formatter.format_analysis_as_markdown(
            analysis,
            source_name
        )
        
        terms_for_highlighting = analysis_formatter.extract_terms_for_highlighting(analysis)
        print(f"Terms for highlighting: {len(terms_for_highlighting)}")
        
        print("SUCCESS: Returning analysis")
        return JSONResponse({
            "success": True,
            "response": formatted_response,
            "analysis": analysis,
            "terms": terms_for_highlighting,
            "source": source_name
        })
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/validate")
async def validate_file(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        
        if len(file_bytes) > settings.MAX_FILE_SIZE:
            return {"valid": False, "error": "File size exceeds 10MB limit"}
        
        content_type = file.content_type.lower() if file.content_type else ""
        
        if content_type not in settings.ALLOWED_FILE_TYPES:
            return {"valid": False, "error": f"Unsupported file type: {content_type}"}
        
        return {"valid": True}
    
    except Exception as e:
        return {"valid": False, "error": str(e)}