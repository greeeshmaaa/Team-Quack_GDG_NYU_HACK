from __future__ import annotations

from typing import Optional

from app.models.schemas import (
    AskResponse,
    FactItem,
    LocationContext,
    ResponseMeta,
    SourceItem,
)
from app.services.dataset_service import get_landmark_by_name
from app.services.gemini_client import get_gemini_client


class AskAgent:
    def __init__(self) -> None:
        self.gemini_client = get_gemini_client()

    def run(
        self,
        landmark_name: str,
        location_context: Optional[LocationContext],
        query: Optional[str],
        session_id: Optional[str] = None,
        landmark_confidence: float = 0.0,
    ) -> AskResponse:
        # Get structured landmark data
        landmark_data = get_landmark_by_name(landmark_name)

        # Build context for Gemini
        context = {
            "landmark": landmark_data,
            "borough": location_context.borough if location_context else None,
            "neighborhood": location_context.neighborhood if location_context else None,
        }

        # Default question if user didn’t ask one
        if not query:
            query = "What is this place and why is it important?"

        try:
            answer = self.gemini_client.generate_ask_response(
                landmark_name=landmark_name,
                context=context,
                query=query,
            )
            source_kind = "vertex_ai"
        except Exception:
            answer = self._fallback_answer(
                landmark_name=landmark_name,
                landmark_data=landmark_data,
                location_context=location_context,
                query=query,
            )
            source_kind = "derived"

        return AskResponse(
            title=landmark_name,
            landmark_name=landmark_name,
            answer=answer.strip(),
            facts=self._build_facts(landmark_data, location_context),
            meta=ResponseMeta(
                session_id=session_id,
                mode="ask",
                agent="ask_agent",
                landmark_confidence=landmark_confidence,
                borough=location_context.borough if location_context else None,
                neighborhood=location_context.neighborhood if location_context else None,
                multimodal_ready=False,
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
    def _normalize_borough(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        borough_map = {
            "MN": "Manhattan",
            "MAN": "Manhattan",
            "BX": "Bronx",
            "BK": "Brooklyn",
            "K": "Brooklyn",
            "Q": "Queens",
            "QN": "Queens",
            "SI": "Staten Island",
            "R": "Staten Island",
            "1": "Manhattan",
            "2": "Bronx",
            "3": "Brooklyn",
            "4": "Queens",
            "5": "Staten Island",
        }
        return borough_map.get(text.upper(), text)

    @staticmethod
    def _fallback_answer(
        landmark_name: str,
        landmark_data: Optional[dict],
        location_context: Optional[LocationContext],
        query: str,
    ) -> str:
        historical_note = (
            landmark_data.get("historical_note")
            if landmark_data
            else None
        )
        borough = location_context.borough if location_context else "New York City"
        neighborhood = location_context.neighborhood if location_context else None
        place_context = f"{neighborhood}, {borough}" if neighborhood else borough
        lower_query = query.lower()

        if "when" in lower_query or "built" in lower_query or "opened" in lower_query:
            return (
                f"{historical_note or f'{landmark_name} is a known NYC landmark in {place_context}.'} "
                f"It remains significant today as part of the identity of {place_context}."
            )

        if "where" in lower_query or "located" in lower_query:
            return (
                f"{landmark_name} is located in {place_context}. "
                f"It is part of the app’s local NYC landmark dataset."
            )

        if "why" in lower_query or "important" in lower_query:
            return (
                f"{landmark_name} is an important NYC landmark in {place_context}. "
                f"{historical_note or 'It is notable for its role in the city’s history and identity.'}"
            )

        if "tell me more" in lower_query or "more" in lower_query or "about" in lower_query:
            return (
                f"{landmark_name} is a recognized NYC landmark in {place_context}. "
                f"{historical_note or 'It is included in the app’s civic dataset because of its historical and neighborhood significance.'} "
                f"In NYC Lens, it can also be explored through story and community context."
            )

        if "who" in lower_query:
            return (
                f"The local dataset does not currently store creator or architect details for {landmark_name}. "
                f"What it does confirm is that {landmark_name} is an important landmark in {place_context}. "
                f"{historical_note or ''}".strip()
            )

        return (
            f"{landmark_name} is a recognized NYC landmark in {place_context}. "
            f"{historical_note or 'It is included in the app’s local civic dataset.'}"
        )

    @staticmethod
    def _build_facts(
        landmark_data: Optional[dict],
        location_context: Optional[LocationContext],
    ) -> list[FactItem]:
        if not landmark_data:
            return []

        facts: list[FactItem] = []

        borough = (
            location_context.borough
            if location_context and location_context.borough
            else AskAgent._normalize_borough(landmark_data.get("borough"))
        )
        if borough:
            facts.append(FactItem(label="Borough", value=str(borough)))
        if landmark_data.get("neighborhood"):
            facts.append(FactItem(label="Neighborhood", value=str(landmark_data["neighborhood"])))
        if landmark_data.get("historical_note"):
            facts.append(FactItem(label="Why It Matters", value=str(landmark_data["historical_note"])))
        if location_context and location_context.latitude is not None and location_context.longitude is not None:
            facts.append(
                FactItem(
                    label="Viewer Context",
                    value=f"Captured near {location_context.latitude:.4f}, {location_context.longitude:.4f}",
                )
            )

        return facts[:4]


_ask_agent: Optional[AskAgent] = None


def get_ask_agent() -> AskAgent:
    global _ask_agent
    if _ask_agent is None:
        _ask_agent = AskAgent()
    return _ask_agent
