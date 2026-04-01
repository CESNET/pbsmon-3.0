import { Injectable, NotFoundException } from '@nestjs/common';
import { DataCollectionService } from '@/modules/data-collection/data-collection.service';
import { PbsJob, PbsData } from '@/modules/data-collection/types/pbs.types';
import { UserContext, UserRole } from '@/common/types/user-context.types';
import { JobsListDTO, JobListDTO } from './dto/job-list.dto';
import {
  JobDetailDTO,
  SubjobDTO,
  AllocatedResourceDTO,
  JobMessageDTO,
} from './dto/job-detail.dto';
import { JobsListMetaDto } from './dto/jobs-list-meta.dto';
import { JobsSummaryDTO } from './dto/jobs-summary.dto';
import { getJobStateFromPbsState } from './helpers/job-state.helper';


@Injectable()
export class JobsService {
  constructor(private readonly dataCollectionService: DataCollectionService) {}

  /**
   * Create empty meta for empty data
   */
  private createEmptyMeta(): JobsListMetaDto {
    return {
      totalCount: 0,
      filterableStates: null,
      lastRunningCompletedBy: null,
    };
  }

  /**
   * Get paginated, sorted, and filtered list of jobs
   * @param userContext User context for access control
   * @param page Page number (1-based)
   * @param limit Items per page
   * @param sort Sort column
   * @param order Sort direction (asc/desc)
   * @param search Search query (searches in job ID, name, owner, node)
   * @param state Filter by job state (Q=Queued, R=Running, C=Completed, E=Exiting, H=Held)
   * @param node Filter by node/machine name
   * @param queue Filter by queue name
   * @param comment Filter by job comment/waiting reason
   * @param owner Filter by job owner username (exact match on username part, before @)
   */
  getJobsList(
    userContext: UserContext,
    page: number = 1,
    limit: number = 20,
    sort: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc',
    search?: string,
    state?: string,
    node?: string,
    queue?: string,
    comment?: string,
    owner?: string,
  ): {
    data: JobsListDTO;
    meta: JobsListMetaDto;
  } {
    const pbsData = this.dataCollectionService.getPbsData();

    if (!pbsData?.servers) {
      return {
        data: { jobs: [] },
        meta: this.createEmptyMeta(),
      };
    }

    // Collect all jobs from all servers
    const allJobs: PbsJob[] = [];
    for (const serverData of Object.values(pbsData.servers)) {
      if (serverData.jobs?.items) {
        allJobs.push(...serverData.jobs.items);
      }
    }

    // Transform to DTOs
    let jobs = allJobs.map((job) => this.transformJobToDTO(job));

    // Calculate which usernames the current user can see
    // (for anonymization - non-admins can see usernames of themselves and group members)
    const allowedUsernames = new Set<string>();
    if (userContext.role === UserRole.ADMIN) {
      // Admins can see all usernames
      // We'll set canSeeOwner to true for all jobs below
    } else {
      const usernameBase = userContext.username.split('@')[0];
      allowedUsernames.add(userContext.username);
      allowedUsernames.add(usernameBase);

      // Get users from groups the current user belongs to
      const userGroups = this.getUserGroups(userContext);
      for (const groupMember of userGroups) {
        allowedUsernames.add(groupMember);
        const groupMemberBase = groupMember.split('@')[0];
        allowedUsernames.add(groupMemberBase);
      }
    }

    // Add canSeeOwner field to each job
    jobs = jobs.map((job) => {
      const jobOwner = job.owner.split('@')[0];
      const canSeeOwner =
        userContext.role === UserRole.ADMIN ||
        allowedUsernames.has(job.owner) ||
        allowedUsernames.has(jobOwner);

      return {
        ...job,
        owner: canSeeOwner ? job.owner : 'Anonym',
        canSeeOwner,
      };
    });

    // Apply node filter
    if (node && node.trim()) {
      jobs = jobs.filter((job) => {
        if (!job.node) return false;
        // Match exact node name or node name with cluster suffix
        return (
          job.node.toLowerCase() === node.trim().toLowerCase() ||
          job.node.toLowerCase().startsWith(node.trim().toLowerCase() + '.')
        );
      });
    }

    // Apply queue filter
    if (queue && queue.trim()) {
      jobs = jobs.filter((job) => {
        if (!job.queue) return false;
        // Match exact queue name or queue name with server suffix
        const queueName = queue.trim();
        return (
          job.queue.toLowerCase() === queueName.toLowerCase() ||
          job.queue.toLowerCase().startsWith(queueName.toLowerCase() + '@')
        );
      });
    }

    // Apply search filter
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      jobs = jobs.filter((job) => {
        return (
          job.id.toLowerCase().includes(searchLower) ||
          job.name.toLowerCase().includes(searchLower) ||
          job.owner.toLowerCase().includes(searchLower) ||
          (job.node && job.node.toLowerCase().includes(searchLower))
        );
      });
    }

