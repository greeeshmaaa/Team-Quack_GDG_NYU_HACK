import { getDemoDetectResponse, getDemoResponse } from "@/lib/demo-data";
import {
  AnalyzeRequest,
  AnalyzeResponse,
  ComicStripRequest,
  ComicStripResponse,
  DetectRequest,
  DetectResponse,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";

export async function analyzePlace(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Analyze request failed with status ${response.status}`);
    }

    return (await response.json()) as AnalyzeResponse;
  } catch {
    return getDemoResponse(payload.mode, payload.query ?? undefined);
  }
}

export async function detectPlace(payload: DetectRequest): Promise<DetectResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/detect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Detect request failed with status ${response.status}`);
    }

    return (await response.json()) as DetectResponse;
  } catch {
    return getDemoDetectResponse(payload.query ?? undefined);
  }
}

export async function generateComicStrip(
  payload: ComicStripRequest,
): Promise<ComicStripResponse> {
  const response = await fetch(`${API_BASE_URL}/story/comic-strip`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Comic strip request failed with status ${response.status}`);
  }

  return (await response.json()) as ComicStripResponse;
}
