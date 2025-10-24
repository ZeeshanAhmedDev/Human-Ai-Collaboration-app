from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class GatewaySettings(BaseSettings):
    """Gateway service configuration"""
    
    # Service Configuration
    host: str = Field(default="0.0.0.0", description="Host to bind to")
    port: int = Field(default=8000, description="Port to bind to")
    debug: bool = Field(default=False, description="Debug mode")
    
    # External Service URLs
    orch_url: str = Field(default="http://localhost:8001/run", description="Orchestrator service URL")
    task_url: str = Field(default="http://localhost:8002/task", description="Task service URL")
    
    # CORS Configuration
    allowed_origins: list = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"], 
        description="Allowed CORS origins"
    )
    
    # Timeouts
    orchestrator_timeout: int = Field(default=300, description="Orchestrator request timeout in seconds")
    task_service_timeout: int = Field(default=30, description="Task service request timeout in seconds")
    
    # Health Check
    health_check_timeout: int = Field(default=10, description="Health check timeout in seconds")
    
    class Config:
        env_file = ".env"
        env_prefix = "GATEWAY_"


# Create global settings instance
settings = GatewaySettings()