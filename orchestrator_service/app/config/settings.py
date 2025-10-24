from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class OrchestratorSettings(BaseSettings):
    """Orchestrator service configuration"""
    
    # Service Configuration
    host: str = Field(default="0.0.0.0", description="Host to bind to")
    port: int = Field(default=8001, description="Port to bind to")
    debug: bool = Field(default=False, description="Debug mode")
    
    # Ollama Configuration
    ollama_host: str = Field(default="http://localhost:11434", description="Ollama host URL")
    ollama_model: str = Field(default="qwen2.5-coder:1.5b-instruct", description="Ollama model to use")
    
    # AI Configuration
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="AI temperature setting")
    max_tokens: int = Field(default=2000, ge=100, le=4000, description="Maximum tokens for AI response")
    request_timeout: int = Field(default=120, description="AI request timeout in seconds")
    
    # Agent Configuration
    enable_planner: bool = Field(default=True, description="Enable planner agent")
    enable_developer: bool = Field(default=True, description="Enable developer agent")
    enable_tester: bool = Field(default=True, description="Enable tester agent")
    enable_reviewer: bool = Field(default=True, description="Enable reviewer agent")
    
    # CORS Configuration
    allowed_origins: list = Field(default=["*"], description="Allowed CORS origins")
    
    class Config:
        env_file = ".env"
        env_prefix = "ORCHESTRATOR_"


# Create global settings instance
settings = OrchestratorSettings()