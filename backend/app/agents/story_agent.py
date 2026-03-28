from __future__ import annotations

import re
from typing import Optional, Tuple

from app.models.schemas import (
    LocationContext,
    ResponseMeta,
    SourceItem,
    StoryBlock,
    StoryPanel,
    StoryResponse,
)
from app.services.dataset_service import get_landmark_by_name
from app.services.gemini_client import get_gemini_client


class StoryAgent:
    def __init__(self) -> None:
        self.gemini_client = get_gemini_client()

    def run(
        self,
        landmark_name: str,
        location_context: Optional[LocationContext],
        session_id: Optional[str] = None,
        landmark_confidence: float = 0.0,
    ) -> StoryResponse:
        landmark_data = get_landmark_by_name(landmark_name)

        context = {
            "landmark": landmark_data,
            "borough": location_context.borough if location_context else None,
            "neighborhood": location_context.neighborhood if location_context else None,
        }

        source_kind = "vertex_ai"
        try:
            story_text = self.gemini_client.generate_story(
                landmark_name=landmark_name,
                context=context,
            )
        except Exception:
            story_text = self._fallback_story(landmark_name, landmark_data, location_context)
            source_kind = "derived"

        story_block, civic_note = self._parse_story_block(story_text)

        narration_text = (
            f"{landmark_name}. "
            f"In the past, {story_block.past} "
            f"Today, {story_block.present} "
            f"In the future, {story_block.future}"
        )
        story_panels = self._build_story_panels(landmark_name, story_block, location_context, civic_note)

        return StoryResponse(
            title=landmark_name,
            landmark_name=landmark_name,
            story=story_block,
            story_panels=story_panels,
            narration_text=narration_text,
            meta=ResponseMeta(
                session_id=session_id,
                mode="story",
                agent="story_agent",
                landmark_confidence=landmark_confidence,
                borough=location_context.borough if location_context else None,
                neighborhood=location_context.neighborhood if location_context else None,
                multimodal_ready=True,
                civic_focus=True,
                used_fallback=(source_kind == "derived"),
            ),
            sources=[
                SourceItem(label="Landmark dataset", kind="json"),
                SourceItem(
                    label="Gemini (Vertex AI)" if source_kind == "vertex_ai" else "Local fallback synthesis",
                    kind=source_kind,
                ),
            ],
        )

    @staticmethod
    def _parse_story_block(story_text: str) -> Tuple[StoryBlock, str]:
        """Parse Gemini story output into a StoryBlock and civic note.

        Handles plain text headers (Past:) and markdown bold (**Past:**).
        Returns a tuple of (StoryBlock, civic_note_text).
        """
        sections: dict[str, str] = {"past": "", "present": "", "future": "", "civic_note": ""}
        current_key: Optional[str] = None

        # Map of normalised header -> section key
        header_map = {
            "past": "past",
            "present": "present",
            "future": "future",
            "civic note": "civic_note",
            "civic_note": "civic_note",
        }

        for raw_line in story_text.splitlines():
            line = raw_line.strip()
            if not line:
                continue

            # Strip markdown bold markers (** or *) before comparing
            clean = re.sub(r"\*+", "", line).strip()
            lower = clean.lower()

            matched_key = None
            matched_remainder = ""
            for header, key in header_map.items():
                if lower.startswith(f"{header}:"):
                    matched_key = key
                    matched_remainder = clean.split(":", 1)[1].strip()
                    break

            if matched_key:
                current_key = matched_key
                sections[current_key] = matched_remainder
                continue

            if current_key:
                sections[current_key] = f"{sections[current_key]} {line}".strip()

        return (
            StoryBlock(
                past=sections["past"] or "This place has a layered history tied to New York City's growth.",
                present=sections["present"] or "Today it remains a meaningful part of the city's identity.",
                future=sections["future"] or "Its meaning will continue to evolve as the city changes.",
            ),
            sections["civic_note"],
        )

    @staticmethod
    def _fallback_story(
        landmark_name: str,
        landmark_data: Optional[dict],
        location_context: Optional[LocationContext],
    ) -> str:
        neighborhood = (
            location_context.neighborhood
            if location_context and location_context.neighborhood
            else "its neighborhood"
        )
        historical_note = (
            landmark_data.get("historical_note")
            if landmark_data and landmark_data.get("historical_note")
            else "It has been part of the city’s evolving story."
        )
        return (
            f"Past: {historical_note}\n"
            f"Present: Today, {landmark_name} helps define the character of {neighborhood} and gives residents and visitors a shared point of reference.\n"
            f"Future: As New York changes, {landmark_name} can remain a bridge between local memory, public space, and civic identity."
        )

    @staticmethod
    def _build_story_panels(
        landmark_name: str,
        story_block: StoryBlock,
        location_context: Optional[LocationContext],
        civic_note: str = "",
    ) -> list[StoryPanel]:
        place = location_context.neighborhood if location_context and location_context.neighborhood else "New York City"
        panels = [
            StoryPanel(kind="narrative", title="Past", body=story_block.past),
            StoryPanel(kind="narrative", title="Present", body=story_block.present),
            StoryPanel(kind="narrative", title="Future", body=story_block.future),
        ]
        # Include civic note panel if Gemini produced one
        if civic_note:
            panels.append(
                StoryPanel(kind="context", title="Civic Note", body=civic_note)
            )
        panels.append(
            StoryPanel(
                kind="context",
                title="Place Context",
                body=(
                    f"{landmark_name} is explored through the lens of {place}, "
                    "connecting civic context with multimodal narrative storytelling."
                ),
            )
        )
        panels.append(
            StoryPanel(
                kind="narration",
                title="Narration Cue",
                body=f"Narrate this as a guided city story: past, present, then future — {landmark_name}.",
            )
        )
        return panels


_story_agent: Optional[StoryAgent] = None


def get_story_agent() -> StoryAgent:
    global _story_agent
    if _story_agent is None:
        _story_agent = StoryAgent()
    return _story_agent
