const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ClipResult {
  scene_id: string;
  episode_id: string;
  episode_title?: string;
  start_time: number;
  end_time: number;
  duration: number;
  clip_url: string;
  thumbnail_url: string;
  score: number;
  narrative_summary: string;
  communicative_themes: string[];
  parent_trigger_phrases: string[];
  child_situations: string[];
  emotional_tone: string;
  energy_level: string;
  key_dialogue: string[];
  characters_present: string[];
  setting: string;
  activity_tags: string[];
  visual_description: string;
  scene_type: string;
  transcript: string;
}

export interface SearchGroup {
  sub_query: string;
  results: ClipResult[];
}

export interface SearchResponse {
  query: string;
  groups: SearchGroup[];
}

export async function searchClips(
  query: string,
  topK: number = 5
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, top_k: String(topK) });
  const res = await fetch(`${API_BASE}/search?${params}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function getClipMetadata(
  sceneId: string
): Promise<ClipResult> {
  const res = await fetch(`${API_BASE}/clips/${sceneId}`);
  if (!res.ok) throw new Error(`Clip not found: ${res.status}`);
  return res.json();
}

export function getVideoUrl(sceneId: string): string {
  return `${API_BASE}/clips/${sceneId}/video`;
}

export function getThumbnailUrl(sceneId: string): string {
  return `${API_BASE}/clips/${sceneId}/thumbnail`;
}
