"""Rebuild scenes.json + embeddings.npz from already-processed episodes.

Skips all ingestion steps — just loads cached scenes/summaries and
rebuilds the search database.
"""

from app.ingestion.pipeline import (
    load_state,
    is_episode_complete,
    load_existing_episode,
    build_scenes_db,
)
from app.ingestion.embed import embed_all_episodes

state = load_state()

all_scenes = []
all_summaries = []

for episode_id, ep_state in sorted(state.items()):
    if is_episode_complete(state, episode_id):
        scenes, summaries = load_existing_episode(episode_id)
        all_scenes.extend(scenes)
        all_summaries.extend(summaries)
        print(f"  Loaded {episode_id} ({len(scenes)} scenes)")

print(f"\nBuilding scenes database...")
db_scenes = build_scenes_db(all_scenes, all_summaries)
print(f"  {len(db_scenes)} scenes in database")

print("Generating embeddings...")
embed_all_episodes(all_scenes, all_summaries)
print("  Embeddings saved")

print(f"\nDone! {len(db_scenes)} searchable clips ready.")