    // Apply comment filter (exact match for waiting reason)
    if (comment !== undefined && comment !== null) {
      jobs = jobs.filter((job) => {
        const jobComment = job.comment || '';
        return jobComment === comment;
      });
    }

    // Apply owner filter (exact match on username part, before @)
    if (owner && owner.trim()) {
      const ownerFilter = owner.trim().toLowerCase();
      jobs = jobs.filter((job) => {
        const jobOwner = job.owner.split('@')[0].toLowerCase();
        return jobOwner === ownerFilter;
      });
    }

    const filterableStates: Record<string, string> = {};
    for (const job of jobs) {
      if (!filterableStates[job.state]) {
        filterableStates[job.state] = job.stateName;
      }
    }

    let lastCompletedBy: number | null = null;
    // Apply state filter - must be last before sorting and pagination, because it depends on the final list of jobs to determine filterable states
    if (state && state.trim()) {
      const states = state.split('|').map((s) => s.trim().toUpperCase());
      jobs = jobs.filter((job) => states.includes(job.state));

      if (state.includes('R') || state.includes('B')) { // running jobs
        lastCompletedBy = Math.max(
          ...jobs
            .filter((job) => job.completedBy != null)
            .map((job) => job.completedBy)
            .filter((v): v is number => !!v)
        );
      }
    }

    const lastRunningCompletedBy = lastCompletedBy;

    // Apply sorting
    jobs = this.sortJobs(jobs, sort, order);

    // Apply pagination
    const totalCount = jobs.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedJobs = jobs.slice(startIndex, endIndex);

