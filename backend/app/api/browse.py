"""Browse endpoint — groups clips into categories by activity_tags."""

from collections import Counter

from fastapi import APIRouter, Query, Response

from app.core.search_engine import media_urls, search_engine

router = APIRouter()

# Server-side response cache — invalidated on hide/unhide
_browse_cache: dict[tuple, dict] = {}
_cache_version: int = 0


def invalidate_browse_cache() -> None:
    """Clear browse cache. Call when clips are hidden/unhidden."""
    global _cache_version
    _cache_version += 1
    _browse_cache.clear()

# Map raw tags to display-friendly category names
TAG_DISPLAY_NAMES: dict[str, str] = {
    "shopping": "Shopping & Errands",
    "adventure": "Adventure",
    "problem-solving": "Problem Solving",
    "dinosaurs": "Dinosaurs",
    "family": "Family Time",
    "animals": "Animals",
    "helping": "Helping Others",
    "celebration": "Celebrations",
    "phone call": "Phone Calls",
    "exploration": "Exploration",
    "gift-giving": "Gift Giving",
    "family outing": "Family Outings",
    "learning": "Learning",
    "imaginative play": "Imaginative Play",
    "transportation": "Getting Around",
    "emergency": "Emergencies",
    "group activity": "Group Activities",
    "excitement": "Excitement",
    "discovery": "Discovery",
    "dinosaur park": "Dinosaur Park",
}

# Tags that are not useful for browsing
TAG_BLOCKLIST: set[str] = {
    "closing credits",
    "end of episode",
    "transition",
    "opening sequence",
    "intro",
    "credits",
    "episode ending",
    "narrator",
    "episode intro",
}


def _get_display_name(tag: str) -> str:
    if tag in TAG_DISPLAY_NAMES:
        return TAG_DISPLAY_NAMES[tag]
    return tag.replace("-", " ").replace("_", " ").title()


def _season_from_episode_id(episode_id: str) -> int:
    """Extract season number from episode_id like 's01e01' -> 1."""
    return int(episode_id[1:3])


def serialize_browse_clip(scene: dict) -> dict:
    """Shared clip serialization used by browse and clips endpoints."""
    clip_url, thumbnail_url = media_urls(scene["scene_id"])
    return {
        "scene_id": scene["scene_id"],
        "episode_id": scene.get("episode_id", ""),
        "thumbnail_url": thumbnail_url,
        "clip_url": clip_url,
        "label": (scene.get("parent_trigger_phrases") or [""])[0],
        "duration": scene.get("duration", 0),
        "emotional_tone": scene.get("emotional_tone", ""),
        "energy_level": scene.get("energy_level", ""),
        "narrative_summary": scene.get("narrative_summary", ""),
        "characters_present": scene.get("characters_present", []),
        "key_dialogue": scene.get("key_dialogue", []),
        "child_situations": scene.get("child_situations", []),
        "parent_trigger_phrases": scene.get("parent_trigger_phrases", []),
    }


@router.get("/browse")
def browse_categories(
    response: Response,
    max_categories: int = 12,
    clips_per_category: int = 50,
    seasons: list[int] | None = Query(default=None),
    tags: list[str] | None = Query(default=None),
) -> dict:
    response.headers["Cache-Control"] = "public, max-age=300, stale-while-revalidate=3600"
    if not search_engine.scenes:
        return {
            "categories": [],
            "filtered_clips_count": 0,
            "total_clips_count": 0,
            "available_seasons": [],
            "available_tags": [],
        }

    season_set = set(seasons) if seasons else None
    tag_set = set(tags) if tags else None

    # Check response cache
    cache_key = (
        tuple(sorted(seasons)) if seasons else (),
        tuple(sorted(tags)) if tags else (),
        max_categories,
        clips_per_category,
        _cache_version,
    )
    if cache_key in _browse_cache:
        return _browse_cache[cache_key]

    # Count tag frequency across filtered scenes + collect seasons in one pass
    tag_counter: Counter[str] = Counter()
    tag_to_scenes: dict[str, list[int]] = {}
    season_counts: Counter[int] = Counter()
    filtered_count = 0
    total_count = 0

    for i, scene in enumerate(search_engine.scenes):
        if scene["scene_id"] in search_engine.hidden_ids:
            continue
        total_count += 1

        episode_id = scene.get("episode_id", "")
        season = _season_from_episode_id(episode_id)
        season_counts[season] += 1

        if season_set and season not in season_set:
            continue

        scene_tags = scene.get("activity_tags", [])
        if tag_set and not tag_set.intersection(scene_tags):
            continue

        filtered_count += 1
        for tag in scene_tags:
            if tag in TAG_BLOCKLIST:
                continue
            tag_counter[tag] += 1
            tag_to_scenes.setdefault(tag, []).append(i)

    # Build categories from most common tags
    categories = []
    for tag, count in tag_counter.most_common(max_categories):
        scene_indices = tag_to_scenes[tag]
        clips = [
            serialize_browse_clip(search_engine.scenes[idx])
            for idx in scene_indices[:clips_per_category]
        ]
        categories.append({
            "name": _get_display_name(tag),
            "tag": tag,
            "count": count,
            "clips": clips,
        })

    available_seasons = sorted(season_counts.keys())

    # Available tags reflect current season filter (dynamic counts)
    available_tags = [
        {"tag": tag, "label": _get_display_name(tag), "count": count}
        for tag, count in tag_counter.most_common(20)
    ]

    result = {
        "categories": categories,
        "filtered_clips_count": filtered_count,
        "total_clips_count": total_count,
        "available_seasons": available_seasons,
        "available_tags": available_tags,
    }
    _browse_cache[cache_key] = result
    return result
