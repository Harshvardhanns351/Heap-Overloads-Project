"""
Application configuration management.
Centralizes all environment variables and configuration settings.
"""

import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    IS_PRODUCTION: bool = ENVIRONMENT == "production"
    IS_DEVELOPMENT: bool = ENVIRONMENT == "development"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./veloris.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        origin.strip() 
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]
    
    # Frontend
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # API Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    YOUTUBE_API_KEY: str = os.getenv("YOUTUBE_API_KEY", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    
    # File Upload
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
    ALLOWED_UPLOAD_EXTENSIONS: List[str] = os.getenv(
        "ALLOWED_UPLOAD_EXTENSIONS",
        ".pdf,.jpg,.jpeg,.png,.doc,.docx"
    ).split(",")
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()
    
    # OCR
    POPPLER_PATH: str = os.getenv("POPPLER_PATH", "")
    
    # Trusted Hosts (for production)
    TRUSTED_HOSTS: List[str] = [
        host.strip()
        for host in os.getenv("TRUSTED_HOSTS", "*").split(",")
        if host.strip()
    ]
    
    @classmethod
    def validate(cls) -> None:
        """Validate critical configuration settings."""
        if cls.IS_PRODUCTION:
            if cls.SECRET_KEY == "dev-secret-key-change-in-production":
                raise ValueError("SECRET_KEY must be set in production!")
            if not cls.DATABASE_URL or cls.DATABASE_URL == "sqlite:///./veloris.db":
                raise ValueError("Production DATABASE_URL must be set!")
            if not cls.GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY must be set in production!")


settings = Settings()

# Validate settings on import
if settings.IS_PRODUCTION:
    settings.validate()
