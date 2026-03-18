import { Injectable, NotFoundException } from '@nestjs/common';
import { DataCollectionService, PerunData } from '@/modules/data-collection/data-collection.service';
import { PbsJob } from '@/modules/data-collection/types/pbs.types';
import { UserContext, UserRole } from '@/common/types/user-context.types';
import {
  UserDetailDTO,
  UserTaskCountDTO,
  UserFairshareDTO,
} from './dto/user-detail.dto';
import { UsersListDTO, UserListDTO } from './dto/user-list.dto';
import { GroupListDTO, GroupsListDTO } from './dto/group-list.dto';
import { GroupDetailDTO, GroupMemberDTO } from './dto/group-detail.dto';

@Injectable()
export class UsersService {
  constructor(private readonly dataCollectionService: DataCollectionService) {}

  /**
   * Get list of users with pagination, sorting, and search
   * @param userContext User context for access control
   * @param page Page number (1-based)
   * @param limit Items per page
   * @param sort Sort column
   * @param order Sort direction
   * @param search Search query
   */
  getUsers(
    userContext: UserContext,
    page: number = 1,
    limit: number = 20,
    sort: string = 'username',
    order: 'asc' | 'desc' = 'asc',
    search?: string,
  ): {
    data: UsersListDTO;
    totalCount: number;
    maxFairshare: Record<string, number>;
  } {
    const pbsData = this.dataCollectionService.getPbsData();
    const perunData = this.dataCollectionService.getPerunData();

    // Collect all jobs and map them to usernames
    const { usernamesWithJobs, userJobsMap } = this.getUsernamesWithJobs();

    // Start with ALL Perun users (not just users with jobs)
    const allUsers: UserListDTO[] = [];
    const perunUsersMap = new Map<string, string>();

    if (perunData?.users?.users) {
      for (const perunUser of perunData.users.users) {
        if (perunUser.logname) {
          const lognameBase = perunUser.logname.split('@')[0];
          perunUsersMap.set(perunUser.logname, perunUser.name);
          if (lognameBase !== perunUser.logname) {
            perunUsersMap.set(lognameBase, perunUser.name);
          }
        }
      }
    }

    // Build user list from ALL Perun users
    const allPerunUsernames = new Set<string>();
    if (perunData?.users?.users) {
      for (const perunUser of perunData.users.users) {
        if (perunUser.logname) {
          const lognameBase = perunUser.logname.split('@')[0];
          allPerunUsernames.add(lognameBase);
        }
      }
    }

    // Also include users with jobs who might not be in Perun
    for (const username of usernamesWithJobs) {
      allPerunUsernames.add(username);
    }

    // Build fairshare rankings lookup map (only for users with jobs)
    // Rankings: higher fairshare value = better ranking (lower number)
    const { lookup: fairshareRankingsLookup, maxRankings } =
      this.buildFairshareRankingsLookup(pbsData?.servers, usernamesWithJobs);

    // For non-admin users, get allowed usernames from their groups
    // (excluding system-wide groups that contain 80%+ of all users)
    const allowedUsernames = new Set<string>();
    if (userContext.role !== UserRole.ADMIN) {
      const usernameBase = userContext.username.split('@')[0];
      // Always include the user themselves
      allowedUsernames.add(userContext.username);
      allowedUsernames.add(usernameBase);

      // Get users from groups the user belongs to (excluding system-wide groups)
      const groupMembers = this.getUsersFromUserGroups(
        perunData,
        userContext.username,
      );
      for (const member of groupMembers) {
        allowedUsernames.add(member);
      }
    }

    // Build user list for all users
    for (const username of allPerunUsernames) {
      // Filter: admin sees all, non-admin sees only themselves and users from their groups
      if (userContext.role !== UserRole.ADMIN) {
        if (!allowedUsernames.has(username)) {
          continue;
        }
      }

      const jobs = userJobsMap.get(username) || [];
      const tasks = this.calculateTaskCounts(jobs);
      const resources = this.calculateResourceUsage(jobs);

      const nickname =
        perunUsersMap.get(username) ||
        perunUsersMap.get(username.split('@')[0]) ||
        null;

      const totalTasks = tasks.total;

      // Get fairshare rankings (only for users with jobs)
      let fairshareRankings: Record<string, number> | null = null;
      if (jobs.length > 0) {
        // Try multiple username variations to match fairshare entries
        const usernameNormalized = username.trim();
        const usernameBase = usernameNormalized.split('@')[0];
        const usernameLower = usernameNormalized.toLowerCase();
        const usernameBaseLower = usernameBase.toLowerCase();

        // Try exact match first, then base, then lowercase variations
        const rankingsMap =
          fairshareRankingsLookup.get(usernameNormalized) ||
          fairshareRankingsLookup.get(usernameBase) ||
          fairshareRankingsLookup.get(usernameLower) ||
          fairshareRankingsLookup.get(usernameBaseLower);

        fairshareRankings =
          rankingsMap && Object.keys(rankingsMap).length > 0
            ? rankingsMap
            : null;
      }

      allUsers.push({
        username,
        nickname: nickname || null,
        totalTasks,
        queuedTasks: tasks.queued,
        runningTasks: tasks.running,
        doneTasks : tasks.done,
        queuedCPU: resources.queuedCPU,
        runningCPU: resources.runningCPU,
        doneCPU: resources.doneCPU,
        totalCPU: resources.totalCPU,
        queuedGPU: resources.queuedGPU,
        runningGPU: resources.runningGPU,
        doneGPU: resources.doneGPU,
        totalGPU: resources.totalGPU,
        fairshareRankings,
      });
    }

    // Apply search filter
    let filteredUsers = allUsers;
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filteredUsers = allUsers.filter((user) => {
        const usernameMatch = user.username.toLowerCase().includes(searchLower);
        const nicknameMatch = user.nickname
          ? user.nickname.toLowerCase().includes(searchLower)
          : false;
        return usernameMatch || nicknameMatch;
      });
    }

