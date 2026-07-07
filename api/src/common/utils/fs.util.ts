import * as fs from 'fs/promises';

/**
 * Returns a file's last-modified time in ms since epoch, or undefined if it
 * cannot be stat'd (e.g. does not exist).
 */
export async function getFileMtime(filePath: string): Promise<number | undefined> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs;
  } catch {
    return undefined;
  }
}
