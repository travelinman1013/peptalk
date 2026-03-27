import type { ClipResult, BrowseClip } from "@/lib/api";

/**
 * Returns a short trigger phrase (what Sam would say) as the primary title.
 * Falls back to narrative_summary first sentence if no trigger phrase.
 */
export function getClipTitle(clip: ClipResult | BrowseClip): string {
  // Prefer parent_trigger_phrases — these are what Sam would say
  if ("parent_trigger_phrases" in clip && clip.parent_trigger_phrases?.[0]) {
    return clip.parent_trigger_phrases[0];
  }
  if ("label" in clip && clip.label) {
    return clip.label;
  }
  // Fall back to first sentence of narrative_summary
  if (clip.narrative_summary) {
    return clip.narrative_summary.split(". ")[0];
  }
  return clip.scene_id;
}

/**
 * Returns a descriptive subtitle (what happens in the clip) for context.
 * Returns null if it would just duplicate the title.
 */
export function getClipSubtitle(clip: ClipResult | BrowseClip): string | null {
  const title = getClipTitle(clip);
  const summary = clip.narrative_summary;
  if (!summary) return null;

  const firstSentence = summary.split(". ")[0];
  // Don't show subtitle if it's the same as the title
  if (firstSentence === title || firstSentence.startsWith(title)) return null;
  return firstSentence;
}

/**
 * Combined label for contexts where only one line is available (alt text, aria).
 */
export function getClipLabel(
  clip: ClipResult | BrowseClip,
  maxLength?: number
): string {
  const title = getClipTitle(clip);
  if (maxLength && title.length > maxLength) {
    const truncated = title.slice(0, maxLength).replace(/\s+\S*$/, "");
    return truncated + "\u2026";
  }
  return title;
}
