from __future__ import annotations

import base64
import binascii
import json
from typing import List, Optional

try:
    from google import genai
    from google.genai.types import Content, GenerateContentConfig, GenerateImagesConfig, Part
except ImportError:  # pragma: no cover - depends on local environment
    genai = None
    Content = None
    GenerateContentConfig = None
    GenerateImagesConfig = None
    Part = None

from app.config import settings


class GeminiClient:
    def __init__(self) -> None:
        self.client = (
            genai.Client(
                vertexai=True,
                project=settings.google_cloud_project,
                location=settings.google_cloud_location,
            )
            if genai is not None and settings.has_real_gcp_project
            else None
        )
        self.model = settings.vertex_model_name
        self.image_model = settings.vertex_image_model_name

        print("=== GeminiClient init ===")
        print("genai imported:", genai is not None)
        print("has_real_gcp_project:", settings.has_real_gcp_project)
        print("google_cloud_project:", settings.google_cloud_project)
        print("google_cloud_location:", settings.google_cloud_location)
        print("vertex_model_name:", self.model)
        print("vertex_image_model_name:", self.image_model)
        print("client configured:", self.client is not None)
        print("=========================")

    def is_configured(self) -> bool:
        return self.client is not None

    @staticmethod
    def _decode_image(image_base64: str) -> bytes:
        if image_base64.startswith("data:image"):
            image_base64 = image_base64.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(image_base64, validate=True)
            print("Decoded image bytes length:", len(image_bytes))
            return image_bytes
        except (ValueError, binascii.Error) as exc:
            print("Failed to decode image_base64")
            raise ValueError("image_base64 must be valid base64-encoded image bytes") from exc

    def _generate_text(self, contents) -> str:
        if self.client is None:
            raise RuntimeError("Gemini client is not configured")

        print("Calling Gemini model:", self.model)

        response = self.client.models.generate_content(
            model=self.model,
            contents=contents,
        )

        text = getattr(response, "text", None)
        print("Raw Gemini response text:", text)

        if not text:
            raise RuntimeError("Gemini returned an empty response")
        return text

    # ----------- IMAGE -> LANDMARK DETECTION -----------

    def detect_landmark(
        self,
        image_base64: str,
        landmark_candidates: List[str],
        landmark_catalog: List[dict],
        user_hint: Optional[str] = None,
    ) -> str:
        if self.client is None:
            raise RuntimeError("Gemini client is not configured")

        print("\n=== detect_landmark (closed list) ===")
        print("Candidate count:", len(landmark_candidates))
        print("Candidates:", landmark_candidates)
        print("User hint:", user_hint)

        image_bytes = self._decode_image(image_base64)
        catalog_lines = []
        for item in landmark_catalog:
            aliases = ", ".join(item.get("aliases", [])[:3]) or "None"
            descriptor = item.get("historical_note") or "No extra note"
            neighborhood = item.get("neighborhood") or "Unknown neighborhood"
            borough = item.get("borough") or "Unknown borough"
            catalog_lines.append(
                f"- {item['name']} | aliases: {aliases} | area: {neighborhood}, {borough} | clue: {descriptor}"
            )
        catalog_text = "\n".join(catalog_lines)

        prompt = f"""
You are an expert NYC landmark identifier for the NYC Lens app.

Analyze the image carefully and identify the NYC landmark shown.
Match it to the closest entry from this known list:
{landmark_candidates}

Use this landmark catalog to disambiguate visually similar places:
{catalog_text}

Consider visible architecture, signage, surroundings, and any user hint.
Pay special attention to:
- bridge shape, suspension cables, arches, skyline alignment, waterfront setting
- towers, spires, crowns, facades, clocks, statues, memorial pools, signage
- parks, plazas, boardwalks, ferries, transit context, and neighborhood clues

Return the single best match from the known list. Do not invent a new landmark name.
If unsure or the image is ambiguous, provide your top 2-3 best guesses.

User hint: {user_hint if user_hint else "None"}

Respond ONLY in this exact format (no extra text):
Landmark: <exact name from list above>
Confidence: <decimal between 0.0 and 1.0>
Alternatives: <comma-separated names from list, or None>
"""

        result = self._generate_text(
            [
                Content(
                    role="user",
                    parts=[
                        Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                        Part.from_text(text=prompt),
                    ],
                )
            ]
        )

        print("Closed-list landmark detection result:", result)
        print("=====================================\n")
        return result

    def detect_landmark_from_image_open(
        self,
        image_base64: str,
        user_hint: Optional[str] = None,
    ) -> dict:
        if self.client is None:
            raise RuntimeError("Gemini client is not configured")

        print("\n=== detect_landmark_from_image_open ===")
        print("User hint:", user_hint)

        image_bytes = self._decode_image(image_base64)
        prompt = f"""
You are a landmark recognition system for an NYC civic camera app.

Look at the image and identify the most likely New York City landmark shown.

Rules:
- If you can identify a landmark, return its most standard landmark name.
- Prefer concise names like:
  - Brooklyn Bridge
  - Grand Central Terminal
  - Apollo Theater
- If unclear, return landmark as null.
- Confidence must be from 0.0 to 1.0.
- Return JSON only.
- Use the user hint only as a soft clue, not as a fact.

User hint: {user_hint if user_hint else "None"}

Return exactly:
{{
  "landmark": "Brooklyn Bridge" or null,
  "confidence": 0.0,
  "reason": "short explanation"
}}
"""

        print("Calling open landmark detection model:", self.model)

        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                Content(
                    role="user",
                    parts=[
                        Part.from_text(text=prompt),
                        Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                    ],
                )
            ],
            config=GenerateContentConfig(
                temperature=0.0,
                response_mime_type="application/json",
            ),
        )

        text = getattr(response, "text", None)
        print("Raw Gemini open landmark response:", text)

        if not text:
            raise RuntimeError("Gemini returned an empty response")

        try:
            parsed = json.loads(text)
            print("Parsed Gemini landmark JSON:", parsed)
            print("=====================================\n")
            return parsed
        except json.JSONDecodeError as exc:
            print("Failed to parse Gemini JSON response")
            print("Response text was:", text)
            raise RuntimeError(f"Gemini returned non-JSON landmark response: {text}") from exc

    # ----------- STORY MODE COMIC IMAGES -----------

    def generate_story_comic_image(self, prompt: str) -> str:
        if self.client is None or GenerateImagesConfig is None:
            raise RuntimeError("Gemini image generation client is not configured")

        print("\n=== generate_story_comic_image ===")
        print("Calling image model:", self.image_model)
        print("Prompt:", prompt)

        response = self.client.models.generate_images(
            model=self.image_model,
            prompt=prompt,
            config=GenerateImagesConfig(
                numberOfImages=1,
                aspectRatio="3:4",
                outputMimeType="image/jpeg",
                enhancePrompt=True,
            ),
        )

        generated_images = getattr(response, "generated_images", None) or []
        if not generated_images:
            raise RuntimeError("Image generation returned no images")

        image = getattr(generated_images[0], "image", None)
        image_bytes = getattr(image, "image_bytes", None)
        mime_type = getattr(image, "mime_type", None) or "image/jpeg"
        if not image_bytes:
            raise RuntimeError("Generated image payload was empty")

        encoded = base64.b64encode(image_bytes).decode("ascii")
        print("Generated comic image bytes length:", len(image_bytes))
        print("=================================\n")
        return f"data:{mime_type};base64,{encoded}"

    # ----------- ASK MODE -----------

    def generate_ask_response(
        self,
        landmark_name: str,
        context: dict,
        query: str,
    ) -> str:
        prompt = f"""
You are a civic-minded NYC guide for NYC Lens, a camera-first urban awareness app.

Answer the user's question clearly and accurately. Ground your answer in the provided context.
Prioritize facts specific to NYC — history, architecture, civic role, community impact.
Avoid generic tourism fluff. Be direct and informative.

Landmark: {landmark_name}
Civic context: {context}
User question: {query}

Respond in 2-4 sentences. Be specific and factual.
"""

        return self._generate_text(prompt)

    # ----------- STORY MODE -----------

    def generate_story(
        self,
        landmark_name: str,
        context: dict,
    ) -> str:
        prompt = f"""
You are a creative, civic-minded storyteller for NYC Lens — a camera-first urban exploration app.
Your stories are read like narrated guided city experiences, not textbook entries.

Generate a rich multimodal narrative about this NYC landmark. Write in vivid, evocative prose.
Be specific to NYC — name real streets, eras, communities, and feelings. Think of this as
content for a living city museum.

Landmark: {landmark_name}
Context: {context}

Structure your response EXACTLY using these labeled sections (no markdown bold, no bullets):

Past:
[2-3 sentences. Historical origin — what was built, by whom, what it meant in its era.]

Present:
[2-3 sentences. What it is today — who uses it, its current civic or cultural role, what it feels like to be there.]

Future:
[2-3 sentences. What it could become — urban change, community hopes, equity questions, next generation.]

Civic Note:
[1-2 sentences. Ground the story in community, equity, or local identity. Not tourism — think about the people who live here.]
"""

        return self._generate_text(prompt)

    # ----------- COMMUNITY MODE -----------

    def generate_community_summary(
        self,
        landmark_name: str,
        community_profile: dict,
    ) -> str:
        prompt = f"""
You are a civic guide for NYC Lens — a tech-for-good urban awareness app.
Your role is to surface insights that help NYC residents understand their city, not impress tourists.

Write a 3-4 sentence community summary about this NYC place from the perspective of local residents.

Focus on:
- Who actually lives and works near this place
- Accessibility strengths and any known gaps
- Local businesses and community anchors that make the area feel like home
- Any equity considerations, neighborhood pressures, or civic context worth knowing
- What makes this place matter to the people who call it home

Landmark: {landmark_name}
Community data: {community_profile}

Be practical, honest, and community-centered. Avoid generic tourism language.
Speak to a resident, not a visitor.
"""

        return self._generate_text(prompt)


# Singleton (like dataset service)
_gemini_client: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