    return {
      data: { jobs: paginatedJobs },
      meta: {
        totalCount: totalCount,
        filterableStates: filterableStates,
        lastRunningCompletedBy: lastRunningCompletedBy,
      },
    };
  }

  getJobsSummary(
    userContext: UserContext,
  ): JobsSummaryDTO {
    const pbsData = this.dataCollectionService.getPbsData();
    if (!pbsData?.servers) {
      return {};
    }

    // Collect all jobs from all servers
    const allJobs: PbsJob[] = [];
    for (const serverData of Object.values(pbsData.servers)) {
      if (serverData.jobs?.items) {
        allJobs.push(...serverData.jobs.items);
      }
    }

    // Transform to DTOs
    let jobs = allJobs.map((job) => this.transformJobToDTO(job));

    const waitingJobs = jobs.filter((job) => ['Q', 'W'].includes(job.state));

    const waitingReasons = waitingJobs.reduce((counts, job) => {
      const comment = typeof job.comment === "string" ? job.comment : "";
      counts[comment] = (counts[comment] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const stateCounts: Record<string, number> = jobs.reduce((counts, job) => {
      counts[job.state] = (counts[job.state] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      stateCounts,
      waitingReasons,
    };
  }

  /**
   * Transform PBS job to JobListDTO
   */
  private transformJobToDTO(job: PbsJob): JobListDTO {
    const attrs = job.attributes;

    // Parse resource values
    const cpuReserved = this.parseResourceValue(
      attrs['Resource_List.ncpus'] || '0',
    );
    const gpuReserved = this.parseResourceValue(
      attrs['Resource_List.ngpus'] || '0',
    );
    const memoryReserved = this.parseMemoryValue(
      attrs['Resource_List.mem'] || '0gb',
    );
    const walltimeReserved = attrs['Resource_List.walltime']
      ? this.parseTimeToSeconds(attrs['Resource_List.walltime'])
      : null;

    // Parse used resources (for running, exiting, and completed jobs: C, F, X)
    const state = attrs['job_state'] || 'U';
    const completedStates = ['C', 'F', 'X'];
    const hasResourceUsage =
      state === 'R' || state === 'E' || completedStates.includes(state);

    const cpuTimeUsed = hasResourceUsage
      ? attrs['resources_used.cput'] || null
      : null;
    const gpuTimeUsed = hasResourceUsage
      ? attrs['resources_used.gput'] || null
      : null;
    const memoryUsed = hasResourceUsage
      ? attrs['resources_used.mem']
        ? this.parseMemoryValue(attrs['resources_used.mem'])
        : null
      : null;

    // Get runtime from resources_used.walltime
    const runtime = hasResourceUsage
      ? attrs['resources_used.walltime'] || null
      : null;

    // Calculate usage percentages
    let cpuUsagePercent: number | null = null;
    let cpuUsagePercentPerCpu: number | null = null;
    let gpuUsagePercent: number | null = null;
    let gpuUsagePercentPerGpu: number | null = null;
    let memoryUsagePercent: number | null = null;

    // Use CPU percent from PBS directly
    if (hasResourceUsage && attrs['resources_used.cpupercent']) {
      const cpuPercent = parseFloat(attrs['resources_used.cpupercent']);
      if (!isNaN(cpuPercent)) {
        cpuUsagePercent = Math.round(cpuPercent);
        cpuUsagePercentPerCpu = Math.round(cpuPercent / (cpuReserved > 0 ? cpuReserved : 1));
      }
    }

    // Use GPU percent from PBS directly (if available)
    if (hasResourceUsage && attrs['resources_used.gpupercent']) {
      const gpuPercent = parseFloat(attrs['resources_used.gpupercent']);
      if (!isNaN(gpuPercent)) {
        gpuUsagePercent = Math.round(gpuPercent);
        gpuUsagePercentPerGpu = Math.round(gpuPercent / (gpuReserved > 0 ? gpuReserved : 1));
      }
    } else if (
      hasResourceUsage &&
      gpuTimeUsed &&
      walltimeReserved &&
      gpuReserved > 0
    ) {
      // Fall back to calculation from gpuTimeUsed if gpupercent is not available
      const gpuTimeSeconds = this.parseTimeToSeconds(gpuTimeUsed);
      const maxGpuTimeSeconds = walltimeReserved * gpuReserved;
      if (maxGpuTimeSeconds > 0) {
        gpuUsagePercent = Math.min(
          100,
          Math.round((gpuTimeSeconds / maxGpuTimeSeconds) * 100),
        );
      }
    }

    const startedAt = attrs['stime'] ? parseInt(attrs['stime'], 10) : null;
    const completedBy = startedAt && walltimeReserved
      ? startedAt + walltimeReserved
      : null;

    if (hasResourceUsage && memoryUsed !== null && memoryReserved > 0) {
      memoryUsagePercent = Math.min(
        100,
        Math.round((memoryUsed / memoryReserved) * 100),
      );
    }

    // Parse exit code
    const exitCode = attrs['Exit_status']
      ? parseInt(attrs['Exit_status'], 10)
      : null;

    // Parse creation time
    const createdAt = attrs['ctime'] ? parseInt(attrs['ctime'], 10) : 0;

    // Get node name (exec_host, exec_vnode, or Resource_List.host for preplanned jobs)
    let node: string | null = null;
    if (attrs['exec_host']) {
      // Format: "node1/0*8+node2/0*8" -> extract first node
      const firstNode = attrs['exec_host'].split('/')[0];
      node = firstNode || null;
    } else if (attrs['exec_vnode']) {
      // Format: "(node1:ncpus=8)" -> extract node name
      const match = attrs['exec_vnode'].match(/\(([^:]+):/);
      if (match) {
        node = match[1];
      }
    } else if (attrs['Resource_List.host']) {
      // For preplanned queued jobs, check Resource_List.host
      // Format: "node1" or "node1+node2" -> extract first node
      const hostValue = attrs['Resource_List.host'];
      if (hostValue) {
        const firstHost = hostValue.split('+')[0].trim();
        node = firstHost || null;
      }
    }

    const owner = attrs['Job_Owner'] || '';
    const username = owner.split('@')[0];
    // Use the already declared state variable from line 156
    const stateInfo = getJobStateFromPbsState(state, exitCode);

    return {
      id: job.name,
      name: attrs['Job_Name'] || job.name,
      state: state,
      stateName: stateInfo.name,
      stateColor: stateInfo.color,
      owner: owner,
      username: username,
      queue: attrs['queue'] || null,
      server: attrs['server'] || null,
      node: node,
      cpuReserved,
      gpuReserved,
      memoryReserved,
      cpuTimeUsed,
      gpuTimeUsed,
      memoryUsed,
      runtime,
      completedBy,
      cpuUsagePercent,
      cpuUsagePercentPerCpu,
      gpuUsagePercent,
      gpuUsagePercentPerGpu,
      memoryUsagePercent,
      createdAt,
      exitCode,
      comment: attrs['comment'] || null,
      canSeeOwner: true, // Will be overridden in getJobsList based on user context
    };
  }

  /**
   * Parse resource value (e.g., "8" -> 8)
   */
  private parseResourceValue(value: string): number {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse memory value (e.g., "8gb" -> 8, "1024mb" -> 1)
   */
  private parseMemoryValue(value: string): number {
    const lower = value.toLowerCase().trim();
    const match = lower.match(/^(\d+(?:\.\d+)?)\s*(gb|mb|kb|b)?$/);
    if (!match) return 0;

    const num = parseFloat(match[1]);
    const unit = match[2] || 'gb';

    switch (unit) {
      case 'gb':
        return num;
      case 'mb':
        return num / 1024;
      case 'kb':
        return num / (1024 * 1024);
      case 'b':
        return num / (1024 * 1024 * 1024);
      default:
        return num;
    }
  }

  /**
   * Parse time string to seconds (e.g., "100:02:54" -> 360174)
   */
  private parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const seconds = parseInt(parts[2], 10) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * Sort jobs by column and direction
   */
  private sortJobs(
    jobs: JobListDTO[],
    sort: string,
    order: 'asc' | 'desc',
  ): JobListDTO[] {
    const sorted = [...jobs];

    sorted.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sort) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'state':
          aVal = a.state;
          bVal = b.state;
          break;
        case 'owner':
          aVal = a.owner;
          bVal = b.owner;
          break;
        case 'node':
          aVal = a.node || '';
          bVal = b.node || '';
          break;
        case 'cpuReserved':
          aVal = a.cpuReserved;
          bVal = b.cpuReserved;
          break;
        case 'gpuReserved':
          aVal = a.gpuReserved;
          bVal = b.gpuReserved;
          break;
        case 'memoryReserved':
          aVal = a.memoryReserved;
          bVal = b.memoryReserved;
          break;
        case 'createdAt':
        default:
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
      }

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare values
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  }

  /**
   * Get user groups from Perun etc_groups data
   * Returns list of usernames that are in the same groups as the user
   * Excludes system-wide groups that contain 80%+ of all users
   */
  private getUserGroups(userContext: UserContext): string[] {
    const perunData = this.dataCollectionService.getPerunData();
    if (!perunData?.etcGroups || perunData.etcGroups.length === 0) {
      return [];
    }

    const username = userContext.username.split('@')[0];
    const usernameBase = username;

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

    const allGroupsMap = new Map<
      string,
      { gid: string; members: Set<string> }
    >();

    for (const serverGroups of perunData.etcGroups) {
      for (const group of serverGroups.entries) {
        // Merge group members across all servers
        if (!allGroupsMap.has(group.groupname)) {
          allGroupsMap.set(group.groupname, {
            gid: group.gid,
            members: new Set(group.members),
          });
        } else {
          const existing = allGroupsMap.get(group.groupname)!;
          for (const member of group.members) {
            existing.members.add(member);
          }
        }
      }
    }

    // Filter out system-wide groups (80%+ of all users)
    const MAX_PERCENTAGE_OF_ALL_USERS = 0.8; // 80%
    const filteredGroups = new Map<
      string,
      { gid: string; members: Set<string> }
    >();

    for (const [groupName, groupData] of allGroupsMap.entries()) {
      if (totalUsers > 0) {
        const percentage = groupData.members.size / totalUsers;
        // Skip groups that contain too many users (system-wide groups)
        if (percentage > MAX_PERCENTAGE_OF_ALL_USERS) {
          continue;
        }
      }
      filteredGroups.set(groupName, groupData);
    }

    // Now iterate over filtered groups and check if user is a member
    const result = new Set<string>();
    for (const [groupName, groupData] of filteredGroups.entries()) {
      // Check if user is a member of this group
      const isMember =
        groupData.members.has(usernameBase) ||
        groupData.members.has(userContext.username);
      if (!isMember) {
        continue;
      }

      // Add all members from this group (except the user themselves)
      for (const member of groupData.members) {
        if (member !== usernameBase && member !== userContext.username) {
          result.add(member);
        }
      }
    }

    return Array.from(result);
  }

  /**
   * Get detailed information about a specific job
   * @param userContext User context for access control
   * @param jobId Job ID (e.g., "11118906.pbs-m1.metacentrum.cz" or "14699148[96].pbs-m1.metacentrum.cz")
   */
  getJobDetail(userContext: UserContext, jobId: string): JobDetailDTO {
    const pbsData = this.dataCollectionService.getPbsData();

    if (!pbsData?.servers) {
      throw new NotFoundException('Job not found');
    }

    // Find the job across all servers
    let job: PbsJob | null = null;
    for (const serverData of Object.values(pbsData.servers)) {
      if (serverData.jobs?.items) {
        const found = serverData.jobs.items.find((j) => j.name === jobId);
        if (found) {
          job = found;
          break;
        }
      }
    }

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Calculate if current user can see the job owner
    const attrs = job.attributes;
    const owner = attrs['Job_Owner'] || '';
    const jobOwner = owner.split('@')[0];

    let canSeeOwner = true;
    if (userContext.role !== UserRole.ADMIN) {
      const usernameBase = userContext.username.split('@')[0];
      const allowedUsernames = new Set<string>();
      // Add both full username (if it contains @) and base username
      allowedUsernames.add(userContext.username);
      allowedUsernames.add(usernameBase);

      // Get users from groups the current user belongs to
      const userGroups = this.getUserGroups(userContext);
      for (const groupMember of userGroups) {
        allowedUsernames.add(groupMember);
        const groupMemberBase = groupMember.split('@')[0];
        allowedUsernames.add(groupMemberBase);
      }

      canSeeOwner =
        allowedUsernames.has(owner) || allowedUsernames.has(jobOwner);
    }

    // Transform to detail DTO
    const jobDetail = this.transformJobToDetailDTO(job, pbsData);
    return {
      ...jobDetail,
      owner: canSeeOwner ? jobDetail.owner : 'Anonym',
      canSeeOwner,
    };
  }

  /**
   * Transform PBS job to JobDetailDTO
   */
  private transformJobToDetailDTO(job: PbsJob, pbsData: PbsData): JobDetailDTO {
    const attrs = job.attributes;

    // Basic info
    const owner = attrs['Job_Owner'] || '';
    const username = owner.split('@')[0];
    const state = attrs['job_state'] || 'U';

    // Parse resource values
    const cpuReserved = this.parseResourceValue(
      attrs['Resource_List.ncpus'] || '0',
    );
    const gpuReserved = this.parseResourceValue(
      attrs['Resource_List.ngpus'] || '0',
    );
    const memoryReserved = this.parseMemoryValue(
      attrs['Resource_List.mem'] || '0gb',
    );
    const walltimeReserved = attrs['Resource_List.walltime']
      ? this.parseTimeToSeconds(attrs['Resource_List.walltime'])
      : null;
    const scratchReserved = attrs['Resource_List.scratch_local']
      ? this.parseMemoryValue(attrs['Resource_List.scratch_local'])
      : attrs['Resource_List.scratch_ssd']
        ? this.parseMemoryValue(attrs['Resource_List.scratch_ssd'])
        : attrs['Resource_List.scratch_volume']
          ? this.parseMemoryValue(attrs['Resource_List.scratch_volume'])
          : null;

    const requestedResources =
      attrs['Resource_List.select']
        ? attrs['Resource_List.select']
        : '';

    // Parse used resources (for running, exiting, and completed jobs: C, F, X)
    const completedStates = ['C', 'F', 'X'];
    const hasResourceUsage =
      state === 'R' || state === 'E' || completedStates.includes(state);

    const cpuTimeUsed = hasResourceUsage
      ? attrs['resources_used.cput'] || null
      : null;
    const gpuTimeUsed = hasResourceUsage
      ? attrs['resources_used.gput'] || null
      : null;
    const memoryUsed = hasResourceUsage
      ? attrs['resources_used.mem']
        ? this.parseMemoryValue(attrs['resources_used.mem'])
        : null
      : null;

    // Get runtime from resources_used.walltime
    const runtime = hasResourceUsage
      ? attrs['resources_used.walltime'] || null
      : null;

    // Calculate usage percentages
    let cpuUsagePercent: number | null = null;
    let cpuUsagePercentPerCpu: number | null = null;
    let gpuUsagePercent: number | null = null;
    let gpuUsagePercentPerGpu: number | null = null;
    let memoryUsagePercent: number | null = null;

    // Use CPU percent from PBS directly
    if (hasResourceUsage && attrs['resources_used.cpupercent']) {
      const cpuPercent = parseFloat(attrs['resources_used.cpupercent']);
      if (!isNaN(cpuPercent)) {
        cpuUsagePercent = Math.round(cpuPercent);
        cpuUsagePercentPerCpu = Math.round(cpuPercent / (cpuReserved > 0 ? cpuReserved : 1));
      }
    }

    // Use GPU percent from PBS directly (if available)
    if (hasResourceUsage && attrs['resources_used.gpupercent']) {
      const gpuPercent = parseFloat(attrs['resources_used.gpupercent']);
      if (!isNaN(gpuPercent)) {
        gpuUsagePercent = Math.round(gpuPercent);
        gpuUsagePercentPerGpu = Math.round(gpuPercent / (gpuReserved > 0 ? gpuReserved : 1));
      }
    } else if (
      hasResourceUsage &&
      gpuTimeUsed &&
      walltimeReserved &&
      gpuReserved > 0
    ) {
      // Fall back to calculation from gpuTimeUsed if gpupercent is not available
      const gpuTimeSeconds = this.parseTimeToSeconds(gpuTimeUsed);
      const maxGpuTimeSeconds = walltimeReserved * gpuReserved;
      if (maxGpuTimeSeconds > 0) {
        gpuUsagePercent = Math.min(
          100,
          Math.round((gpuTimeSeconds / maxGpuTimeSeconds) * 100),
        );
      }
    }

    if (hasResourceUsage && memoryUsed !== null && memoryReserved > 0) {
      memoryUsagePercent = Math.min(
        100,
        Math.round((memoryUsed / memoryReserved) * 100),
      );
    }

    // Parse timestamps
    const createdAt = attrs['ctime'] ? parseInt(attrs['ctime'], 10) : 0;
    // qtime is the eligible time (when job became eligible to run)
    // etime might be end time in some PBS versions, so prefer qtime
    const eligibleAt = attrs['qtime']
      ? parseInt(attrs['qtime'], 10)
      : attrs['etime']
        ? parseInt(attrs['etime'], 10)
        : null;
    const startedAt = attrs['stime'] ? parseInt(attrs['stime'], 10) : null;
    const obitAt = attrs['obittime'] ? parseInt(attrs['obittime'], 10) : null;
    const completedBy = startedAt && walltimeReserved
      ? startedAt + walltimeReserved
      : null;
    const lastStateChangeAt = attrs['mtime']
      ? parseInt(attrs['mtime'], 10)
      : null;
    const kerberosTicketAt = attrs['credential_validity']
      ? parseInt(attrs['credential_validity'], 10)
      : null;

    // Get node name
    let node: string | null = null;
    if (attrs['exec_host']) {
      const firstNode = attrs['exec_host'].split('/')[0];
      node = firstNode || null;
    } else if (attrs['exec_vnode']) {
      const match = attrs['exec_vnode'].match(/\(([^:]+):/);
      if (match) {
        node = match[1];
      }
    }

    // Parse allocated resources per machine
    const allocatedResources: AllocatedResourceDTO[] = [];
    if (attrs['exec_vnode']) {
      // Parse exec_vnode format: "(node1:ncpus=4:mem=2097152kb:scratch_local=1048576kb)"
      const vnodeMatches = attrs['exec_vnode'].matchAll(/\(([^:]+):([^)]+)\)/g);
      for (const match of vnodeMatches) {
        const machine = match[1];
        const resources = match[2];
        let cpu = 0;
        let gpu = 0;
        let ram = 0;
        let scratch: number | null = null;
        let scratchType: string | null = null;

        // Parse resources
        const resourceParts = resources.split(':');
        for (const part of resourceParts) {
          if (part.startsWith('ncpus=')) {
            cpu = this.parseResourceValue(part.split('=')[1]);
          } else if (part.startsWith('ngpus=')) {
            gpu = this.parseResourceValue(part.split('=')[1]);
          } else if (part.startsWith('mem=')) {
            ram = this.parseMemoryValue(part.split('=')[1]);
          } else if (part.startsWith('scratch_local=')) {
            scratch = this.parseMemoryValue(part.split('=')[1]);
            scratchType = 'local';
          } else if (part.startsWith('scratch_ssd=')) {
            scratch = this.parseMemoryValue(part.split('=')[1]);
            scratchType = 'ssd';
          } else if (part.startsWith('scratch_volume=')) {
            scratch = this.parseMemoryValue(part.split('=')[1]);
            scratchType = 'volume';
          }
        }

        if (machine) {
          allocatedResources.push({
            machine,
            cpu,
            gpu,
            ram,
            scratch,
            scratchType,
          });
        }
      }
    }

    // Extract environment variables (all PBS_* and TORQUE_* variables)
    const environmentVariables: Record<string, string> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (
        key.startsWith('PBS_') ||
        key.startsWith('TORQUE_') ||
        key.startsWith('SCRATCH') ||
        key.startsWith('SINGULARITY_')
      ) {
        environmentVariables[key] = value;
      }
    }

    // Find subjobs (array jobs)
    const subjobs: SubjobDTO[] | null = this.findSubjobs(job, pbsData);

    // Generate custom messages
    const messages: JobMessageDTO[] = this.generateMessages(
      state,
      cpuUsagePercentPerCpu,
      gpuUsagePercentPerGpu,
      memoryUsagePercent,
      cpuReserved,
      gpuReserved,
      memoryReserved,
      memoryUsed,
      walltimeReserved,
      runtime,
    );

    // Parse exit code
    const exitCode = attrs['Exit_status']
      ? parseInt(attrs['Exit_status'], 10)
      : null;

    // Get state info
    const stateInfo = getJobStateFromPbsState(state, exitCode);

    return {
      id: job.name,
      name: attrs['Job_Name'] || job.name,
      state,
      stateName: stateInfo.name,
      stateColor: stateInfo.color,
      owner,
      username,
      canSeeOwner: true, // Will be overridden in getJobDetail based on user context
      queue: attrs['queue'] || null,
      server: attrs['server'] || null,
      node,
      requestedResources,
      cpuReserved,
      gpuReserved,
      memoryReserved,
      walltimeReserved,
      scratchReserved,
      cpuTimeUsed,
      gpuTimeUsed,
      memoryUsed,
      runtime,
      cpuUsagePercent,
      cpuUsagePercentPerCpu,
      gpuUsagePercent,
      gpuUsagePercentPerGpu,
      memoryUsagePercent,
      createdAt,
      eligibleAt,
      startedAt,
      obitAt,
      completedBy,
      lastStateChangeAt,
      kerberosTicketAt,
      stdoutDirectory: attrs['Output_Path']?.split(':')[0] || null,
      workingDirectory: attrs['PBS_O_WORKDIR'] || null,
      scratchDirectory: attrs['SCRATCHDIR'] || null,
      comment: attrs['comment'] || null,
      exitCode,
      allocatedResources,
      environmentVariables,
      subjobs,
      messages,
      rawAttributes: attrs, // Include all raw PBS attributes
    };
  }

  /**
   * Find subjobs for array jobs
   */
  private findSubjobs(job: PbsJob, pbsData: PbsData): SubjobDTO[] | null {
    const attrs = job.attributes;
    const jobId = job.name;

    // Check if this is an array job (format: "14699148[].pbs-m1.metacentrum.cz")
    const arrayMatch = jobId.match(/^(\d+)\[\]/);
    if (!arrayMatch) {
      return null;
    }

    const baseJobId = arrayMatch[1];
    const subjobs: SubjobDTO[] = [];

    // Find all subjobs across all servers
    for (const serverData of Object.values(pbsData.servers)) {
      if (serverData.jobs?.items) {
        for (const subjob of serverData.jobs.items) {
          // Match subjob format: "14699148[96].pbs-m1.metacentrum.cz"
          const subjobMatch = subjob.name.match(
            new RegExp(`^${baseJobId}\\[(\\d+)\\]`),
          );
          if (subjobMatch) {
            const subAttrs = subjob.attributes;
            const subState = subAttrs['job_state'] || 'U';

            // Parse resources
            const cpuReserved = this.parseResourceValue(
              subAttrs['Resource_List.ncpus'] || '0',
            );
            const gpuReserved = this.parseResourceValue(
              subAttrs['Resource_List.ngpus'] || '0',
            );
            const memoryReserved = this.parseMemoryValue(
              subAttrs['Resource_List.mem'] || '0gb',
            );

            // Parse used resources (for running, exiting, and completed jobs: C, F, X)
            const subCompletedStates = ['C', 'F', 'X'];
            const subHasResourceUsage =
              subState === 'R' ||
              subState === 'E' ||
              subCompletedStates.includes(subState);

            const memoryUsed = subHasResourceUsage
              ? subAttrs['resources_used.mem']
                ? this.parseMemoryValue(subAttrs['resources_used.mem'])
                : null
              : null;
            const cpuTimeUsed = subHasResourceUsage
              ? subAttrs['resources_used.cput'] || null
              : null;

            // Get runtime from resources_used.walltime
            const runtime = subHasResourceUsage
              ? subAttrs['resources_used.walltime'] || null
              : null;

            // Get node
            let node: string | null = null;
            if (subAttrs['exec_host']) {
              const firstNode = subAttrs['exec_host'].split('/')[0];
              node = firstNode || null;
            } else if (subAttrs['exec_vnode']) {
              const match = subAttrs['exec_vnode'].match(/\(([^:]+):/);
              if (match) {
                node = match[1];
              }
            }

            const exitCode = subAttrs['Exit_status']
              ? parseInt(subAttrs['Exit_status'], 10)
              : null;

            const subStateInfo = getJobStateFromPbsState(subState, exitCode);

            subjobs.push({
              id: subjob.name,
              state: subState,
              stateName: subStateInfo.name,
              stateColor: subStateInfo.color,
              node,
              cpuReserved,
              gpuReserved,
              memoryReserved,
              memoryUsed,
              cpuTimeUsed,
              runtime,
              exitCode,
            });
          }
        }
      }
    }

    return subjobs.length > 0 ? subjobs : null;
  }

  /**
   * Generate custom messages based on resource usage
   */
  private generateMessages(
    state: string,
    cpuUsagePercentPerCpu: number | null,
    gpuUsagePercentPerGpu: number | null,
    memoryUsagePercent: number | null,
    cpuReserved: number,
    gpuReserved: number,
    memoryReserved: number,
    memoryUsed: number | null,
    walltimeReserved: number | null,
    walltimeUsed: string | null,
  ): JobMessageDTO[] {
    const messages: JobMessageDTO[] = [];

    // Only generate messages for running or finished jobs
    const completedStates = ['C', 'F', 'X'];
    const hasResourceUsage =
      state === 'R' || state === 'E' || completedStates.includes(state);

    if (!hasResourceUsage) {
      return messages;
    }

    // Check CPU efficiency using cpupercent from PBS
    if (cpuUsagePercentPerCpu !== null && cpuUsagePercentPerCpu < 75 && cpuReserved > 0) {
      messages.push({
        type: 'warning',
        message: `CPU usage is below 75% (${cpuUsagePercentPerCpu}%). The job was inefficient. Consider reducing the number of CPUs requested.`,
        code: 'cpuUsageLow',
        params: { percent: cpuUsagePercentPerCpu },
      });
    }

    // Check if walltime is drastically lower than reserved (for finished jobs)
    if (completedStates.includes(state) && walltimeReserved && walltimeUsed) {
      const walltimeUsedSeconds = this.parseTimeToSeconds(walltimeUsed);
      // If actual walltime is less than 50% of reserved, it's drastically lower
      if (walltimeUsedSeconds > 0 && walltimeReserved > 0) {
        const walltimeRatio = walltimeUsedSeconds / walltimeReserved;
        if (walltimeRatio < 0.5) {
          const walltimeUsedFormatted = walltimeUsed;
          const walltimeReservedFormatted =
            this.formatTimeFromSeconds(walltimeReserved);
          messages.push({
            type: 'error',
            message: `Job finished way sooner than requested. Actual walltime: ${walltimeUsedFormatted}, Reserved: ${walltimeReservedFormatted}. Consider reducing the requested walltime.`,
            code: 'walltimeTooHigh',
            params: {
              walltimeUsed: walltimeUsedFormatted,
              walltimeReserved: walltimeReservedFormatted,
            },
          });
        }
      }
    }

    // Check GPU usage
    if (gpuUsagePercentPerGpu !== null && gpuUsagePercentPerGpu < 75 && gpuReserved > 0) {
      messages.push({
        type: 'error',
        message: `GPU usage is below 75% (${gpuUsagePercentPerGpu}%). Consider reducing the number of GPUs requested.`,
        code: 'gpuUsageLow',
        params: { percent: gpuUsagePercentPerGpu },
      });
    }

    // Check memory usage
    if (
      memoryUsagePercent !== null &&
      memoryUsagePercent < 75 &&
      memoryReserved > 0
    ) {
      messages.push({
        type: 'warning',
        message: `Memory usage is below 75% (${memoryUsagePercent}%). Consider reducing the amount of memory requested.`,
        code: 'memoryUsageLow',
        params: { percent: memoryUsagePercent },
      });
    }

    // Check if memory is over-allocated
    if (
      memoryUsed !== null &&
      memoryReserved > 0 &&
      memoryUsed > memoryReserved * 1.1
    ) {
      messages.push({
        type: 'error',
        message: `Memory usage (${memoryUsed.toFixed(2)} GB) exceeds reserved memory (${memoryReserved.toFixed(2)} GB).`,
        code: 'memoryOverAllocated',
        params: {
          memoryUsed: memoryUsed.toFixed(2),
          memoryReserved: memoryReserved.toFixed(2),
        },
      });
    }

    return messages;
  }

  /**
   * Format seconds to HH:MM:SS
   */
  private formatTimeFromSeconds(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
