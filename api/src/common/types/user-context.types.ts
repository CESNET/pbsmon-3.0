export enum UserRole {
  ADMIN = 'admin',
  STATISTICS = 'statistics',
  USER = 'user',
}

/**
 * Parse a role string (e.g. from session) into UserRole, falling back to USER.
 */
export function parseUserRole(role: unknown): UserRole {
  return Object.values(UserRole).includes(role as UserRole)
    ? (role as UserRole)
    : UserRole.USER;
}

/**
 * Whether the user may read statistics (statistics role or admin).
 */
export function canReadStatistics(userContext: { role: UserRole }): boolean {
  return (
    userContext.role === UserRole.ADMIN ||
    userContext.role === UserRole.STATISTICS
  );
}

export interface UserContext {
  id: string;
  username: string;
  role: UserRole;
}
