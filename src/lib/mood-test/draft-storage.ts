const STORAGE_KEY = "mood-me:test-draft:v1";

export type MoodTestDraft = {
  sessionId: string;
  stepIndex: number;
  updatedAt: string;
};

function isMoodTestDraft(value: unknown): value is MoodTestDraft {
  if (!value || typeof value !== "object") return false;

  return (
    "sessionId" in value &&
    typeof value.sessionId === "string" &&
    value.sessionId.length > 0 &&
    "stepIndex" in value &&
    typeof value.stepIndex === "number" &&
    Number.isInteger(value.stepIndex) &&
    value.stepIndex >= 0 &&
    "updatedAt" in value &&
    typeof value.updatedAt === "string" &&
    value.updatedAt.length > 0
  );
}

export function loadMoodTestDraft() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isMoodTestDraft(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function saveMoodTestDraft(draft: Omit<MoodTestDraft, "updatedAt">) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function clearMoodTestDraft() {
  window.localStorage.removeItem(STORAGE_KEY);
}
