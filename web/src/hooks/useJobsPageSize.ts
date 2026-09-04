import { useState } from "react";

export const JOBS_PAGE_SIZE_OPTIONS = [100, 250, 500, 1000] as const;

const STORAGE_KEY = "pbsmon_jobs_page_size";
const DEFAULT_PAGE_SIZE = 100;

function readStoredPageSize(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    if (JOBS_PAGE_SIZE_OPTIONS.includes(parsed as (typeof JOBS_PAGE_SIZE_OPTIONS)[number])) {
      return parsed;
    }
  } catch {
    // localStorage unavailable (e.g. private browsing) - fall back to default
  }
  return DEFAULT_PAGE_SIZE;
}

/**
 * Job list page size, shared and persisted across all job listings
 * (Jobs page tabs, user/machine/queue job tabs) via localStorage.
 */
export function useJobsPageSize() {
  const [pageSize, setPageSizeState] = useState<number>(readStoredPageSize);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    try {
      localStorage.setItem(STORAGE_KEY, String(size));
    } catch {
      // ignore write errors (e.g. storage disabled/full)
    }
  };

  return [pageSize, setPageSize] as const;
}
