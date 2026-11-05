import type { PerunData } from '@/modules/data-collection/data-collection.service';

/**
 * Group based visibility of users, shared by the users page and statistics:
 * a non-admin user sees themselves and members of the unix groups they
 * belong to, except system-wide groups containing most of the users.
 */

/**
 * Get all users from groups that the user belongs to
 * Excludes system-wide groups that contain 80%+ of all Metacentrum users
 * @param perunData Perun data
 * @param username Username to find groups for
 * @returns Set of usernames from relevant groups
 */
export function getUsersFromUserGroups(
  perunData: PerunData | null | undefined,
  username: string,
): Set<string> {
  const result = new Set<string>();
  const usernameBase = username.split('@')[0];

  if (!perunData?.etcGroups || perunData.etcGroups.length === 0) {
    return result;
  }

  // Calculate total unique users in the system
  const allUsersSet = new Set<string>();
  if (perunData?.users?.users) {
    for (const perunUser of perunData.users.users) {
      if (perunUser.logname) {
        const lognameBase = perunUser.logname.split('@')[0];
        allUsersSet.add(lognameBase);
        allUsersSet.add(perunUser.logname);
      }
    }
  }
  const totalUsers = allUsersSet.size;

  // Collect all groups the user belongs to across all servers
  const userGroupsMap = new Map<
    string,
    { gid: string; members: Set<string> }
  >();

  for (const serverGroups of perunData.etcGroups) {
    for (const group of serverGroups.entries) {
      // Check if user is a member of this group
      const isMember =
        group.members.includes(usernameBase) ||
        group.members.includes(username);
      if (!isMember) {
        continue;
      }

      // Merge group members across all servers
      if (!userGroupsMap.has(group.groupname)) {
        userGroupsMap.set(group.groupname, {
          gid: group.gid,
          members: new Set(group.members),
        });
      } else {
        const existing = userGroupsMap.get(group.groupname)!;
        for (const member of group.members) {
          existing.members.add(member);
        }
      }
    }
  }

  // Filter out system-wide groups (80%+ of all users) and collect members
  const MAX_PERCENTAGE_OF_ALL_USERS = 0.8; // 80%
  for (const groupData of userGroupsMap.values()) {
    if (totalUsers > 0) {
      const percentage = groupData.members.size / totalUsers;
      // Skip groups that contain too many users (system-wide groups)
      if (percentage > MAX_PERCENTAGE_OF_ALL_USERS) {
        continue;
      }
    }

    // Add all members from this group
    for (const member of groupData.members) {
      result.add(member);
    }
  }

  return result;
}

/**
 * Usernames visible to a non-admin user: the user themselves (with and
 * without the realm) and members of their groups
 */
export function getVisibleUsernames(
  perunData: PerunData | null | undefined,
  username: string,
): Set<string> {
  const result = getUsersFromUserGroups(perunData, username);
  result.add(username);
  result.add(username.split('@')[0]);
  return result;
}
