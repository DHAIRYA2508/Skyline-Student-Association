from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Student Organization Management System API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # Database Configuration Placeholders
    DATABASE_URL: str = "mysql+pymysql://user:password@localhost:3306/student_org_db"

    # Security & JWT Configuration Placeholders
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS Placeholders
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
