import { IsObject, IsOptional, IsString } from 'class-validator';

export class AccountingConfig {
  @IsOptional()
  @IsString()
  connectionString?: string;

  /**
   * Clusters each user with the statistics role may see statistics of,
   * keyed by username ('*' = all clusters, like admins). A statistics user
   * without an entry has no access.
   */
  @IsObject()
  statisticsUserClusters: Record<string, string[]>;

  /**
   * Organizations (org_names.name) each user with the statistics role may
   * select, keyed by username ('*' = all organizations, like admins).
   * Without an entry they can only use "All organizations".
   */
  @IsObject()
  statisticsUserOrganizations: Record<string, string[]>;
}

/** List item granting all clusters / organizations, e.g. 'alice=*' */
export const STATISTICS_ALL_ITEMS = '*';

/**
 * Splits text at separators not escaped by a backslash. Escapes are kept in
 * the parts, so they can be split further and unescaped at the end.
 */
function splitUnescaped(text: string, separator: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\\' && i + 1 < text.length) {
      current += char + text[i + 1];
      i++;
    } else if (char === separator) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

/** Trims surrounding whitespace and resolves escapes ('\,' -> ',') */
function unescapeName(text: string): string {
  return text.trim().replace(/\\(.)/g, '$1');
}

/**
 * Parses a per-user list setting (STATISTICS_USER_CLUSTERS,
 * STATISTICS_USER_ORGANIZATIONS): entries separated by ';', each
 * 'username=item1,item2', e.g. 'alice=adan,zia;bob=elwe'.
 * A backslash escapes the next character, so names may contain separators:
 * '\,' is a comma, '\;' a semicolon, '\=' an equals sign and '\\' a backslash.
 * Whitespace around names is ignored, entries without items are left out.
 */
export function parseStatisticsUserList(
  value: string | undefined,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const entry of splitUnescaped(value ?? '', ';')) {
    const [rawUsername, ...rawItems] = splitUnescaped(entry, '=');
    if (rawItems.length === 0) {
      continue;
    }
    const username = unescapeName(rawUsername);
    // An unescaped '=' after the first one belongs to the items
    const items = splitUnescaped(rawItems.join('='), ',')
      .map(unescapeName)
      .filter(Boolean);
    if (username && items.length > 0) {
      result[username] = [...new Set([...(result[username] ?? []), ...items])];
    }
  }
  return result;
}

export const getAccountingConfig = (): AccountingConfig => ({
  connectionString: process.env.ACCOUNTING_CONNECTION_STRING,
  statisticsUserClusters: parseStatisticsUserList(
    process.env.STATISTICS_USER_CLUSTERS,
  ),
  statisticsUserOrganizations: parseStatisticsUserList(
    process.env.STATISTICS_USER_ORGANIZATIONS,
  ),
});