    // Get fairshare server names for sorting
    const fairshareServers = pbsData?.servers
      ? Object.keys(pbsData.servers).sort()
      : [];

    // Apply sorting
    filteredUsers = this.sortUsers(
      filteredUsers,
      sort,
      order,
      fairshareServers,
    );

    // Apply pagination
    const totalCount = filteredUsers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // maxRankings is already calculated in buildFairshareRankingsLookup
    const maxFairshare = maxRankings;

    return {
      data: { users: paginatedUsers, fairshareServers },
      totalCount,
      maxFairshare,
    };
  }

  /**
   * Sort users by column and direction
   * For fairshare sorting, users without fairshare are always at the end
   * For default (username) sorting, first by best fairshare value, then by username
   */
  private sortUsers(
    users: UserListDTO[],
    sort: string,
    order: 'asc' | 'desc',
    fairshareServers: string[] = [],
  ): UserListDTO[] {
    const sorted = [...users].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      let aHasValue = true;
      let bHasValue = true;

      if (sort.startsWith('fairshare-')) {
        const serverName = sort.replace('fairshare-', '');
        aHasValue = a.fairshareRankings?.[serverName] !== undefined;
        bHasValue = b.fairshareRankings?.[serverName] !== undefined;

        // Users without fairshare always go to the end
        if (!aHasValue && !bHasValue) return 0;
        if (!aHasValue) return 1; // a goes to end
        if (!bHasValue) return -1; // b goes to end

        // Higher ranking is better (opposite ranking), so reverse comparison
        aValue = a.fairshareRankings![serverName];
        bValue = b.fairshareRankings![serverName];
      } else {
        switch (sort) {
          case 'username':
            aValue = a.username.toLowerCase();
            bValue = b.username.toLowerCase();
            break;
          case 'nickname':
            aValue = (a.nickname || '').toLowerCase();
            bValue = (b.nickname || '').toLowerCase();
            break;
          case 'totalTasks':
            aValue = a.totalTasks;
            bValue = b.totalTasks;
            // Users with no tasks go to the end
            aHasValue = a.totalTasks > 0;
            bHasValue = b.totalTasks > 0;
            if (!aHasValue && !bHasValue) return 0;
            if (!aHasValue) return 1; // a goes to end
            if (!bHasValue) return -1; // b goes to end
            break;
          case 'queuedTasks':
            aValue = a.queuedTasks;
            bValue = b.queuedTasks;
            break;
          case 'runningTasks':
            aValue = a.runningTasks;
            bValue = b.runningTasks;
            break;
          case 'doneTasks':
            aValue = a.doneTasks;
            bValue = b.doneTasks;
            break;
          case 'queuedCPU':
            aValue = a.queuedCPU;
            bValue = b.queuedCPU;
            break;
          case 'runningCPU':
            aValue = a.runningCPU;
            bValue = b.runningCPU;
            break;
          case 'doneCPU':
            aValue = a.doneCPU;
            bValue = b.doneCPU;
            break;
          case 'totalCPU':
            aValue = a.totalCPU;
            bValue = b.totalCPU;
            // Users with no CPU resources go to the end
            aHasValue = a.totalCPU > 0;
            bHasValue = b.totalCPU > 0;
            if (!aHasValue && !bHasValue) return 0;
            if (!aHasValue) return 1; // a goes to end
            if (!bHasValue) return -1; // b goes to end
            break;
          case 'queuedGPU':
            aValue = a.queuedGPU;
            bValue = b.queuedGPU;
            break;
          case 'runningGPU':
            aValue = a.runningGPU;
            bValue = b.runningGPU;
            break;
          case 'doneGPU':
            aValue = a.doneGPU;
            bValue = b.doneGPU;
            break;
          case 'totalGPU':
            aValue = a.totalGPU;
            bValue = b.totalGPU;
            // Users with no GPU resources go to the end
            aHasValue = a.totalGPU > 0;
            bHasValue = b.totalGPU > 0;
            if (!aHasValue && !bHasValue) return 0;
            if (!aHasValue) return 1; // a goes to end
            if (!bHasValue) return -1; // b goes to end
            break;
          default:
            // Default to username
            aValue = a.username.toLowerCase();
            bValue = b.username.toLowerCase();
            break;
        }
      }

      // For fairshare, higher ranking is better (opposite ranking), reverse comparison
      // For other columns, normal comparison
      if (sort.startsWith('fairshare-')) {
        // Higher ranking number = better, so reverse the comparison
        if (aValue < bValue) return order === 'asc' ? 1 : -1; // Higher is better
        if (aValue > bValue) return order === 'asc' ? -1 : 1; // Higher is better
        return 0;
      }

      // For totalTasks, totalCPU, totalGPU - check if values are zero (already handled above)
      // For username - if both have fairshare and values are equal, or neither has fairshare, sort by username
      // For other columns, normal comparison
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  /**
   * Get the best (highest) fairshare value from user's rankings across all servers
   * Returns null if user has no fairshare rankings
   */
  private getBestFairshareValue(
    fairshareRankings: Record<string, number> | null | undefined,
    fairshareServers: string[],
  ): number | null {
    if (!fairshareRankings || Object.keys(fairshareRankings).length === 0) {
      return null;
    }

    let bestValue: number | null = null;
    for (const server of fairshareServers) {
      const value = fairshareRankings[server];
      if (value !== undefined && value !== null) {
        if (bestValue === null || value > bestValue) {
          bestValue = value;
        }
      }
    }

    return bestValue;
  }

  /**
   * Get user detail by username
   * @param username User login name
   * @param userContext User context for access control
   */
  getUserDetail(username: string, userContext: UserContext): UserDetailDTO {
    const pbsData = this.dataCollectionService.getPbsData();
    const perunData = this.dataCollectionService.getPerunData();

    // For non-admin users, check if they can access this user
    if (userContext.role !== UserRole.ADMIN) {
      const usernameBase = userContext.username.split('@')[0];
      const requestedUsernameBase = username.split('@')[0];

      // Always allow access to themselves
      if (
        userContext.username !== username &&
        usernameBase !== requestedUsernameBase
      ) {
        // Check if the requested user is in the same groups (excluding system-wide groups)
        const allowedUsernames = new Set<string>();
        allowedUsernames.add(userContext.username);
        allowedUsernames.add(usernameBase);

        // Get users from groups the current user belongs to (excluding system-wide groups)
        const groupMembers = this.getUsersFromUserGroups(
          perunData,
          userContext.username,
        );
        for (const member of groupMembers) {
          allowedUsernames.add(member);
        }

        // Check if requested user is in allowed set
        if (
          !allowedUsernames.has(username) &&
          !allowedUsernames.has(requestedUsernameBase)
        ) {
          throw new NotFoundException(`User '${username}' was not found`);
        }
      }
    }

    const userGroups = this.getUserGroups(userContext, username)?.groups.map((g) => (g.name)) || [];

    // Build Perun users lookup map for O(1) access instead of O(n) find()
    const perunUsersMap = new Map<string, string>();
    const perunUserDataMap = new Map<
      string,
      {
        name: string;
        org: string;
        mail: string;
        lang: string;
        publications: Record<string, string> | null;
        vos: Record<
          string,
          { expires: string; groups: string[]; org: string; status: string }
        > | null;
      }
    >();
    if (perunData?.users?.users) {
      for (const perunUser of perunData.users.users) {
        if (perunUser.logname) {
          const lognameBase = perunUser.logname.split('@')[0];
          perunUsersMap.set(perunUser.logname, perunUser.name);
          if (lognameBase !== perunUser.logname) {
            perunUsersMap.set(lognameBase, perunUser.name);
          }
          // Store full user data
          perunUserDataMap.set(perunUser.logname, {
            name: perunUser.name,
            org: perunUser.org,
            mail: perunUser.mail,
            lang: perunUser.lang,
            publications: perunUser.publications || null,
            vos: perunUser.vos || null,
          });
          if (lognameBase !== perunUser.logname) {
            perunUserDataMap.set(lognameBase, {
              name: perunUser.name,
              org: perunUser.org,
              mail: perunUser.mail,
              lang: perunUser.lang,
              publications: perunUser.publications || null,
              vos: perunUser.vos || null,
            });
          }
        }
      }
    }

    // Get user data from Perun using O(1) map lookup
    const usernameBase = username.split('@')[0];
    const perunUserData =
      perunUserDataMap.get(username) ||
      perunUserDataMap.get(usernameBase) ||
      null;
    const nickname = perunUserData?.name || null;
    const organization = perunUserData?.org || null;
    const publications = perunUserData?.publications || null;
    const mail = userContext.role === UserRole.ADMIN && perunUserData?.mail
      ? perunUserData?.mail
      : null;
    const lang = userContext.role === UserRole.ADMIN && perunUserData?.lang
      ? perunUserData?.lang
      : null;

    // Extract earliest membership expiration date from VOS data
    let membershipExpiration: string | null = null;
    if (perunUserData?.vos) {
      const expirationDates: string[] = [];
      for (const vosInfo of Object.values(perunUserData.vos)) {
        if (vosInfo?.expires) {
          expirationDates.push(vosInfo.expires);
        }
      }
      if (expirationDates.length > 0) {
        // Sort dates and get the earliest (most restrictive)
        expirationDates.sort();
        membershipExpiration = expirationDates[0];
      }
    }

    // Collect all jobs for this user across all servers
    const userJobs: Array<{ job: PbsJob; server: string }> = [];
    if (pbsData?.servers) {
      for (const [serverName, serverData] of Object.entries(pbsData.servers)) {
        if (serverData.jobs?.items) {
          for (const job of serverData.jobs.items) {
            const jobOwner = job.attributes.Job_Owner || '';
            // Job_Owner format is typically "username@hostname" or just "username"
            const ownerUsername = jobOwner.split('@')[0];
            if (
              ownerUsername === username ||
              ownerUsername === username.split('@')[0]
            ) {
              userJobs.push({ job, server: serverName });
            }
          }
        }
      }
    }

    // Calculate task counts (same as queue state counts)
    const tasks = this.calculateTaskCounts(userJobs.map(({ job }) => job));

    const { usernamesWithJobs } = this.getUsernamesWithJobs();

    const { lookup: fairshareRankingsLookup, maxRankings } =
      this.buildFairshareRankingsLookup(pbsData?.servers, usernamesWithJobs);

    const fairsharePerServer = this.getFairshareValuesForUser(
      username,
      fairshareRankingsLookup,
      maxRankings,
    );

    return {
      username,
      nickname: nickname || null,
      organization: organization || null,
      mail: mail || null,
      lang: lang || null,
      groups: userGroups || null,
      publications: publications || null,
      membershipExpiration: membershipExpiration || null,
      tasks,
      fairsharePerServer,
    };
  }

  /**
   * Calculate task counts from jobs (same as queue state counts)
   */
  private calculateTaskCounts(jobs: PbsJob[]): UserTaskCountDTO {
    const counts: UserTaskCountDTO = {
      transit: 0,
      queued: 0,
      held: 0,
      waiting: 0,
      running: 0,
      exiting: 0,
      begun: 0,
      done: 0,
      total: 0,
    };

    for (const job of jobs) {
      const state = job.attributes.job_state || '';
      switch (state) {
        case 'T':
        case 'Transit':
          counts.transit++;
          break;
        case 'Q':
        case 'Queued':
          counts.queued++;
          break;
        case 'H':
        case 'Held':
          counts.held++;
          break;
        case 'W':
        case 'Waiting':
          counts.waiting++;
          break;
        case 'R':
        case 'Running':
          counts.running++;
          break;
        case 'E':
        case 'Exiting':
          counts.exiting++;
          break;
        case 'B':
        case 'Begun':
          counts.begun++;
          break;
        case 'C':
        case 'F':
        case 'X':
          counts.done++;
      }
      counts.total++;
    }

    return counts;
  }

  /**
   * Calculate CPU tasks (running jobs with CPU resources)
   */
  private calculateCpuTasks(jobs: PbsJob[]): number {
    let cpuTasks = 0;
    for (const job of jobs) {
      const state = job.attributes.job_state || '';
      if (state === 'R' || state === 'Running') {
        // Check if job has CPU resources
        const ncpus =
          job.attributes['Resource_List.ncpus'] ||
          job.attributes['Resource_List.NCPUS'];
        if (ncpus) {
          // If ncpus is specified, count it as a CPU task
          cpuTasks++;
        } else {
          // If no explicit ncpus, check if it's a running job (likely uses CPU)
          cpuTasks++;
        }
      }
    }
    return cpuTasks;
  }

  /**
   * Calculate resource usage (CPU and GPU) by job state
   */
  private calculateResourceUsage(jobs: PbsJob[]): {
    queuedCPU: number;
    runningCPU: number;
    doneCPU: number;
    totalCPU: number;
    queuedGPU: number;
    runningGPU: number;
    doneGPU: number;
    totalGPU: number;
  } {
    const resources = {
      queuedCPU: 0,
      runningCPU: 0,
      doneCPU: 0,
      totalCPU: 0,
      queuedGPU: 0,
      runningGPU: 0,
      doneGPU: 0,
      totalGPU: 0,
    };

    for (const job of jobs) {
      const state = job.attributes.job_state || '';
      const attrs = job.attributes;

      // Parse CPU resources
      const cpuValue = this.parseResourceValue(
        attrs['Resource_List.ncpus'] || attrs['Resource_List.NCPUS'] || '0',
      );

      // Parse GPU resources
      const gpuValue = this.parseResourceValue(
        attrs['Resource_List.ngpus'] || attrs['Resource_List.NGPUS'] || '0',
      );

      // Categorize by state
      switch (state) {
        case 'Q':
        case 'Queued':
          resources.queuedCPU += cpuValue;
          resources.queuedGPU += gpuValue;
          break;
        case 'R':
        case 'Running':
          resources.runningCPU += cpuValue;
          resources.runningGPU += gpuValue;
          break;
        case 'C':
        case 'F':
        case 'X':
          resources.doneCPU += cpuValue;
          resources.doneGPU += gpuValue;
          break;
      }

      // Add to totals
      resources.totalCPU += cpuValue;
      resources.totalGPU += gpuValue;
    }

    return resources;
  }

  /**
   * Parse resource value (e.g., "8" -> 8)
   */
  private parseResourceValue(value: string): number {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Build fairshare rankings lookup map (only for users with jobs)
   * Rankings: higher fairshare value = better ranking (lower number like 1, 2, 3...)
   * Returns { lookup: Map<username, Record<serverName, ranking>>, maxRankings: Record<serverName, maxRank> }
   */
  private buildFairshareRankingsLookup(
    servers?: Record<string, any>,
    usernamesWithJobs?: Set<string>,
  ): {
    lookup: Map<string, Record<string, number>>;
    maxRankings: Record<string, number>;
  } {
    const lookup = new Map<string, Record<string, number>>();
    const maxRankings: Record<string, number> = {};

    if (!servers) {
      return { lookup, maxRankings };
    }

    // For each server, calculate rankings among users with jobs
    for (const [serverName, serverData] of Object.entries(servers)) {
      if (!serverData.fairshare?.entries) {
        continue;
      }

      // Filter to only users with jobs (if provided)
      let relevantEntries = serverData.fairshare.entries.filter(
        (entry: { username: string; value2: number }) => {
          if (
            !entry.username ||
            entry.username.trim() === '' ||
            entry.username.trim() === 'TREEROOT' ||
            entry.username.trim().startsWith('TREE') ||
            entry.value2 === undefined ||
            entry.value2 === null
          ) {
            return false;
          }

          // If we have a list of usernames with jobs, only include those
          if (usernamesWithJobs && usernamesWithJobs.size > 0) {
            const entryUsername = entry.username.trim();
            const entryUsernameBase = entryUsername.split('@')[0];
            return (
              usernamesWithJobs.has(entryUsername) ||
              usernamesWithJobs.has(entryUsernameBase)
            );
          }

          return true;
        },
      );

      // Sort by value2 descending (higher value = better)
      relevantEntries.sort((a, b) => b.value2 - a.value2);

      // Calculate rankings: same value2 = same rank
      // Higher fairshare value = higher (better) ranking number (opposite ranking)
      const rankings = new Map<string, number>();
      const totalUsers = relevantEntries.length;
      let currentRank = totalUsers; // Start from highest rank (worst position = best rank)

      for (let i = 0; i < relevantEntries.length; i++) {
        const entry = relevantEntries[i];
        const entryUsername = entry.username.trim();
        const entryUsernameBase = entryUsername.split('@')[0];

        // If same value as previous, use same rank
        if (i > 0 && relevantEntries[i - 1].value2 === entry.value2) {
          // Use the rank from previous entry
          const prevRank = rankings.get(relevantEntries[i - 1].username.trim());
          if (prevRank !== undefined) {
            currentRank = prevRank;
          }
        } else {
          // New rank: reverse order (highest value gets highest rank number)
          // Position 0 (best) gets rank = totalUsers, position 1 gets rank = totalUsers - 1, etc.
          currentRank = totalUsers - i;
        }

        // Store ranking for both full username and base username
        const usernamesToStore = [
          entryUsername,
          entryUsernameBase,
          entryUsername.toLowerCase(),
          entryUsernameBase.toLowerCase(),
        ].filter((u) => u && u.length > 0);

        for (const usernameKey of usernamesToStore) {
          if (!lookup.has(usernameKey)) {
            lookup.set(usernameKey, {});
          }
          const userRankings = lookup.get(usernameKey)!;
          userRankings[serverName] = currentRank;
        }

        // Track maximum ranking for this server (worst ranking = number of users with jobs)
        if (relevantEntries.length > 0) {
          maxRankings[serverName] = relevantEntries.length;
        }
      }
    }

    return { lookup, maxRankings };
  }

  /**
   * Get fairshare values for a user across all servers
   * Returns the actual fairshare value (value2) - higher is better
   * Note: This is used for user detail view, for list view use buildFairshareLookup
   */
  private getFairshareValuesForUser(
    username: string,
    fairshareRankingsLookup: Map<string, Record<string, number>>,
    maxRankings: Record<string, number>,
  ): UserFairshareDTO[] {
    const values: UserFairshareDTO[] = [];

    const fairsharePerUser = fairshareRankingsLookup.get(username);
    if (fairsharePerUser) {
      for (const [serverName, ranking] of Object.entries(fairsharePerUser)) {
        values.push({
          server: serverName,
          ranking,
          totalUsers: maxRankings[serverName],
        });
      }
    }

    return values;
  }

  private getUsernamesWithJobs(): {
    usernamesWithJobs: Set<string>;
    userJobsMap: Map<string, PbsJob[]>;
  } {
    const pbsData = this.dataCollectionService.getPbsData();
    const userJobsMap = new Map<string, PbsJob[]>();
    const usernamesWithJobs = new Set<string>();

    if (pbsData?.servers) {
      for (const serverData of Object.values(pbsData.servers)) {
        if (serverData.jobs?.items) {
          for (const job of serverData.jobs.items) {
            const jobOwner = job.attributes.Job_Owner || '';
            const ownerUsername = jobOwner.split('@')[0];
            if (ownerUsername) {
              usernamesWithJobs.add(ownerUsername);
              if (!userJobsMap.has(ownerUsername)) {
                userJobsMap.set(ownerUsername, []);
              }
              userJobsMap.get(ownerUsername)!.push(job);
            }
          }
        }
      }
    }

    return {
      usernamesWithJobs,
      userJobsMap,
    };
  }
  /**
   * Get all users from groups that the user belongs to
   * Excludes system-wide groups that contain 80%+ of all Metacentrum users
   * @param perunData Perun data
   * @param username Username to find groups for
   * @returns Set of usernames from relevant groups
   */
  private getUsersFromUserGroups(
    perunData: any,
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
    for (const [groupName, groupData] of userGroupsMap.entries()) {
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

  getGroups(userContext: UserContext): GroupsListDTO {
    return this.getUserGroups(userContext, null);
  }

  /**
   * Get list of all groups
   * Admin sees all groups, non-admin sees only groups they are a member of
   */
  getUserGroups(userContext: UserContext, username: string | null): GroupsListDTO {
    const perunData = this.dataCollectionService.getPerunData();

    if (!perunData?.etcGroups || perunData.etcGroups.length === 0) {
      return { groups: [] };
    }

    // Extract username base (without @domain if present)
    const usernameBase = userContext.username.split('@')[0];

    // Collect all unique groups across all servers
    const groupsMap = new Map<string, { gid: string; members: Set<string> }>();

    for (const serverGroups of perunData.etcGroups) {
      for (const group of serverGroups.entries) {
        // For non-admin users, only include groups they are a member of
        if (!username && userContext.role !== UserRole.ADMIN) {
          const isMember =
            group.members.includes(usernameBase) ||
            group.members.includes(userContext.username);
          if (!isMember) {
            continue;
          }
        // If username specified, include groups the username is member of
        // and the used context is permited.
        } else if (username) {
          const isMember =
            group.members.includes(username) && (
              userContext.role === UserRole.ADMIN ||
              (
              group.members.includes(usernameBase) ||
              group.members.includes(userContext.username)
              )
            );
          if (!isMember) {
            continue;
          }
        } // else !username and role is admin -> get all groups

        if (!groupsMap.has(group.groupname)) {
          groupsMap.set(group.groupname, {
            gid: group.gid,
            members: new Set(group.members),
          });
        } else {
          // If group exists, merge members from all servers
          const existing = groupsMap.get(group.groupname)!;
          for (const member of group.members) {
            existing.members.add(member);
          }
        }
      }
    }

    let groups: GroupListDTO[] = Array.from(groupsMap.entries())
      .map(([name, data]) => ({
        name,
        gid: data.gid,
        memberCount: data.members.size,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // For non-admin users, filter out groups that contain all (or nearly all) users
    // These are system-wide groups like "meta" and "storage" that include everyone
    if (username || userContext.role !== UserRole.ADMIN) {
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

      if (totalUsers > 0) {
        // Filter out groups that contain more than 80% of all users
        // This catches system-wide groups like "meta" and "storage"
        // with some tolerance for users that might not be in Perun
        const MAX_PERCENTAGE_OF_ALL_USERS = 0.8; // 80%
        groups = groups.filter((group) => {
          const percentage = group.memberCount / totalUsers;
          return percentage <= MAX_PERCENTAGE_OF_ALL_USERS;
        });
      }
    }

    return { groups };
  }

  /**
   * Get group detail by name
   * Admin can see any group, non-admin can only see groups they are a member of
   */
  getGroupDetail(groupName: string, userContext: UserContext): GroupDetailDTO {
    const perunData = this.dataCollectionService.getPerunData();

    if (!perunData?.etcGroups || perunData.etcGroups.length === 0) {
      throw new NotFoundException(`Group '${groupName}' was not found`);
    }

    // Extract username base (without @domain if present)
    const usernameBase = userContext.username.split('@')[0];

    // Find the group across all servers
    let foundGroup: { gid: string; members: Set<string> } | null = null;

    for (const serverGroups of perunData.etcGroups) {
      for (const group of serverGroups.entries) {
        if (group.groupname === groupName) {
          // For non-admin users, check if they are a member
          if (userContext.role !== UserRole.ADMIN) {
            const isMember =
              group.members.includes(usernameBase) ||
              group.members.includes(userContext.username);
            if (!isMember) {
              continue;
            }
          }

          if (!foundGroup) {
            foundGroup = {
              gid: group.gid,
              members: new Set(group.members),
            };
          } else {
            // Merge members from all servers
            for (const member of group.members) {
              foundGroup.members.add(member);
            }
          }
        }
      }
    }

    if (!foundGroup) {
      throw new NotFoundException(`Group '${groupName}' was not found`);
    }

    // Get user names from Perun data
    const perunUsersMap = new Map<string, string>();
    if (perunData?.users?.users) {
      for (const perunUser of perunData.users.users) {
        if (perunUser.logname) {
          const lognameBase = perunUser.logname.split('@')[0];
          perunUsersMap.set(perunUser.logname, perunUser.name);
          if (lognameBase !== perunUser.logname) {
            perunUsersMap.set(lognameBase, perunUser.name);
          }
        }
      }
    }

    // Build member list with nickname and name
    const members: GroupMemberDTO[] = Array.from(foundGroup.members)
      .map((nickname) => ({
        nickname,
        name: perunUsersMap.get(nickname) || null,
      }))
      .sort((a, b) => a.nickname.localeCompare(b.nickname));

    return {
      name: groupName,
      gid: foundGroup.gid,
      members,
    };
  }
}
