from __future__ import annotations

from typing import Optional

from app.models.schemas import (
    ClarificationResponse,
    LandmarkDetectionResult,
    ResponseModeType,
    ResponseMeta,
)


class ClarifyingAgent:
    def build_response(
        self,
        detection_result: LandmarkDetectionResult,
        mode: ResponseModeType,
        session_id: Optional[str] = None,
    ) -> ClarificationResponse:
        options = [candidate.name for candidate in detection_result.candidates[:3]]

        if len(options) == 1:
            message = f"I think you may be near {options[0]}. Is that correct?"
        elif options:
            message = (
                "I couldn’t confidently identify the exact landmark. "
                "Are you at one of these nearby places?"
            )
        else:
            message = (
                "I couldn’t confidently identify this landmark. "
                "Can you try another frame or give a short hint?"
            )

        return ClarificationResponse(
            message=message,
            options=options,
            suggested_hint="Try the landmark name, neighborhood, or a visible sign.",
            meta=ResponseMeta(
                session_id=session_id,
                mode=mode,
                agent="clarifying_agent",
                landmark_confidence=detection_result.confidence,
                multimodal_ready=False,
                civic_focus=False,
                used_fallback=True,
            ),
        )


_clarifying_agent: Optional[ClarifyingAgent] = None


def get_clarifying_agent() -> ClarifyingAgent:
    global _clarifying_agent
    if _clarifying_agent is None:
        _clarifying_agent = ClarifyingAgent()
    return _clarifying_agent
