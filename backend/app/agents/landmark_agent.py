from __future__ import annotations

import re
from difflib import get_close_matches
from math import asin, cos, radians, sin, sqrt
from typing import List, Optional

from app.config import settings
from app.models.schemas import (
    LandmarkCandidate,
    LandmarkDetectionResult,
)
from app.services.dataset_service import (
    get_all_landmark_names,
    get_landmark_by_name,
    get_landmark_context,
)
from app.services.gemini_client import get_gemini_client


class LandmarkAgent:
    def __init__(self) -> None:
        self.gemini_client = get_gemini_client()

    def detect(
        self,
        image_base64: str,
        user_hint: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> LandmarkDetectionResult:
        landmark_context = get_landmark_context()
        error_reason: Optional[str] = None
        guessed_name: Optional[str] = None
        confidence = 0.0

        print("\n=== LandmarkAgent.detect ===")
        print("User hint:", user_hint)
        print("Latitude:", latitude)
        print("Longitude:", longitude)
        print("Dataset landmark count:", len(landmark_context))
        print("Confidence threshold:", settings.landmark_confidence_threshold)

        try:
            gemini_result = self.gemini_client.detect_landmark_from_image_open(
                image_base64=image_base64,
                user_hint=user_hint,
            )
            print("Gemini result payload:", gemini_result)
            guessed_name = gemini_result.get("landmark")
            confidence = self._coerce_confidence(gemini_result.get("confidence"))
        except Exception as exc:
            error_reason = str(exc)
            guessed_name = user_hint
            confidence = (
                max(settings.landmark_confidence_threshold, 0.85)
                if user_hint
                else 0.0
            )
            print("Gemini detection failed:", error_reason)
            print("Fallback guessed_name from user hint:", guessed_name)
            print("Fallback confidence:", confidence)

        print("Guessed landmark name:", guessed_name)
        print("Coerced confidence:", confidence)

        matched_name = self._resolve_landmark_name(guessed_name, landmark_context)
        print("Matched dataset landmark:", matched_name)
        candidate_models: List[LandmarkCandidate] = []

        if matched_name:
            candidate_models.append(
                LandmarkCandidate(name=matched_name, confidence=confidence)
            )

        geo_candidates = self._build_geo_clarification_candidates(
            latitude=latitude,
            longitude=longitude,
            landmark_context=landmark_context,
            exclude_names={matched_name} if matched_name else set(),
        )
        print(
            "Geo clarification candidates:",
            [(candidate.name, candidate.confidence) for candidate in geo_candidates],
        )
        candidate_models.extend(geo_candidates)
        candidate_models = self._dedupe_candidates(candidate_models)
        print(
            "Final candidate list:",
            [(candidate.name, candidate.confidence) for candidate in candidate_models],
        )

        success = matched_name is not None
        print("Detection success before threshold check:", success)
        print(
            "Would clear threshold:",
            success and confidence >= settings.landmark_confidence_threshold,
        )

        if success:
            print("Returning resolved landmark result")
            print("===========================\n")
            return LandmarkDetectionResult(
                success=True,
                detected_name=matched_name,
                confidence=confidence,
                candidates=candidate_models,
                reason=None,
                used_fallback=error_reason is not None,
            )

        print("Returning clarification/fallback landmark result")
        print("Reason:", error_reason or "Could not confidently match landmark to known dataset")
        print("===========================\n")
        return LandmarkDetectionResult(
            success=False,
            detected_name=None,
            confidence=0.4 if candidate_models else 0.0,
            candidates=candidate_models,
            reason=error_reason or "Could not confidently match landmark to known dataset",
            used_fallback=True,
        )

    @staticmethod
    def _coerce_confidence(value: object) -> float:
        try:
            return min(max(float(value or 0.0), 0.0), 1.0)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _normalize_name(name: str) -> str:
        if not name:
            return ""
        normalized = name.lower().strip()
        normalized = re.sub(r"[^a-z0-9\s]", "", normalized)
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized

    def _build_name_index(self, landmark_context: dict) -> dict[str, str]:
        index: dict[str, str] = {}
        for original_name in landmark_context.keys():
            index[self._normalize_name(original_name)] = original_name
        return index

    def _resolve_landmark_name(self, guessed_name: Optional[str], landmark_context: dict) -> Optional[str]:
        if not guessed_name:
            print("No guessed landmark name to resolve")
            return None

        exact = get_landmark_by_name(guessed_name)
        if exact:
            print("Exact dataset match found:", exact["name"])
            return exact["name"]

        normalized_guess = self._normalize_name(guessed_name)
        if not normalized_guess:
            print("Normalized guessed landmark is empty")
            return None

        print("Normalized guessed landmark:", normalized_guess)

        index = self._build_name_index(landmark_context)
        if normalized_guess in index:
            print("Exact normalized match found:", index[normalized_guess])
            return index[normalized_guess]

        matches = get_close_matches(normalized_guess, list(index.keys()), n=3, cutoff=0.60)
        print("Closest fuzzy matches:", matches)
        if matches:
            print("Resolved via fuzzy match:", index[matches[0]])
            return index[matches[0]]

        print("No dataset match found for guessed landmark")
        return None

    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2) -> float:
        if None in [lat1, lon1, lat2, lon2]:
            return float("inf")

        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        return 6371 * c

    def _build_geo_clarification_candidates(
        self,
        latitude: Optional[float],
        longitude: Optional[float],
        landmark_context: dict,
        exclude_names: set[str],
    ) -> List[LandmarkCandidate]:
        if latitude is None or longitude is None:
            return []

        ranked = []
        for landmark_name, landmark_data in landmark_context.items():
            if landmark_name in exclude_names:
                continue
            distance = self._haversine(
                latitude,
                longitude,
                landmark_data.get("lat"),
                landmark_data.get("lng"),
            )
            if distance == float("inf"):
                continue
            ranked.append((distance, landmark_name))

        ranked.sort(key=lambda item: item[0])
        candidates: List[LandmarkCandidate] = []
        confidence_steps = [0.45, 0.35, 0.25]
        for index, (_, landmark_name) in enumerate(ranked[:3]):
            candidates.append(
                LandmarkCandidate(
                    name=landmark_name,
                    confidence=confidence_steps[index],
                )
            )
        return candidates

    @staticmethod
    def _dedupe_candidates(candidates: List[LandmarkCandidate]) -> List[LandmarkCandidate]:
        deduped: List[LandmarkCandidate] = []
        seen: set[str] = set()
        for candidate in candidates:
            key = candidate.name.lower().strip()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(candidate)
        return deduped


_landmark_agent: Optional[LandmarkAgent] = None


def get_landmark_agent() -> LandmarkAgent:
    global _landmark_agent
    if _landmark_agent is None:
        _landmark_agent = LandmarkAgent()
    return _landmark_agent
