import { useState } from "react";

const STORAGE_KEY = "pbsmon_show_archived_jobs";

function readStoredValue(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // localStorage unavailable (e.g. private browsing) - fall back to default
    return false;
  }
}

/**
 * "Show archived jobs" toggle on the My Jobs tab, persisted via localStorage.
 */
export function useShowArchivedJobs() {
  const [showArchived, setShowArchivedState] = useState<boolean>(readStoredValue);

  const setShowArchived = (value: boolean) => {
    setShowArchivedState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore write errors (e.g. storage disabled/full)
    }
  };

  return [showArchived, setShowArchived] as const;
}
