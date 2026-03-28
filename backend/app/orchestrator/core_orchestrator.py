from __future__ import annotations

from dataclasses import dataclass

from app.config import settings
from app.agents.ask_agent import get_ask_agent
from app.agents.clarifying_agent import get_clarifying_agent
from app.agents.community_agent import get_community_agent
from app.agents.landmark_agent import get_landmark_agent
from app.agents.location_context_agent import get_location_context_agent
from app.agents.story_agent import get_story_agent
from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    DetectRequest,
    DetectResponse,
    LandmarkPreviewResponse,
    SourceItem,
)


@dataclass
class SessionDetectionContext:
    landmark_name: str
    confidence: float
    borough: str | None
    neighborhood: str | None
    profile_id: str | None
    latitude: float | None
    longitude: float | None
    used_fallback: bool


class CoreOrchestrator:
    def __init__(self) -> None:
        self.landmark_agent = get_landmark_agent()
        self.clarifying_agent = get_clarifying_agent()
        self.location_context_agent = get_location_context_agent()
        self.ask_agent = get_ask_agent()
        self.story_agent = get_story_agent()
        self.community_agent = get_community_agent()
        self._session_detection_cache: dict[str, SessionDetectionContext] = {}

    def _cache_session_context(
        self,
        session_id: str | None,
        landmark_name: str,
        confidence: float,
        location_context,
        used_fallback: bool,
    ) -> None:
        if not session_id:
            return

        self._session_detection_cache[session_id] = SessionDetectionContext(
            landmark_name=landmark_name,
            confidence=confidence,
            borough=location_context.borough if location_context else None,
            neighborhood=location_context.neighborhood if location_context else None,
            profile_id=location_context.profile_id if location_context else None,
            latitude=location_context.latitude if location_context else None,
            longitude=location_context.longitude if location_context else None,
            used_fallback=used_fallback,
        )

    def _restore_session_context(self, session_id: str | None):
        if not session_id:
            return None
        cached = self._session_detection_cache.get(session_id)
        if not cached:
            return None

        return self.location_context_agent.resolve(
            landmark_name=cached.landmark_name,
            latitude=cached.latitude,
            longitude=cached.longitude,
        ), cached

    def _detect_with_context(
        self,
        image_base64: str,
        user_hint: str | None,
        latitude: float | None,
        longitude: float | None,
    ):
        detection_result = self.landmark_agent.detect(
            image_base64=image_base64,
            user_hint=user_hint,
            latitude=latitude,
            longitude=longitude,
        )

        location_context = None
        if detection_result.success and detection_result.detected_name:
            location_context = self.location_context_agent.resolve(
                landmark_name=detection_result.detected_name,
                latitude=latitude,
                longitude=longitude,
            )

        return detection_result, location_context

    def detect(self, request: DetectRequest) -> DetectResponse:
        detection_result, location_context = self._detect_with_context(
            image_base64=request.image_base64,
            user_hint=request.query,
            latitude=request.latitude,
            longitude=request.longitude,
        )

        if (
            not detection_result.success
            or detection_result.confidence < settings.landmark_confidence_threshold
        ):
            return self.clarifying_agent.build_response(
                detection_result,
                mode="detect",
                session_id=request.session_id,
            )

        landmark_name = detection_result.detected_name
        self._cache_session_context(
            session_id=request.session_id,
            landmark_name=landmark_name,
            confidence=detection_result.confidence,
            location_context=location_context,
            used_fallback=detection_result.used_fallback,
        )
        neighborhood = location_context.neighborhood if location_context else "New York City"
        borough = location_context.borough if location_context else None
        place_label = (
            f"{neighborhood}, {borough}"
            if neighborhood and borough
            else neighborhood or borough or "New York City"
        )

        return LandmarkPreviewResponse(
            title=landmark_name,
            landmark_name=landmark_name,
            subtitle=f"Recognized in {place_label}",
            overview=(
                f"{landmark_name} is ready to explore. Choose a lens to hear the factual story, "
                "the cinematic past-present-future narrative, or the local community impact."
            ),
            meta={
                "session_id": request.session_id,
                "mode": "detect",
                "agent": "landmark_agent",
                "landmark_confidence": detection_result.confidence,
                "borough": location_context.borough if location_context else None,
                "neighborhood": location_context.neighborhood if location_context else None,
                "multimodal_ready": True,
                "civic_focus": True,
                "used_fallback": detection_result.used_fallback,
            },
            sources=[
                SourceItem(label="Landmark dataset", kind="json"),
                SourceItem(
                    label="Gemini (Vertex AI)" if not detection_result.used_fallback else "Local detection fallback",
                    kind="vertex_ai" if not detection_result.used_fallback else "derived",
                ),
            ],
        )

    def handle(self, request: AnalyzeRequest) -> AnalyzeResponse:
        restored = self._restore_session_context(request.session_id)
        if restored is not None:
            location_context, cached = restored
            landmark_name = cached.landmark_name
            landmark_confidence = cached.confidence
        else:
            detection_result, location_context = self._detect_with_context(
                image_base64=request.image_base64,
                user_hint=None,
                latitude=request.latitude,
                longitude=request.longitude,
            )

            if (
                not detection_result.success
                or detection_result.confidence < settings.landmark_confidence_threshold
            ):
                return self.clarifying_agent.build_response(
                    detection_result,
                    mode=request.mode,
                    session_id=request.session_id,
                )

            landmark_name = detection_result.detected_name
            landmark_confidence = detection_result.confidence
            self._cache_session_context(
                session_id=request.session_id,
                landmark_name=landmark_name,
                confidence=landmark_confidence,
                location_context=location_context,
                used_fallback=detection_result.used_fallback,
            )


        if request.mode == "ask":
            return self.ask_agent.run(
                landmark_name=landmark_name,
                location_context=location_context,
                query=request.query,
                session_id=request.session_id,
                landmark_confidence=landmark_confidence,
            )

        if request.mode == "story":
            return self.story_agent.run(
                landmark_name=landmark_name,
                location_context=location_context,
                session_id=request.session_id,
                landmark_confidence=landmark_confidence,
            )

        if request.mode == "community":
            return self.community_agent.run(
                landmark_name=landmark_name,
                location_context=location_context,
                session_id=request.session_id,
                landmark_confidence=landmark_confidence,
            )

        # Fallback, though schema should prevent invalid mode
        return self.ask_agent.run(
            landmark_name=landmark_name,
            location_context=location_context,
            query=request.query,
            session_id=request.session_id,
            landmark_confidence=landmark_confidence,
        )


_orchestrator: CoreOrchestrator | None = None


def get_orchestrator() -> CoreOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = CoreOrchestrator()
    return _orchestrator
