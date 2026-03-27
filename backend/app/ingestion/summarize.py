"""Semantic summarization using Claude multimodal API.

Generates structured scene metadata optimized for parent→child
communication retrieval, including parent trigger phrases.
"""

import base64
import json
import random
import subprocess
import tempfile
import time
from pathlib import Path

import anthropic

from app.core.config import settings

MAX_RETRIES = 5
BACKOFF_BASE = 3.0
# Minimum seconds between API calls (shared across scenes within one worker).
# With 3 workers, this means ~1 call/sec globally, staying under 50k tokens/min.
API_CALL_INTERVAL = 3.0
RETRYABLE_ERRORS = (
    anthropic.RateLimitError,
    anthropic.APIStatusError,
    anthropic.APIConnectionError,
    anthropic.APITimeoutError,
)

# Track last API call time per-process for rate limiting
_last_api_call: float = 0.0

SYSTEM_PROMPT = """\
You are an expert in child development and Augmentative and Alternative Communication (AAC). \
You are analyzing clips from Peppa Pig, a children's TV show, to help a parent communicate \
with their child who uses Gestalt Language Processing.

For each scene, you must determine what a parent could communicate to their child by playing \
this clip. Think about the situations where a parent would reach for this clip.

Output ONLY valid JSON matching the schema below. No markdown, no explanation.

Schema:
{
  "narrative_summary": "1-2 sentence description of what happens in the scene",
  "communicative_themes": ["list of parenting/communication concepts this maps to"],
  "parent_trigger_phrases": ["5-10 natural phrases a parent might say that this clip communicates"],
  "child_situations": ["2-5 contexts when this clip would be useful"],
  "emotional_tone": "comma-separated emotional descriptors",
  "energy_level": "low | medium | high",
  "key_dialogue": ["important spoken lines from the scene"],
  "characters_present": ["character names visible or speaking"],
  "setting": "brief location description",
  "activity_tags": ["3-8 activity/topic tags"],
  "visual_description": "1 sentence describing the visual scene"
}

Examples:

Scene: Peppa and George brushing teeth before bed, Mummy Pig helping.
Transcript: "Time to brush your teeth, Peppa. Open wide! Good girl."
{
  "narrative_summary": "Mummy Pig helps Peppa and George brush their teeth as part of the bedtime routine.",
  "communicative_themes": ["hygiene routine", "bedtime preparation", "following instructions"],
  "parent_trigger_phrases": ["time to brush your teeth", "let's brush teeth", "open wide", "we need to brush before bed", "it's toothbrush time", "show me your teeth"],
  "child_situations": ["child resisting teeth brushing", "starting bedtime routine", "teaching dental hygiene"],
  "emotional_tone": "gentle, encouraging, routine",
  "energy_level": "low",
  "key_dialogue": ["Time to brush your teeth, Peppa", "Open wide", "Good girl"],
  "characters_present": ["Peppa", "George", "Mummy Pig"],
  "setting": "bathroom",
  "activity_tags": ["teeth brushing", "hygiene", "bedtime", "routine", "bathroom"],
  "visual_description": "Bathroom scene with Peppa and George at the sink with toothbrushes"
}

Scene: Everyone jumping in muddy puddles, laughing.
Transcript: "I love jumping in muddy puddles! Everyone loves jumping in muddy puddles!"
{
  "narrative_summary": "Peppa and her family joyfully jump in muddy puddles together after it rains.",
  "communicative_themes": ["outdoor play", "family fun", "sensory play", "joy"],
  "parent_trigger_phrases": ["let's go play outside", "want to jump in puddles", "let's go to the park", "time to play", "let's have fun outside", "it's raining, let's play"],
  "child_situations": ["encouraging outdoor play", "rainy day activity", "family activity time", "child needs physical activity"],
  "emotional_tone": "joyful, energetic, playful",
  "energy_level": "high",
  "key_dialogue": ["I love jumping in muddy puddles", "Everyone loves jumping in muddy puddles"],
  "characters_present": ["Peppa", "George", "Mummy Pig", "Daddy Pig"],
  "setting": "garden, outdoors",
  "activity_tags": ["muddy puddles", "outdoor play", "jumping", "rain", "family", "exercise"],
  "visual_description": "Outdoor garden scene with the whole family jumping in mud puddles in their boots"
}\
"""


