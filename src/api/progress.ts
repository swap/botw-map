import { invoke } from "@tauri-apps/api/core";

export interface CompletionRow {
  markerId: string;
  completedAt: string;
}

const LS_KEY = "botw-map:completed";
const memoryStore = new Set<string>();
let useMemory = false;

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function readLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set(memoryStore);
    const ids = JSON.parse(raw) as string[];
    return new Set(ids);
  } catch {
    return new Set(memoryStore);
  }
}

function writeLocal(ids: Set<string>): void {
  memoryStore.clear();
  for (const id of ids) memoryStore.add(id);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    
  }
}

export async function listCompleted(): Promise<Set<string>> {
  if (!isTauri() || useMemory) {
    return readLocal();
  }
  try {
    const rows = await invoke<CompletionRow[]>("list_completed");
    return new Set(rows.map((r) => r.markerId));
  } catch (err) {
    console.warn("SQLite unavailable, using localStorage progress", err);
    useMemory = true;
    return readLocal();
  }
}

export async function setCompleted(
  markerId: string,
  completed: boolean,
): Promise<void> {
  if (!isTauri() || useMemory) {
    const ids = readLocal();
    if (completed) ids.add(markerId);
    else ids.delete(markerId);
    writeLocal(ids);
    return;
  }
  try {
    await invoke("set_completed", { markerId, completed });
  } catch (err) {
    console.warn("SQLite write failed, falling back to localStorage", err);
    useMemory = true;
    const ids = readLocal();
    if (completed) ids.add(markerId);
    else ids.delete(markerId);
    writeLocal(ids);
  }
}
