"use client";

import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import type { ClipResult, BrowseClip } from "@/lib/api";

// --- Types ---

export interface FavoriteRecord extends BrowseClip {
  added_at: number;
}

export interface RecentRecord extends BrowseClip {
  last_used_at: number;
  use_count: number;
}

export interface PlaylistRecord {
  id: string;
  name: string;
  clips: BrowseClip[];
  created_at: number;
  last_used_at: number;
  use_count: number;
}

interface PepTalkDB extends DBSchema {
  favorites: {
    key: string;
    value: FavoriteRecord;
    indexes: { "by-added": number };
  };
  recent: {
    key: string;
    value: RecentRecord;
    indexes: { "by-used": number };
  };
  playlists: {
    key: string;
    value: PlaylistRecord;
    indexes: { "by-used": number };
  };
}

// --- Database singleton ---

let dbPromise: Promise<IDBPDatabase<PepTalkDB>> | null = null;

export function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is not available on the server");
  }
  if (!dbPromise) {
    dbPromise = openDB<PepTalkDB>("peptalk", 1, {
      upgrade(db) {
        const favStore = db.createObjectStore("favorites", {
          keyPath: "scene_id",
        });
        favStore.createIndex("by-added", "added_at");

        const recentStore = db.createObjectStore("recent", {
          keyPath: "scene_id",
        });
        recentStore.createIndex("by-used", "last_used_at");

        const playlistStore = db.createObjectStore("playlists", {
          keyPath: "id",
        });
        playlistStore.createIndex("by-used", "last_used_at");
      },
    });
  }
  return dbPromise;
}

// --- Helpers ---

/** Normalize either clip type to a storable BrowseClip shape */
export function clipToStorable(clip: ClipResult | BrowseClip): BrowseClip {
  return {
    scene_id: clip.scene_id,
    episode_id: clip.episode_id,
    thumbnail_url:
      clip.thumbnail_url || `/clips/${clip.scene_id}/thumbnail`,
    clip_url: clip.clip_url || `/clips/${clip.scene_id}/video`,
    label:
      ("label" in clip ? clip.label : null) ||
      ("parent_trigger_phrases" in clip
        ? clip.parent_trigger_phrases?.[0]
        : "") ||
      "",
    duration: clip.duration,
    emotional_tone: clip.emotional_tone,
    energy_level: clip.energy_level,
    narrative_summary: clip.narrative_summary,
    characters_present: clip.characters_present,
    key_dialogue:
      "key_dialogue" in clip ? clip.key_dialogue : undefined,
    child_situations:
      "child_situations" in clip ? clip.child_situations : undefined,
    parent_trigger_phrases:
      "parent_trigger_phrases" in clip
        ? clip.parent_trigger_phrases
        : undefined,
  };
}

// --- Favorites ---

export async function getAllFavorites(): Promise<FavoriteRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("favorites", "by-added");
  return all.reverse(); // newest first
}

export async function addFavorite(
  clip: ClipResult | BrowseClip
): Promise<void> {
  const db = await getDB();
  const record: FavoriteRecord = {
    ...clipToStorable(clip),
    added_at: Date.now(),
  };
  await db.put("favorites", record);
}

export async function removeFavorite(sceneId: string): Promise<void> {
  const db = await getDB();
  await db.delete("favorites", sceneId);
}

export async function isFavorite(sceneId: string): Promise<boolean> {
  const db = await getDB();
  const record = await db.get("favorites", sceneId);
  return !!record;
}

// --- Recently Used ---

const MAX_RECENT = 50;

export async function getRecentlyUsed(
  limit: number = 20
): Promise<RecentRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("recent", "by-used");
  return all.reverse().slice(0, limit); // newest first
}

export async function recordUsage(
  clip: ClipResult | BrowseClip
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("recent", clip.scene_id);
  const record: RecentRecord = {
    ...clipToStorable(clip),
    last_used_at: Date.now(),
    use_count: existing ? existing.use_count + 1 : 1,
  };
  await db.put("recent", record);

  // Prune old entries
  const all = await db.getAllFromIndex("recent", "by-used");
  if (all.length > MAX_RECENT) {
    const toDelete = all.slice(0, all.length - MAX_RECENT);
    for (const item of toDelete) {
      await db.delete("recent", item.scene_id);
    }
  }
}

// --- Playlists ---

export async function getAllPlaylists(): Promise<PlaylistRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("playlists", "by-used");
  return all.reverse(); // most recently used first
}

export async function savePlaylist(
  name: string,
  clips: (ClipResult | BrowseClip)[]
): Promise<PlaylistRecord> {
  const db = await getDB();

  // Upsert by name — if a playlist with this name exists, update it
  const all = await db.getAll("playlists");
  const existing = all.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );

  const record: PlaylistRecord = {
    id: existing?.id ?? crypto.randomUUID(),
    name,
    clips: clips.map(clipToStorable),
    created_at: existing?.created_at ?? Date.now(),
    last_used_at: Date.now(),
    use_count: existing?.use_count ?? 0,
  };
  await db.put("playlists", record);
  return record;
}

export async function deletePlaylist(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("playlists", id);
}

export async function updatePlaylistUsage(id: string): Promise<void> {
  const db = await getDB();
  const record = await db.get("playlists", id);
  if (record) {
    record.last_used_at = Date.now();
    record.use_count += 1;
    await db.put("playlists", record);
  }
}
