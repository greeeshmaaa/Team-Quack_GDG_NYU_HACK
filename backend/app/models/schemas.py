from __future__ import annotations

from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field


ModeType = Literal["ask", "story", "community"]
ResponseModeType = Literal["detect", "ask", "story", "community"]


class AnalyzeRequest(BaseModel):
    mode: ModeType = Field(..., description="Selected app mode")
    image_base64: str = Field(..., description="Captured frame as base64 string")
    query: Optional[str] = Field(
        default=None,
        description="Optional user question, mainly used in ask mode",
    )
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    session_id: Optional[str] = Field(default=None)


class DetectRequest(BaseModel):
    image_base64: str = Field(..., description="Captured frame as base64 string")
    query: Optional[str] = Field(
        default=None,
        description="Optional hint to improve landmark recognition",
    )
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    session_id: Optional[str] = Field(default=None)


class LandmarkCandidate(BaseModel):
    name: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class LandmarkDetectionResult(BaseModel):
    success: bool
    detected_name: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    candidates: List[LandmarkCandidate] = Field(default_factory=list)
    reason: Optional[str] = None
    used_fallback: bool = False


class LocationContext(BaseModel):
    landmark_name: str
    borough: Optional[str] = None
    neighborhood: Optional[str] = None
    profile_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SourceItem(BaseModel):
    label: str
    kind: Literal["json", "vertex_ai", "dataset", "derived"] = "json"
    detail: Optional[str] = None


class ResponseMeta(BaseModel):
    session_id: Optional[str] = None
    mode: ResponseModeType
    agent: str
    landmark_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    borough: Optional[str] = None
    neighborhood: Optional[str] = None
    multimodal_ready: bool = False
    civic_focus: bool = False
    used_fallback: bool = False


class FactItem(BaseModel):
    label: str
    value: str


class StoryPanel(BaseModel):
    kind: Literal["narrative", "context", "narration"]
    title: str
    body: str


class ClarificationResponse(BaseModel):
    type: Literal["clarification"] = "clarification"
    message: str
    options: List[str] = Field(default_factory=list)
    suggested_hint: Optional[str] = None
    meta: ResponseMeta


class LandmarkPreviewResponse(BaseModel):
    type: Literal["detection_preview"] = "detection_preview"
    title: str
    landmark_name: str
    subtitle: str
    overview: str
    meta: ResponseMeta
    sources: List[SourceItem] = Field(default_factory=list)


class AskResponse(BaseModel):
    type: Literal["ask"] = "ask"
    title: str
    answer: str
    landmark_name: str
    facts: List[FactItem] = Field(default_factory=list)
    meta: ResponseMeta
    sources: List[SourceItem] = Field(default_factory=list)


class StoryBlock(BaseModel):
    past: str
    present: str
    future: str


class StoryResponse(BaseModel):
    type: Literal["story"] = "story"
    title: str
    landmark_name: str
    story: StoryBlock
    story_panels: List[StoryPanel] = Field(default_factory=list)
    narration_text: Optional[str] = None
    meta: ResponseMeta
    sources: List[SourceItem] = Field(default_factory=list)


class ComicStripRequest(BaseModel):
    landmark_name: str
    story: StoryBlock
    borough: Optional[str] = None
    neighborhood: Optional[str] = None


class ComicPanelImage(BaseModel):
    era: Literal["past", "present", "future"]
    label: Literal["PAST", "PRESENT", "FUTURE"]
    caption: str
    prompt: str
    image_data_url: Optional[str] = None
    used_fallback: bool = False
    error: Optional[str] = None


class ComicStripResponse(BaseModel):
    type: Literal["comic_strip"] = "comic_strip"
    landmark_name: str
    panels: List[ComicPanelImage] = Field(default_factory=list)


class CommunityResponse(BaseModel):
    type: Literal["community"] = "community"
    title: str
    landmark_name: str
    summary: str
    highlights: List[str] = Field(default_factory=list)
    resources: List[str] = Field(default_factory=list)
    accessibility: List[str] = Field(default_factory=list)
    local_businesses: List[str] = Field(default_factory=list)
    transit_access: List[str] = Field(default_factory=list)
    inequity_signals: List[str] = Field(default_factory=list)
    community_impact: List[str] = Field(default_factory=list)
    local_tourist_dynamic: List[str] = Field(default_factory=list)
    data_signals: List[FactItem] = Field(default_factory=list)
    meta: ResponseMeta
    sources: List[SourceItem] = Field(default_factory=list)


AnalyzeResponse = Union[
    ClarificationResponse,
    AskResponse,
    StoryResponse,
    CommunityResponse,
]


DetectResponse = Union[
    ClarificationResponse,
    LandmarkPreviewResponse,
]
