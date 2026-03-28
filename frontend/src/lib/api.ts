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

export interface BrowseClip {
  scene_id: string;
  episode_id: string;
  thumbnail_url: string;
  clip_url: string;
  label: string;
  duration: number;
  emotional_tone: string;
  energy_level: string;
  narrative_summary: string;
  characters_present: string[];
  key_dialogue?: string[];
  child_situations?: string[];
  parent_trigger_phrases?: string[];
}

export function isClipResult(clip: ClipResult | BrowseClip): clip is ClipResult {
  return "score" in clip;
}

export interface BrowseCategory {
  name: string;
  tag: string;
  count: number;
  clips: BrowseClip[];
}

export interface AvailableTag {
  tag: string;
  label: string;
  count: number;
}

export interface BrowseResponse {
  categories: BrowseCategory[];
  filtered_clips_count: number;
  total_clips_count: number;
  available_seasons: number[];
  available_tags: AvailableTag[];
}

export async function searchClips(
  query: string,
  topK: number = 12
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, top_k: String(topK) });
  const res = await fetch(`${API_BASE}/search?${params}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function browseCategories(opts?: {
  maxCategories?: number;
  seasons?: number[];
  tags?: string[];
  clipsPerCategory?: number;
}): Promise<BrowseResponse> {
  const params = new URLSearchParams();
  params.set("max_categories", String(opts?.maxCategories ?? 12));
  if (opts?.clipsPerCategory) params.set("clips_per_category", String(opts.clipsPerCategory));
  if (opts?.seasons) {
    for (const s of opts.seasons) params.append("seasons", String(s));
  }
  if (opts?.tags) {
    for (const t of opts.tags) params.append("tags", t);
  }
  const res = await fetch(`${API_BASE}/browse?${params}`);
  if (!res.ok) throw new Error(`Browse failed: ${res.status}`);
  return res.json();
}

export async function getClipMetadata(
  sceneId: string
): Promise<ClipResult> {
  const res = await fetch(`${API_BASE}/clips/${sceneId}`);
  if (!res.ok) throw new Error(`Clip not found: ${res.status}`);
  return res.json();
}

export interface SuggestionsResponse {
  next_in_episode: BrowseClip[];
  related: BrowseClip[];
}

export async function getClipSuggestions(
  sceneId: string
): Promise<SuggestionsResponse> {
  const res = await fetch(`${API_BASE}/clips/${sceneId}/suggestions`);
  if (!res.ok) throw new Error(`Suggestions failed: ${res.status}`);
  return res.json();
}

export function getVideoUrl(sceneId: string): string {
  return `${API_BASE}/clips/${sceneId}/video`;
}

export function getThumbnailUrl(sceneId: string): string {
  return `${API_BASE}/clips/${sceneId}/thumbnail`;
}

export async function hideClip(sceneId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/clips/hide/${sceneId}`, { method: "POST" });
  if (!res.ok) throw new Error(`Hide failed: ${res.status}`);
}

export async function unhideClip(sceneId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/clips/unhide/${sceneId}`, { method: "POST" });
  if (!res.ok) throw new Error(`Unhide failed: ${res.status}`);
}

export interface HiddenClipsResponse {
  clips: BrowseClip[];
  count: number;
}

export async function getHiddenClips(): Promise<HiddenClipsResponse> {
  const res = await fetch(`${API_BASE}/clips/hidden`);
  if (!res.ok) throw new Error(`Hidden clips failed: ${res.status}`);
  return res.json();
}
