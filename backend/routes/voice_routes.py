from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, JSONResponse
from typing import Optional
import httpx
import io
from services.groq_service import groq_service
from services.document_processor import document_processor
from config.settings import settings
import speech_recognition as sr
from pydub import AudioSegment
import tempfile
import os
from gtts import gTTS

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio_endpoint(
    audio: UploadFile = File(...),
):
    """
    Step 1: Transcribe audio to text only
    Returns the transcribed text immediately when user stops recording
    """
    temp_wav_path = None
    try:
        print(f"\n=== Transcription Request ===")
        
        # Read and convert audio to WAV
        audio_bytes = await audio.read()
        print(f"Audio size: {len(audio_bytes)} bytes")
        
        # Create temp file for audio conversion
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            temp_wav_path = temp_audio.name
        
        # Convert to WAV format using pydub
        try:
            audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
            audio_segment.export(temp_wav_path, format='wav')
            print(f"Audio converted to WAV")
        except Exception as e:
            print(f"Audio conversion error: {str(e)}")
            raise HTTPException(status_code=400, detail="Failed to process audio file")
        
        # Transcribe using speech_recognition
        transcription = transcribe_audio_local(temp_wav_path)
        print(f"Transcribed text: {transcription}")
        
        if not transcription:
            raise HTTPException(status_code=400, detail="Could not transcribe audio. Please speak clearly.")
        
        return JSONResponse({
            "success": True,
            "transcription": transcription
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Cleanup temp file
        if temp_wav_path and os.path.exists(temp_wav_path):
            try:
                os.unlink(temp_wav_path)
            except:
                pass

@router.post("/analyze-and-speak")
async def analyze_and_speak(
    userId: str = Form(...),
    query: str = Form(...),
    document: Optional[UploadFile] = File(None),
):
    """
    Step 2: Analyze document with query and return audio response
    Takes the transcribed text and document, returns speech audio
    """
    try:
        print(f"\n=== Analysis & TTS Request ===")
        print(f"User ID: {userId}")
        print(f"Query: {query}")
        print(f"Has document: {document is not None}")
        
        # Process document if provided
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
        
        # Generate conversational response
        if document_text:
            # Analyze document with query
            analysis = groq_service.analyze_document_voice(
                document_text,
                query
            )
            response_text = analysis.get("conversational_response", "")
        else:
            # Just chat without document
            response_text = groq_service.chat_response(query)
        
        print(f"Response generated: {len(response_text)} chars")
        
        # Convert to speech with fallback
        audio_response = await text_to_speech_with_fallback(response_text)
        
        print("SUCCESS: Returning voice response")
        
        # Return audio with metadata in headers
        return Response(
            content=audio_response,
            media_type="audio/mpeg",
            headers={
                "X-Response-Text": response_text,
                "X-Source": source_name if source_name else "none"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"EXCEPTION: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def transcribe_audio_local(wav_path: str) -> str:
    """
    Transcribe audio using speech_recognition library (Google Speech Recognition - FREE)
    """
    try:
        recognizer = sr.Recognizer()
        
        with sr.AudioFile(wav_path) as source:
            # Adjust for ambient noise
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            # Record the audio
            audio_data = recognizer.record(source)
        
        # Use Google Speech Recognition (free, no API key needed)
        try:
            text = recognizer.recognize_google(audio_data)
            return text
        except sr.UnknownValueError:
            print("Google Speech Recognition could not understand audio")
            return ""
        except sr.RequestError as e:
            print(f"Could not request results from Google Speech Recognition service; {e}")
            return ""
            
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return ""

async def text_to_speech_elevenlabs(text: str) -> bytes:
    """Convert text to speech using ElevenLabs API"""
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
        "model_id": "eleven_turbo_v2_5",
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

def text_to_speech_gtts(text: str) -> bytes:
    """Convert text to speech using Google TTS (fallback)"""
    temp_file = None
    try:
        # Create temp file for gTTS output
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp:
            temp_file = temp.name
        
        # Generate speech using gTTS
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(temp_file)
        
        # Read the audio file
        with open(temp_file, 'rb') as audio_file:
            audio_bytes = audio_file.read()
        
        return audio_bytes
        
    except Exception as e:
        print(f"gTTS error: {str(e)}")
        raise Exception(f"Failed to generate speech with gTTS: {str(e)}")
    finally:
        # Cleanup temp file
        if temp_file and os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except:
                pass

async def text_to_speech_with_fallback(text: str) -> bytes:
    """
    Convert text to speech with fallback mechanism
    Tries ElevenLabs first, falls back to gTTS if it fails
    """
    try:
        # Try ElevenLabs first
        print("Attempting TTS with ElevenLabs...")
        audio_bytes = await text_to_speech_elevenlabs(text)
        print("✓ ElevenLabs TTS successful")
        return audio_bytes
        
    except Exception as elevenlabs_error:
        # Log the ElevenLabs error
        print(f"⚠ ElevenLabs TTS failed: {str(elevenlabs_error)}")
        print("Falling back to Google TTS (gTTS)...")
        
        try:
            # Fallback to gTTS
            audio_bytes = text_to_speech_gtts(text)
            print("✓ gTTS fallback successful")
            return audio_bytes
            
        except Exception as gtts_error:
            # Both methods failed
            print(f"✗ gTTS also failed: {str(gtts_error)}")
            raise Exception(
                f"All TTS methods failed. ElevenLabs: {str(elevenlabs_error)}, "
                f"gTTS: {str(gtts_error)}"
            )