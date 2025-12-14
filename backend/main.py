from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import traceback

from routes.chat_routes import router as chat_router
from routes.document_routes import router as document_router
from routes.voice_routes import router as voice_router
from routes.scheme_router import router as scheme_router
from routes.community_routes import router as community_router
from config.settings import settings

load_dotenv()

app = FastAPI(title="AI Legal Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global error: {str(exc)}")
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

# Include routers
app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(document_router, prefix="/document", tags=["document"])
app.include_router(voice_router, prefix="/voice", tags=["voice"])
app.include_router(scheme_router, prefix="/schemes", tags=["schemes"])
app.include_router(community_router, prefix="/api/communities", tags=["communities"])

@app.get("/")
async def root():
    return {
        "message": "AI Legal Assistant API is running",
        "endpoints": {
            "chat": "/chat",
            "document": "/document",
            "voice": "/voice",
            "schemes": "/schemes",
            "communities": "/api/communities"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "vision_configured": bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")),
        "elevenlabs_configured": bool(os.getenv("ELEVENLABS_API_KEY")),
        "websocket_enabled": True
    }

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("Starting AI Legal Assistant API")
    print("="*60)
    print("API URL: http://localhost:8000")
    print("Docs: http://localhost:8000/docs")
    print("Health: http://localhost:8000/health")
    print("Scheme Status: http://localhost:8000/schemes/status")
    print("Community Status: http://localhost:8000/api/communities/status")
    print("WebSocket: ws://localhost:8000/api/communities/ws/{community_id}")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)