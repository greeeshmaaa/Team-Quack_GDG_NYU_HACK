export type Mode = "ask" | "story" | "community";
export type ResponseMode = "detect" | Mode;

export type SourceItem = {
  label: string;
  kind: "json" | "vertex_ai" | "dataset" | "derived";
  detail?: string | null;
};

export type ResponseMeta = {
  session_id?: string | null;
  mode: ResponseMode;
  agent: string;
  landmark_confidence: number;
  borough?: string | null;
  neighborhood?: string | null;
  multimodal_ready: boolean;
  civic_focus: boolean;
  used_fallback: boolean;
};

export type ClarificationResponse = {
  type: "clarification";
  message: string;
  options: string[];
  suggested_hint?: string | null;
  meta: ResponseMeta;
};

export type LandmarkPreviewResponse = {
  type: "detection_preview";
  title: string;
  landmark_name: string;
  subtitle: string;
  overview: string;
  meta: ResponseMeta;
  sources: SourceItem[];
};

export type FactItem = {
  label: string;
  value: string;
};

export type AskResponse = {
  type: "ask";
  title: string;
  answer: string;
  landmark_name: string;
  facts: FactItem[];
  meta: ResponseMeta;
  sources: SourceItem[];
};

export type StoryBlock = {
  past: string;
  present: string;
  future: string;
};

export type StoryPanel = {
  kind: "narrative" | "context" | "narration";
  title: string;
  body: string;
};

export type StoryResponse = {
  type: "story";
  title: string;
  landmark_name: string;
  story: StoryBlock;
  story_panels: StoryPanel[];
  narration_text?: string | null;
  meta: ResponseMeta;
  sources: SourceItem[];
};

export type ComicEra = "past" | "present" | "future";

export type ComicPanelImage = {
  era: ComicEra;
  label: "PAST" | "PRESENT" | "FUTURE";
  caption: string;
  prompt: string;
  image_data_url?: string | null;
  used_fallback: boolean;
  error?: string | null;
};

export type ComicStripResponse = {
  type: "comic_strip";
  landmark_name: string;
  panels: ComicPanelImage[];
};

export type CommunityResponse = {
  type: "community";
  title: string;
  landmark_name: string;
  summary: string;
  highlights: string[];
  resources: string[];
  accessibility: string[];
  local_businesses: string[];
  transit_access: string[];
  inequity_signals: string[];
  community_impact?: string[];
  local_tourist_dynamic?: string[];
  data_signals?: FactItem[];
  meta: ResponseMeta;
  sources: SourceItem[];
};

export type AnalyzeResponse =
  | ClarificationResponse
  | LandmarkPreviewResponse
  | AskResponse
  | StoryResponse
  | CommunityResponse;

export type DetectResponse = ClarificationResponse | LandmarkPreviewResponse;

export type AnalyzeRequest = {
  mode: Mode;
  image_base64: string;
  query?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  session_id?: string | null;
};

export type DetectRequest = {
  image_base64: string;
  query?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  session_id?: string | null;
};

export type ComicStripRequest = {
  landmark_name: string;
  story: StoryBlock;
  borough?: string | null;
  neighborhood?: string | null;
};
