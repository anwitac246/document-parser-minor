from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from typing import Optional
import httpx
import io
from services.groq_service import groq_service
from services.document_processor import document_processor
from config.settings import settings

router = APIRouter()

@router.post("/analyze-voice")
async def analyze_with_voice(
    userId: str = Form(...),
    audio: UploadFile = File(...),
    document: Optional[UploadFile] = File(None),
):
    """
    Process voice input with optional document
    1. Transcribe audio to text using Groq Whisper
    2. Analyze document with the transcribed query
    3. Generate conversational response
    4. Convert response to speech using ElevenLabs
    """
    try:
        print(f"\n=== Voice Analysis Request ===")
        print(f"User ID: {userId}")
        print(f"Has audio: {audio is not None}")
        print(f"Has document: {document is not None}")
        
        # Step 1: Transcribe audio using Groq Whisper
        audio_bytes = await audio.read()
        print(f"Audio size: {len(audio_bytes)} bytes")
        
        transcription = await transcribe_audio(audio_bytes, audio.filename)
        print(f"Transcribed text: {transcription}")
        
        if not transcription:
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
        
        # Step 2: Process document if provided
        document_text = ""
        source_name = ""
        
        if document:
            print("Processing document...")
            doc_bytes = await document.read()
            
            if len(doc_bytes) > settings.MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail="Document too large")
            
            content_type = document.content_type.lower() if document.content_type else ""
            document_text = document_processor.process_file(
                doc_bytes,
                content_type,
                document.filename
            )
            source_name = document.filename
            print(f"Document text length: {len(document_text)}")
        
        # Step 3: Generate conversational response
        if document_text:
            # Analyze document with voice query
            analysis = groq_service.analyze_document_voice(
                document_text, 
                transcription
            )
            response_text = analysis.get("conversational_response", "")
        else:
            # Just chat without document
            response_text = groq_service.chat_response(transcription)
        
        print(f"Response generated: {len(response_text)} chars")
        
        # Step 4: Convert to speech using ElevenLabs
        audio_response = await text_to_speech(response_text)
        
        print("SUCCESS: Returning voice response")
        
        # Return audio with metadata in headers
        return Response(
            content=audio_response,
            media_type="audio/mpeg",
            headers={
                "X-Transcription": transcription,
                "X-Response-Text": response_text[:500],  # First 500 chars for preview
                "X-Source": source_name if source_name else "none"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Voice analysis failed: {str(e)}")


async def transcribe_audio(audio_bytes: bytes, filename: str) -> str:
    """Transcribe audio using Groq Whisper API"""
    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        
        # Create file-like object
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename
        
        transcription = client.audio.transcriptions.create(
            file=(filename, audio_file),
            model="whisper-large-v3",
            response_format="text"
        )
        
        return transcription
    
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise Exception(f"Failed to transcribe audio: {str(e)}")


async def text_to_speech(text: str) -> bytes:
    """Convert text to speech using ElevenLabs API"""
    try:
        if not settings.ELEVENLABS_API_KEY:
            raise Exception("ElevenLabs API key not configured")
        
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": settings.ELEVENLABS_API_KEY
        }
        
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=data, headers=headers)
            
            if response.status_code != 200:
                raise Exception(f"ElevenLabs API error: {response.text}")
            
            return response.content
    
    except Exception as e:
        print(f"TTS error: {str(e)}")
        raise Exception(f"Failed to generate speech: {str(e)}")