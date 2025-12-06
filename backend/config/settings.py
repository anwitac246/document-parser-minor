import os
from typing import List

class Settings:
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GOOGLE_SERVICE_ACCOUNT_JSON: str = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    
    MAX_FILE_SIZE: int = 10 * 1024 * 1024
    MAX_PDF_PAGES: int = 50
    ALLOWED_FILE_TYPES: List[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp"
    ]
    
    LEGAL_TERMS = {
        "indemnify": "To compensate for harm or loss",
        "liability": "Legal responsibility for damages or harm",
        "jurisdiction": "Authority of a court to hear cases",
        "arbitration": "Dispute resolution outside of court",
        "breach": "Violation of a legal obligation",
        "covenant": "A formal binding agreement",
        "damages": "Money awarded for loss or injury",
        "force majeure": "Unforeseeable circumstances preventing contract fulfillment",
        "negligence": "Failure to exercise reasonable care",
        "plaintiff": "Party bringing a case to court",
        "defendant": "Party being sued or accused",
        "statute": "Written law passed by legislature",
        "precedent": "Legal decision serving as example",
        "tort": "Wrongful act causing harm",
        "warranty": "Guarantee about product or service",
        "waiver": "Voluntary relinquishment of a right",
        "injunction": "Court order to do or cease doing something",
        "remedy": "Legal means to enforce a right",
        "consideration": "Something of value exchanged in contract",
        "execute": "To sign and complete a legal document"
    }

settings = Settings()