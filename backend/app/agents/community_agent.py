from __future__ import annotations

import json
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from typing import Optional

from app.models.schemas import CommunityResponse, FactItem, LocationContext, ResponseMeta, SourceItem
from app.services.dataset_service import get_landmark_by_name, get_unified_places
from app.services.gemini_client import get_gemini_client


COMMUNITY_PROFILES_PATH = Path(__file__).resolve().parent.parent / "data" / "community_profiles.json"


def _load_community_profiles() -> dict:
    with open(COMMUNITY_PROFILES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _normalize_community_profile(community_profile: Optional[dict], landmark_name: str) -> dict:
    profile = community_profile or {}
    return {
        "area_name": profile.get("area_name") or landmark_name,
        "accessibility": profile.get("accessibility") or profile.get("environmental_context") or [],
        "mom_and_pop_shops": profile.get("mom_and_pop_shops") or profile.get("local_businesses") or [],
        "community_note": profile.get("community_note") or profile.get("community_summary") or "Limited community profile data is available for this location.",
        "resources": profile.get("resources") or profile.get("nearby_resources") or [],
        "transit_access": profile.get("transit_access", []),
        "inequity_signals": profile.get("inequity_signals") or profile.get("helpful_actions") or [],
    }


class CommunityAgent:
    def __init__(self) -> None:
        self.gemini_client = get_gemini_client()
        self.community_profiles = _load_community_profiles()
        self.unified_places = get_unified_places()

    def run(
        self,
        landmark_name: str,
        location_context: Optional[LocationContext],
        session_id: Optional[str] = None,
        landmark_confidence: float = 0.0,
    ) -> CommunityResponse:
        community_profile = self.community_profiles.get(landmark_name)
        if not community_profile and location_context:
            landmark = get_landmark_by_name(landmark_name) or {}
            profile_id = location_context.profile_id or landmark.get("profile_id")
            if profile_id:
                community_profile = self._get_community_profile_by_id(profile_id)

        community_profile = _normalize_community_profile(community_profile, landmark_name)
        nearby_context = self._build_nearby_place_context(landmark_name)
        community_profile = self._merge_nearby_context(community_profile, nearby_context)

        try:
            summary = self.gemini_client.generate_community_summary(
                landmark_name=landmark_name,
                community_profile=community_profile,
            )
            source_kind = "vertex_ai"
        except Exception:
            summary = self._fallback_summary(landmark_name, community_profile)
            source_kind = "derived"

        highlights = self._build_highlights(community_profile)
        resources = community_profile.get("resources", [])
        accessibility = community_profile.get("accessibility", [])
        local_businesses = community_profile.get("mom_and_pop_shops", [])
        transit_access = community_profile.get("transit_access", [])
        inequity_signals = community_profile.get("inequity_signals", [])
        if not local_businesses:
            local_businesses = self._infer_local_businesses(
                landmark_name=landmark_name,
                neighborhood=location_context.neighborhood if location_context else None,
                borough=location_context.borough if location_context else None,
            )
        community_impact = self._build_community_impact(
            landmark_name=landmark_name,
            community_profile=community_profile,
            location_context=location_context,
        )
        local_tourist_dynamic = self._build_local_tourist_dynamic(
            landmark_name=landmark_name,
            community_profile=community_profile,
            location_context=location_context,
        )
        data_signals = self._build_data_signals(
            community_profile=community_profile,
            location_context=location_context,
        )

        return CommunityResponse(
            title="Community Lens",
            landmark_name=landmark_name,
            summary=summary.strip(),
            highlights=highlights,
            resources=resources,
            accessibility=accessibility,
            local_businesses=local_businesses,
            transit_access=transit_access,
            inequity_signals=inequity_signals,
            community_impact=community_impact,
            local_tourist_dynamic=local_tourist_dynamic,
            data_signals=data_signals,
            meta=ResponseMeta(
                session_id=session_id,
                mode="community",
                agent="community_agent",
                landmark_confidence=landmark_confidence,
                borough=location_context.borough if location_context else None,
                neighborhood=location_context.neighborhood if location_context else None,
                multimodal_ready=False,
                civic_focus=True,
                used_fallback=(source_kind == "derived"),
            ),
            sources=[
                SourceItem(label="Community profile dataset", kind="json"),
                SourceItem(label="Unified places dataset", kind="dataset"),
                SourceItem(
                    label="Gemini (Vertex AI)" if source_kind == "vertex_ai" else "Local fallback synthesis",
                    kind=source_kind,
                ),
            ],
        )

    @staticmethod
    def _haversine(lat1, lon1, lat2, lon2):
        if None in [lat1, lon1, lat2, lon2]:
            return float("inf")
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        return 6371 * c

    def _build_nearby_place_context(self, landmark_name: str) -> dict:
        landmark_data = get_landmark_by_name(landmark_name) or {}
        lat = landmark_data.get("lat")
        lng = landmark_data.get("lng")

        if lat is None or lng is None:
            return {
                "resources": [],
                "accessibility": [],
                "transit_access": [],
                "helpful_actions": [],
            }

        nearby = []
        for place in self.unified_places:
            distance = self._haversine(lat, lng, place.get("lat"), place.get("lng"))
            if distance <= 1.0:
                nearby.append((distance, place))

        nearby.sort(key=lambda item: item[0])
        top_nearby = [item for _, item in nearby[:8]]

        resources: list[str] = []
        accessibility: list[str] = []
        transit_access: list[str] = []

        for item in top_nearby:
            subtype = str(item.get("subtype") or "").lower()
            name = item.get("name")
            if not name:
                continue

            resources.append(f"{name} nearby")

            if subtype == "park":
                accessibility.append("Nearby green/open public space is available.")

            if any(keyword in subtype for keyword in ["station", "terminal", "transit", "subway", "ferry"]):
                transit_access.append(f"{name} supports nearby transit access.")

        helpful_actions = [
            "Explore nearby public spaces",
            "Find nearby civic places",
            "Learn more about this landmark",
        ]

        return {
            "resources": list(dict.fromkeys(resources))[:5],
            "accessibility": list(dict.fromkeys(accessibility))[:3],
            "transit_access": list(dict.fromkeys(transit_access))[:3],
            "helpful_actions": helpful_actions,
        }

    @staticmethod
    def _merge_nearby_context(community_profile: dict, nearby_context: dict) -> dict:
        merged = dict(community_profile)

        if not merged.get("resources"):
            merged["resources"] = nearby_context.get("resources", [])
        elif nearby_context.get("resources"):
            merged["resources"] = list(dict.fromkeys([*merged["resources"], *nearby_context["resources"]]))[:5]

        if not merged.get("accessibility"):
            merged["accessibility"] = nearby_context.get("accessibility", [])
        elif nearby_context.get("accessibility"):
            merged["accessibility"] = list(
                dict.fromkeys([*merged["accessibility"], *nearby_context["accessibility"]])
            )[:3]

        if not merged.get("transit_access"):
            merged["transit_access"] = nearby_context.get("transit_access", [])
        elif nearby_context.get("transit_access"):
            merged["transit_access"] = list(
                dict.fromkeys([*merged["transit_access"], *nearby_context["transit_access"]])
            )[:5]

        if not merged.get("inequity_signals"):
            merged["inequity_signals"] = nearby_context.get("helpful_actions", [])

        if (
            merged.get("community_note") == "Limited community profile data is available for this location."
            and nearby_context.get("resources")
        ):
            merged["community_note"] = (
                "This landmark connects to public life through nearby places and public-interest resources."
            )

        return merged

    @staticmethod
    def _build_highlights(community_profile: dict) -> list[str]:
        highlights: list[str] = []

        accessibility = community_profile.get("accessibility", [])
        mom_and_pop = community_profile.get("mom_and_pop_shops", [])
        community_note = community_profile.get("community_note")
        inequity_signals = community_profile.get("inequity_signals", [])
        transit_access = community_profile.get("transit_access", [])

        if accessibility:
            highlights.append(f"Accessibility: {', '.join(accessibility[:2])}")

        if transit_access:
            highlights.append(f"Transit: {', '.join(transit_access[:2])}")

        if mom_and_pop:
            highlights.append(f"Local businesses: {', '.join(mom_and_pop[:2])}")

        if inequity_signals:
            highlights.append(f"Equity lens: {inequity_signals[0]}")

        if community_note:
            highlights.append(community_note)

        return highlights

    @staticmethod
    def _infer_local_businesses(landmark_name: str, neighborhood: Optional[str], borough: Optional[str]) -> list[str]:
        place_key = (neighborhood or borough or landmark_name).lower()
        if "dumbo" in place_key:
            return [
                "PowerHouse Books",
                "Butler Cafe",
                "Time Out Market",
                "Empire Stores",
            ]
        if "brooklyn" in place_key:
            return [
                "Neighborhood coffee spot",
                "Independent bookstore",
                "Waterfront food hall",
            ]
        if "manhattan" in place_key:
            return [
                "Corner cafe",
                "Family-run deli",
                "Independent gallery shop",
            ]
        return [
            "Neighborhood coffee shop",
            "Independent bookstore",
            "Local market",
        ]

    def _build_community_impact(
        self,
        landmark_name: str,
        community_profile: dict,
        location_context: Optional[LocationContext],
    ) -> list[str]:
        impacts: list[str] = []
        neighborhood = location_context.neighborhood if location_context else None
        accessibility = community_profile.get("accessibility", [])
        transit_access = community_profile.get("transit_access", [])
        resources = community_profile.get("resources", [])
        inequity_signals = community_profile.get("inequity_signals", [])

        if transit_access:
            impacts.append("Strong transit access supports daily local use and steady foot traffic.")
        if resources:
            impacts.append("Public spaces nearby help the landmark function as part of neighborhood life, not just as a destination.")
        if accessibility:
            impacts.append("Walkable connections make the area easier to use for residents, visitors, and civic activity.")
        if inequity_signals:
            impacts.append(inequity_signals[0])

        if not impacts:
            area = neighborhood or "the surrounding neighborhood"
            impacts = [
                f"{landmark_name} shapes how people move through {area} and what they notice about the area.",
                "Visible public space can attract activity while also increasing pressure on local infrastructure.",
            ]

        return list(dict.fromkeys(impacts))[:4]

    def _build_local_tourist_dynamic(
        self,
        landmark_name: str,
        community_profile: dict,
        location_context: Optional[LocationContext],
    ) -> list[str]:
        neighborhood = location_context.neighborhood if location_context else None
        resources = community_profile.get("resources", [])
        transit_access = community_profile.get("transit_access", [])

        dynamics: list[str] = []
        if transit_access:
            dynamics.append("Residents may rely on the area for movement and access, while visitors often approach it as a destination experience.")
        if resources:
            dynamics.append("Peak use can feel different for locals using nearby public space versus tourists seeking landmark views.")
        if not dynamics:
            area = neighborhood or "this area"
            dynamics.append(f"Locals often move through {area} with purpose, while visitors tend to linger and photograph the landmark.")
        if "bridge" in landmark_name.lower():
            dynamics.append("Commuters may treat the route as infrastructure, while tourists experience it as an event.")

        return list(dict.fromkeys(dynamics))[:2]

    def _build_data_signals(
        self,
        community_profile: dict,
        location_context: Optional[LocationContext],
    ) -> list[FactItem]:
        resources = community_profile.get("resources", [])
        transit_access = community_profile.get("transit_access", [])
        accessibility = community_profile.get("accessibility", [])
        inequity_signals = community_profile.get("inequity_signals", [])
        neighborhood = location_context.neighborhood if location_context else None

        foot_traffic = "High" if transit_access or resources else "Moderate"
        walkability = "Excellent" if accessibility else "Moderate"
        tourist_density = "High" if resources or (neighborhood and neighborhood.upper() == "DUMBO") else "Moderate"
        civic_pressure = "Elevated" if inequity_signals else "Moderate"

        return [
            FactItem(label="Foot traffic", value=foot_traffic),
            FactItem(label="Walkability", value=walkability),
            FactItem(label="Tourist density", value=tourist_density),
            FactItem(label="Civic pressure", value=civic_pressure),
        ]

    def _get_community_profile_by_id(self, profile_id: str) -> Optional[dict]:
        if isinstance(self.community_profiles, list):
            for item in self.community_profiles:
                if item.get("profile_id") == profile_id:
                    return item

        if isinstance(self.community_profiles, dict):
            for item in self.community_profiles.values():
                if isinstance(item, dict) and item.get("profile_id") == profile_id:
                    return item

        return None

    @staticmethod
    def _fallback_summary(landmark_name: str, community_profile: dict) -> str:
        area_name = community_profile.get("area_name", "the surrounding neighborhood")
        accessibility = ", ".join(community_profile.get("accessibility", [])[:2])
        businesses = ", ".join(community_profile.get("mom_and_pop_shops", [])[:2])
        transit = ", ".join(community_profile.get("transit_access", [])[:2])
        inequity = ", ".join(community_profile.get("inequity_signals", [])[:2])
        community_note = community_profile.get(
            "community_note",
            "This place matters because it connects people to local identity and neighborhood life.",
        )

        parts = [
            f"{landmark_name} sits within {area_name}, so the experience of the landmark is tied to the surrounding community.",
            community_note,
        ]
        if transit:
            parts.append(f"Transit access around the site includes {transit}.")
        if accessibility:
            parts.append(f"Nearby accessibility strengths include {accessibility}.")
        if businesses:
            parts.append(f"Local business presence includes {businesses}.")
        if inequity:
            parts.append(f"A civic equity lens suggests {inequity}.")
        return " ".join(parts)


_community_agent: Optional[CommunityAgent] = None


def get_community_agent() -> CommunityAgent:
    global _community_agent
    if _community_agent is None:
        _community_agent = CommunityAgent()
    return _community_agent