def extract_frames(
    video_path: Path,
    start_time: float,
    end_time: float,
    num_frames: int = 3,
) -> list[str]:
    """Extract frames from video and return as base64-encoded JPEGs."""
    duration = end_time - start_time
    frames = []

    for i in range(num_frames):
        if num_frames == 1:
            t = start_time + duration / 2
        else:
            t = start_time + (duration * i / (num_frames - 1))

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=True) as tmp:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-ss", str(t), "-i", str(video_path),
                    "-vframes", "1", "-q:v", "2",
                    "-vf", f"scale={settings.clip_resolution}",
                    tmp.name,
                ],
                capture_output=True,
            )
            if Path(tmp.name).stat().st_size > 0:
                with open(tmp.name, "rb") as f:
                    frames.append(base64.standard_b64encode(f.read()).decode())

    return frames


def summarize_scene(
    video_path: Path,
    scene: dict,
    episode_title: str = "",
) -> dict:
    """Generate structured summary for a single scene using Claude."""
    scene_id = scene["scene_id"]

    # Check if already summarized
    summary_path = settings.summaries_dir / f"{scene['episode_id']}" / f"{scene_id}.json"
    if summary_path.exists():
        with open(summary_path) as f:
            return json.load(f)

    # Extract frames
    frames = extract_frames(
        video_path,
        scene["start_time"],
        scene["end_time"],
        num_frames=settings.frames_per_scene,
    )

    # Build message content
    content: list[dict] = []

    # Add frames as images
    for frame_b64 in frames:
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": frame_b64,
            },
        })

    # Add text context
    transcript_text = scene.get("transcript_text", "")
    text = f"Episode: {episode_title}\n"
    text += f"Scene type: {scene.get('scene_type', 'narrative')}\n"
    text += f"Duration: {scene.get('duration', 0):.1f} seconds\n"
    text += f"Transcript: {transcript_text}\n\n"
    text += "Analyze this scene and output the JSON summary."
    content.append({"type": "text", "text": text})

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Rate limit: wait if we called the API too recently
    global _last_api_call
    elapsed = time.monotonic() - _last_api_call
    if elapsed < API_CALL_INTERVAL:
        time.sleep(API_CALL_INTERVAL - elapsed)

    for attempt in range(MAX_RETRIES):
        try:
            _last_api_call = time.monotonic()
            response = client.messages.create(
                model=settings.claude_model,
                max_tokens=1024,
                temperature=settings.summarize_temperature,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": content}],
            )
            break
        except RETRYABLE_ERRORS as e:
            if attempt == MAX_RETRIES - 1:
                raise
            sleep_time = (BACKOFF_BASE ** attempt) + random.uniform(0, 1)
            print(f"    API retry {attempt + 1}/{MAX_RETRIES} for {scene_id}: {e}. Waiting {sleep_time:.1f}s...")
            time.sleep(sleep_time)

    response_text = response.content[0].text.strip()
    # Strip markdown code fences if present
    if response_text.startswith("```"):
        response_text = response_text.split("\n", 1)[1]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

    summary = json.loads(response_text)

    # Save individual summary
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    return summary


def summarize_episode(
    video_path: Path,
    episode_id: str,
    episode_title: str,
    scenes: list[dict],
) -> list[dict]:
    """Summarize all scenes in an episode."""
    output_path = settings.summaries_dir / f"{episode_id}.json"
    if output_path.exists():
        with open(output_path) as f:
            return json.load(f)

    summaries = []
    for scene in scenes:
        if scene.get("scene_type") == "opening":
            # Skip opening theme — not useful for communication
            summaries.append(None)
            continue

        summary = summarize_scene(video_path, scene, episode_title)
        summaries.append(summary)

    settings.summaries_dir.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(summaries, f, indent=2)

    return summaries
