from __future__ import annotations

from fastapi import Body
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agents.comic_strip_agent import get_comic_strip_agent
from app.config import settings
from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ComicStripRequest,
    ComicStripResponse,
    DetectRequest,
    DetectResponse,
)
from app.orchestrator.core_orchestrator import get_orchestrator


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "model": settings.vertex_model_name,
        "gemini_configured": settings.has_real_gcp_project,
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest = Body(...)):
    try:
        orchestrator = get_orchestrator()
        result = orchestrator.handle(request)
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Analyze request failed: {str(exc)}",
        ) from exc


@app.post("/detect", response_model=DetectResponse)
def detect(request: DetectRequest = Body(...)):
    try:
        orchestrator = get_orchestrator()
        result = orchestrator.detect(request)
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Detect request failed: {str(exc)}",
        ) from exc


@app.post("/story/comic-strip", response_model=ComicStripResponse)
def generate_story_comic_strip(request: ComicStripRequest = Body(...)):
    try:
        comic_strip_agent = get_comic_strip_agent()
        result = comic_strip_agent.run(request)
        return result.model_dump()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Comic strip generation failed: {str(exc)}",
        ) from exc
