import { UserRole } from '@/common/types/user-context.types';
import type { PerunData } from '@/modules/data-collection/data-collection.service';

/** Unix groups whose members get the admin role */
export const ADMIN_GROUPS = ['pbs-admins', 'pbsmon-admins'];
/** Unix groups whose members get the statistics role */
export const STATISTICS_GROUPS = ['pbsmon-statistics'];

/**
 * Whether the user is a member of any of the given unix (etc) groups on any
 * server
 */
export function isMemberOfAnyGroup(
  perunData: PerunData | null | undefined,
  username: string,
  groups: string[],
): boolean {
  for (const serverGroup of perunData?.etcGroups ?? []) {
    for (const entry of serverGroup.entries) {
      if (
        groups.includes(entry.groupname) &&
        entry.members.includes(username)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Resolve the user's role from unix group membership.
 * Admin takes precedence over statistics; everyone else is a regular user.
 */
export function resolveUserRole(
  perunData: PerunData | null | undefined,
  username: string,
): UserRole {
  if (isMemberOfAnyGroup(perunData, username, ADMIN_GROUPS)) {
    return UserRole.ADMIN;
  }
  if (isMemberOfAnyGroup(perunData, username, STATISTICS_GROUPS)) {
    return UserRole.STATISTICS;
  }
  return UserRole.USER;
}

/**
 * Role of a user impersonated by an admin. Admin-only features stay hidden
 * (an impersonated admin is a regular user), but the statistics role is
 * kept, so the admin sees statistics as that user does: limited to their
 * configured clusters and users. It never grants more than the impersonating
 * admin already has.
 */
export function resolveImpersonatedUserRole(
  perunData: PerunData | null | undefined,
  username: string,
): UserRole {
  return resolveUserRole(perunData, username) === UserRole.STATISTICS
    ? UserRole.STATISTICS
    : UserRole.USER;
}
