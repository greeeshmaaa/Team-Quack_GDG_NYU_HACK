from __future__ import annotations

from typing import Optional

from app.models.schemas import ComicPanelImage, ComicStripRequest, ComicStripResponse
from app.services.gemini_client import get_gemini_client


class ComicStripAgent:
    def __init__(self) -> None:
        self.gemini_client = get_gemini_client()

    def run(self, request: ComicStripRequest) -> ComicStripResponse:
        location_line = ", ".join(
            part for part in [request.neighborhood, request.borough, "New York City"] if part
        )
        panel_specs = [
            ("past", "PAST", request.story.past),
            ("present", "PRESENT", request.story.present),
            ("future", "FUTURE", request.story.future),
        ]
        panels = []
        quota_error: Optional[str] = None

        for era, label, story_text in panel_specs:
            if quota_error:
                panels.append(
                    ComicPanelImage(
                        era=era,
                        label=label,
                        caption=self._build_caption(story_text),
                        prompt=self._build_prompt(
                            era=era,
                            landmark_name=request.landmark_name,
                            story_text=story_text,
                            location_line=location_line,
                        ),
                        image_data_url=None,
                        used_fallback=True,
                        error=quota_error,
                    )
                )
                continue

            panel = self._build_panel(
                era=era,
                label=label,
                landmark_name=request.landmark_name,
                story_text=story_text,
                location_line=location_line,
            )
            panels.append(panel)
            if panel.error and self._is_quota_error(panel.error):
                quota_error = panel.error

        return ComicStripResponse(
            landmark_name=request.landmark_name,
            panels=panels,
        )

    def _build_panel(
        self,
        *,
        era: str,
        label: str,
        landmark_name: str,
        story_text: str,
        location_line: str,
    ) -> ComicPanelImage:
        prompt = self._build_prompt(
            era=era,
            landmark_name=landmark_name,
            story_text=story_text,
            location_line=location_line,
        )

        try:
            image_data_url = self.gemini_client.generate_story_comic_image(prompt)
            return ComicPanelImage(
                era=era,
                label=label,
                caption=self._build_caption(story_text),
                prompt=prompt,
                image_data_url=image_data_url,
                used_fallback=False,
            )
        except Exception as exc:
            return ComicPanelImage(
                era=era,
                label=label,
                caption=self._build_caption(story_text),
                prompt=prompt,
                image_data_url=None,
                used_fallback=True,
                error=str(exc),
            )

    @staticmethod
    def _build_prompt(
        *,
        era: str,
        landmark_name: str,
        story_text: str,
        location_line: str,
    ) -> str:
        era_direction = {
            "past": (
                "Illustrate the landmark in its earlier historical era with period-correct architecture, "
                "workers, residents, transit, clothing, street details, and the feeling of the city being built."
            ),
            "present": (
                "Illustrate the landmark in contemporary New York with the current skyline, pedestrians, transit, "
                "street life, civic energy, and a clear sense of how people experience it today."
            ),
            "future": (
                "Illustrate a hopeful near-future version of the landmark with sustainable transit, resilient public "
                "space, civic innovation, and a plausible futuristic skyline."
            ),
        }[era]

        return (
            f"Create a single-panel comic-book illustration of {landmark_name} in {location_line}. "
            f"{era_direction} Use a graphic novel / cinematic storyboard style with bold ink lines, rich illustrated "
            "detail, dramatic composition, atmospheric lighting, and era-specific design cues. "
            "The landmark must be clearly recognizable and visually dominant in the frame. "
            "Avoid text bubbles, captions, logos, UI overlays, split panels, triptychs, or abstract mood gradients. "
            f"Story direction: {story_text}"
        )

    @staticmethod
    def _build_caption(story_text: str) -> str:
        caption = " ".join(story_text.strip().split())
        if not caption:
            return "A new visual chapter of the city."
        if len(caption) <= 88:
            return caption
        clipped = caption[:85].rstrip()
        if " " in clipped:
            clipped = clipped.rsplit(" ", 1)[0]
        return f"{clipped}..."

    @staticmethod
    def _is_quota_error(error_message: str) -> bool:
        normalized = error_message.lower()
        return "resource_exhausted" in normalized or "quota exceeded" in normalized


_comic_strip_agent: Optional[ComicStripAgent] = None


def get_comic_strip_agent() -> ComicStripAgent:
    global _comic_strip_agent
    if _comic_strip_agent is None:
        _comic_strip_agent = ComicStripAgent()
    return _comic_strip_agent
