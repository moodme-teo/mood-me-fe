"use client";

import type { MoodboardDraft } from "@/components/canvas";

const DB_NAME = "mood-me";
const DB_VERSION = 1;
const STORE_NAME = "moodboard-drafts";

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB를 사용할 수 없어요."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "moodboardId" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveMoodboardDraft(draft: MoodboardDraft) {
  const db = await openDraftDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(draft);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function loadMoodboardDraft(moodboardId: string) {
  const db = await openDraftDb();
  const draft = await new Promise<MoodboardDraft | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(moodboardId);
    request.onsuccess = () => resolve((request.result as MoodboardDraft) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return draft;
}
