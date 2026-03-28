from __future__ import annotations

from typing import Optional

from app.models.schemas import LocationContext
from app.services.dataset_service import get_landmark_by_name


BOROUGH_LABELS = {
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


class LocationContextAgent:
    @staticmethod
    def _normalize_borough(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        return BOROUGH_LABELS.get(text.upper(), text)

    def resolve(
        self,
        landmark_name: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> Optional[LocationContext]:
        landmark = get_landmark_by_name(landmark_name)
        if not landmark:
            return None

        return LocationContext(
            landmark_name=landmark["name"],
            borough=self._normalize_borough(landmark.get("borough")),
            neighborhood=landmark.get("neighborhood"),
            profile_id=landmark.get("profile_id"),
            latitude=latitude,
            longitude=longitude,
        )


_location_context_agent: Optional[LocationContextAgent] = None


def get_location_context_agent() -> LocationContextAgent:
    global _location_context_agent
    if _location_context_agent is None:
        _location_context_agent = LocationContextAgent()
    return _location_context_agent
