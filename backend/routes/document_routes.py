from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from services.document_processor import document_processor
from services.url_scraper import url_scraper
from services.groq_service import groq_service
from services.analysis_formatter import analysis_formatter
from config.settings import settings

router = APIRouter()

@router.post("/analyze")
async def analyze_document(
    userId: str = Form(...),
    file: UploadFile = File(None),
    url: str = Form(None)
):
    if not file and not url:
        raise HTTPException(status_code=400, detail="Either file or URL required")
    
    try:
        document_text = ""
        source_name = ""
        
        if file:
            file_bytes = await file.read()
            
            if len(file_bytes) > settings.MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
            
            if not file_bytes:
                raise HTTPException(status_code=400, detail="Empty file uploaded")
            
            content_type = file.content_type.lower() if file.content_type else ""
            
            if content_type not in settings.ALLOWED_FILE_TYPES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file type. Allowed: PDF, DOCX, Images"
                )
            
            document_text = document_processor.process_file(
                file_bytes,
                content_type,
                file.filename
            )
            source_name = file.filename
        
        elif url:
            result = url_scraper.extract_text_from_url(url)
            
            if not result["success"]:
                raise HTTPException(status_code=400, detail=result["error"])
            
            document_text = result["text"]
            source_name = result.get("title", url)
        
        if document_text.startswith("Error") or document_text.startswith("No text"):
            raise HTTPException(status_code=400, detail=document_text)
        
        if len(document_text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Document text too short - please upload a valid document"
            )
        
        analysis = groq_service.analyze_document(document_text)
        
        formatted_response = analysis_formatter.format_analysis_as_markdown(
            analysis,
            source_name
        )
        
        terms_for_highlighting = analysis_formatter.extract_terms_for_highlighting(analysis)
        
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