import type { ClipResult, BrowseClip } from "@/lib/api";

/**
 * Derives a descriptive label from clip metadata.
 * Prefers the first sentence of narrative_summary over generic trigger phrases.
 */
export function getClipLabel(
  clip: ClipResult | BrowseClip,
  maxLength?: number
): string {
  // Try first sentence of narrative_summary
  const summary = clip.narrative_summary;
  if (summary) {
    const firstSentence = summary.split(". ")[0];
    const label = firstSentence.endsWith(".") ? firstSentence : firstSentence;

    if (maxLength && label.length > maxLength) {
      // Truncate at word boundary
      const truncated = label.slice(0, maxLength).replace(/\s+\S*$/, "");
      return truncated + "\u2026";
    }
    return label;
  }

  // Fallback chain
  if ("parent_trigger_phrases" in clip && clip.parent_trigger_phrases?.[0]) {
    return clip.parent_trigger_phrases[0];
  }
  if ("label" in clip && clip.label) {
    return clip.label;
  }
  return clip.scene_id;
}
