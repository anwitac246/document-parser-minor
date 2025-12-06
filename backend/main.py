from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routes.chat_routes import router as chat_router
from routes.document_routes import router as document_router
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

app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(document_router, prefix="/document", tags=["document"])

@app.get("/")
async def root():
    return {"message": "AI Legal Assistant API is running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "vision_configured": bool(os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON"))
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)