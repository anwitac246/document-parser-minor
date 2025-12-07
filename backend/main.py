from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import traceback

from routes.chat_routes import router as chat_router
from routes.document_routes import router as document_router
from routes.voice_routes import router as voice_router
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

@app.get("/")
async def root():
    return {"message": "AI Legal Assistant API is running"}

@app.get("/health")
async def health_check():
    print(os.getenv("ELEVENLABS_API_KEY"))
    return {
        "status": "healthy",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "vision_configured": bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")),
        "elevenlabs_configured": bool(os.getenv("ELEVENLABS_API_KEY"))
    }

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("Starting AI Legal Assistant API")
    print("="*50)
    print("API URL: http://localhost:8000")
    print("Docs: http://localhost:8000/docs")
    print("Health: http://localhost:8000/health")
    print("="*50 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)