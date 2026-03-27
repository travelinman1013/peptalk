"""Browse endpoint — groups clips into categories by activity_tags."""

from collections import Counter

from fastapi import APIRouter

from app.core.search_engine import search_engine

router = APIRouter()

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


def _get_display_name(tag: str) -> str:
    if tag in TAG_DISPLAY_NAMES:
        return TAG_DISPLAY_NAMES[tag]
    return tag.replace("-", " ").replace("_", " ").title()


@router.get("/browse")
def browse_categories(max_categories: int = 12) -> dict:
    if not search_engine.scenes:
        return {"categories": [], "all_clips_count": 0}

    # Count tag frequency across all scenes
    tag_counter: Counter[str] = Counter()
    tag_to_scenes: dict[str, list[int]] = {}

    for i, scene in enumerate(search_engine.scenes):
        if scene["scene_id"] in search_engine.hidden_ids:
            continue
        tags = scene.get("activity_tags", [])
        for tag in tags:
            tag_counter[tag] += 1
            tag_to_scenes.setdefault(tag, []).append(i)

    # Build categories from most common tags
    categories = []
    for tag, count in tag_counter.most_common(max_categories):
        scene_indices = tag_to_scenes[tag]
        clips = []
        for idx in scene_indices:
            scene = search_engine.scenes[idx]
            clips.append({
                "scene_id": scene["scene_id"],
                "episode_id": scene.get("episode_id", ""),
                "thumbnail_url": f"/clips/{scene['scene_id']}/thumbnail",
                "clip_url": f"/clips/{scene['scene_id']}/video",
                "label": (scene.get("parent_trigger_phrases") or [""])[0],
                "duration": scene.get("duration", 0),
                "emotional_tone": scene.get("emotional_tone", ""),
                "energy_level": scene.get("energy_level", ""),
                "narrative_summary": scene.get("narrative_summary", ""),
                "characters_present": scene.get("characters_present", []),
                "key_dialogue": scene.get("key_dialogue", []),
                "child_situations": scene.get("child_situations", []),
                "parent_trigger_phrases": scene.get("parent_trigger_phrases", []),
            })

        categories.append({
            "name": _get_display_name(tag),
            "tag": tag,
            "count": count,
            "clips": clips,
        })

    return {
        "categories": categories,
        "all_clips_count": len(search_engine.scenes) - len(search_engine.hidden_ids),
    }
