import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { AccountingConfig } from '@/config/accounting.config';
import { DataCollectionService } from '@/modules/data-collection/data-collection.service';
import { UserContext, UserRole } from '@/common/types/user-context.types';
import { UserInfoDTO, UserUsageDTO } from './dto/user-info.dto';
import { OutageRecordDTO } from './dto/outage-record.dto';
import { CanonicalOrgNameDTO } from './dto/org-name.dto';
import { ArchivedJobDTO, ArchivedJobsListDTO } from './dto/archived-job.dto';

export type ArchivedJobsRange = '24h' | '48h' | 'week' | 'month';

export interface ArchivedJobsParams {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
  lastCount?: number;
  range?: ArchivedJobsRange;
  search?: string;
  username?: string;
  job?: string;
  name?: string;
  queue?: string;
  pbsServer?: string;
  cpusFrom?: number;
  cpusTo?: number;
  gpusFrom?: number;
  gpusTo?: number;
  walltimeFrom?: string;
  walltimeTo?: string;
  runtimeFrom?: string;
  runtimeTo?: string;
  recordFrom?: Date;
  recordTo?: Date;
  createdFrom?: Date;
  createdTo?: Date;
  startedFrom?: Date;
  startedTo?: Date;
}

// Whitelist of sortable columns - the sort value is put into SQL directly
const ARCHIVE_SORT_COLUMNS: Record<string, string> = {
  id: 'id_string',
  cpus: 'cpus',
  name: 'jobname',
  queue: 'queue',
  username: 'username',
  pbsServer: 'server_hostname',
  recordTime: 'date_time',
  createdAt: 'create_time',
  startedAt: 'start_time',
  endedAt: 'end_time',
  walltime: 'walltime',
  exitStatus: 'exit_status',
  // Live job list (My Jobs) sort keys, so archived jobs can be merged with live ones.
  // 'state' and 'node' are constant for archived jobs (Archived / no node), so any
  // order is consistent with the merge - fall back to the record time.
  owner: 'username',
  cpuReserved: 'cpus',
  gpuReserved: 'req_gpus',
  memoryReserved: 'memory_reserved',
  state: 'date_time',
  node: 'date_time',
};

const ARCHIVE_RANGE_MS: Record<ArchivedJobsRange, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class AccountingService implements OnModuleDestroy {
  private readonly logger = new Logger(AccountingService.name);
  private pool: Pool | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataCollectionService: DataCollectionService,
  ) {
    const accountingConfig =
      this.configService.get<AccountingConfig>('accounting');
    if (accountingConfig?.connectionString) {
      try {
        // Ensure SSL mode is set if not already specified in connection string
        const connectionString = this.ensureSslMode(
          accountingConfig.connectionString,
        );
        this.pool = new Pool({
          connectionString,
        });
        this.logger.log('Accounting database connection pool initialized');
      } catch (error) {
        this.logger.warn(
          'Failed to initialize accounting database connection pool',
          error,
        );
        this.pool = null;
      }
    } else {
      this.logger.warn(
        'ACCOUNTING_CONNECTION_STRING not set - accounting database features disabled',
      );
    }
  }

  /**
   * Ensure SSL mode is set in connection string
   * If sslmode is not specified, defaults to 'require'
   * If sslmode is explicitly set, it will be preserved
   */
  private ensureSslMode(connectionString: string): string {
    try {
      const url = new URL(connectionString);
      const params = url.searchParams;

      // If sslmode is not set, add it as 'require'
      if (!params.has('sslmode')) {
        params.set('sslmode', 'require');
        url.search = params.toString();
        this.logger.debug(
          'SSL mode not specified in connection string, defaulting to require',
        );
        return url.toString();
      }

      return connectionString;
    } catch (error) {
      // If URL parsing fails, try to append sslmode manually
      // This handles cases where the connection string might not be a full URL
      if (connectionString.includes('?')) {
        if (!connectionString.includes('sslmode=')) {
          return `${connectionString}&sslmode=require`;
        }
      } else {
        if (!connectionString.includes('sslmode=')) {
          return `${connectionString}?sslmode=require`;
        }
      }
      return connectionString;
    }
  }

  /**
   * Check if database connection is available
   */
  private isDatabaseAvailable(): boolean {
    return this.pool !== null;
  }

  /**
   * Check if user has access to view another user's accounting info
   * Admin can see all users, non-admin can see themselves and users from their groups
   */
  private checkUserAccess(
    requestedUsername: string,
    userContext: UserContext,
  ): void {
    // Admin can access all users
    if (userContext.role === UserRole.ADMIN) {
      return;
    }

    const usernameBase = userContext.username.split('@')[0];
    const requestedUsernameBase = requestedUsername.split('@')[0];

    // Always allow access to themselves
    if (
      userContext.username === requestedUsername ||
      usernameBase === requestedUsernameBase
    ) {
      return;
    }

    // Check if the requested user is in the same groups (excluding system-wide groups)
    const perunData = this.dataCollectionService.getPerunData();
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
      !allowedUsernames.has(requestedUsername) &&
      !allowedUsernames.has(requestedUsernameBase)
    ) {
      throw new NotFoundException(`User '${requestedUsername}' was not found`);
    }
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

  /**
   * Get user info by username
   * Returns null if database is not available
   * Throws NotFoundException if user doesn't have access
   */
  async getUserInfoByName(
    userName: string,
    userContext: UserContext,
  ): Promise<UserInfoDTO | null> {
    // Check access control first
    this.checkUserAccess(userName, userContext);
    if (!this.isDatabaseAvailable()) {
      this.logger.debug(
        `getUserInfoByName(${userName}) - database not available`,
      );
      return null;
    }

    this.logger.debug(`getUserInfoByName(${userName})`);

    try {
      // Get total job count and CPU time
      const userInfoQuery = `
        SELECT count(*), sum(used_walltime * used_ncpus)
        FROM acct_user u, acct_pbs_record p
        WHERE user_name = $1 AND u.acct_user_id = p.acct_user_id
      `;

      const userInfoResult = await this.pool!.query(userInfoQuery, [userName]);

      if (
        !userInfoResult.rows ||
        userInfoResult.rows.length === 0 ||
        !userInfoResult.rows[0]
      ) {
        return {
          jobCount: 0,
          totalCpuTime: 0,
          usages: [],
        };
      }

      const row = userInfoResult.rows[0];
      const jobCount = parseInt(row.count || '0', 10);
      const totalCpuTime = parseFloat(row.sum || '0');

      // Get yearly usage breakdown
      const usageQuery = `
        SELECT 
          count(*),
          sum(j.used_walltime * j.used_ncpus) as cpu_time,
          extract(year FROM to_timestamp(j.end_time)) as yearnum
        FROM acct_user u, acct_pbs_record j
        WHERE u.user_name = $1 AND u.acct_user_id = j.acct_user_id
        GROUP BY yearnum
        ORDER BY yearnum
      `;

      const usageResult = await this.pool!.query(usageQuery, [userName]);

      const usages: UserUsageDTO[] = (usageResult.rows || []).map((row) => ({
        year: parseInt(row.yearnum || '0', 10),
        jobCount: parseInt(row.count || '0', 10),
        cpuTime: parseFloat(row.cpu_time || '0'),
      }));

      return {
        jobCount,
        totalCpuTime,
        usages,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error getting user info for ${userName}: ${errorMessage}`,
      );

      // Provide helpful error message for SSL-related errors
      if (
        errorMessage.includes('no pg_hba.conf entry') ||
        errorMessage.includes('no encryption')
      ) {
        this.logger.warn(
          'Database connection requires SSL. Ensure your connection string includes sslmode=require or update ACCOUNTING_CONNECTION_STRING',
        );
      }

      return null;
    }
  }

  /**
   * Get outages for a node
   * Returns empty array if database is not available
   */
  async getOutagesForNode(nodeName: string): Promise<OutageRecordDTO[]> {
    if (!this.isDatabaseAvailable()) {
      this.logger.debug(
        `getOutagesForNode(${nodeName}) - database not available`,
      );
      return [];
    }

    try {
      const query = `
        SELECT hostname, type, start_time, end_time, comment
        FROM acct_host h, acct_outages o
        WHERE h.hostname = $1 AND h.acct_host_id = o.acct_host_id
        ORDER BY o.start_time DESC
      `;

      const result = await this.pool!.query(query, [nodeName]);

      return (result.rows || []).map((row) => ({
        hostname: row.hostname || '',
        type: row.type || '',
        startTime: row.start_time ? new Date(row.start_time) : null,
        endTime: row.end_time ? new Date(row.end_time) : null,
        comment: row.comment || null,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting outages for node ${nodeName}:`,
        error instanceof Error ? error.stack : error,
      );
      return [];
    }
  }

  /**
   * Get list of started job IDs
   * Returns empty array if database is not available
   */
  async getStartedJobIds(): Promise<string[]> {
    if (!this.isDatabaseAvailable()) {
      this.logger.debug('getStartedJobIds() - database not available');
      return [];
    }

    this.logger.debug('getStartedJobIds()');

    try {
      const query = `
        SELECT acct_id_string
        FROM acct_pbs_record_started
        ORDER BY acct_id_string
      `;

      const result = await this.pool!.query(query);

      return (result.rows || []).map((row) => row.acct_id_string || '');
    } catch (error) {
      this.logger.error(
        'Error getting started job IDs:',
        error instanceof Error ? error.stack : error,
      );
      return [];
    }
  }

  /**
   * Get canonical organization names
   * Returns empty array if database is not available
   */
  async getCanonicalOrgNames(): Promise<CanonicalOrgNameDTO[]> {
    if (!this.isDatabaseAvailable()) {
      this.logger.debug('getCanonicalOrgNames() - database not available');
      return [];
    }

    try {
      const query = `
        SELECT user_org, name, akademie
        FROM org_names
        ORDER BY name
      `;

      const result = await this.pool!.query(query);

      return (result.rows || []).map((row) => ({
        user_org: row.user_org || '',
        name: row.name || '',
        akademie: row.akademie || null,
      }));
    } catch (error) {
      this.logger.error(
        'Error getting canonical org names:',
        error instanceof Error ? error.stack : error,
      );
      return [];
    }
  }

  /**
   * Get finished jobs from accounting records (paginated, sorted, filtered)
   * Returns empty list if database is not available
   * Note: acct_pbs_record.date_time is in milliseconds, other times in seconds
   */
  async getArchivedJobs(
    params: ArchivedJobsParams,
  ): Promise<{ data: ArchivedJobsListDTO; totalCount: number }> {
    const empty = { data: { jobs: [] }, totalCount: 0 };
    if (!this.isDatabaseAvailable()) {
      this.logger.debug('getArchivedJobs() - database not available');
      return empty;
    }

    const conditions: string[] = [];
    const values: unknown[] = [];
    const addCondition = (sql: string, value: unknown) => {
      values.push(value);
      conditions.push(sql.replace('?', `$${values.length}`));
    };

    // Case-insensitive substring search across text columns,
    // wildcards in the search term are matched literally
    const search = params.search?.trim();
    if (search) {
      values.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
      const param = `$${values.length}`;
      conditions.push(
        '(' +
          ['u.user_name', 'p.acct_id_string', 'p.jobname', 'p.queue', 's.hostname']
            .map((column) => `${column} ILIKE ${param}`)
            .join(' OR ') +
          ')',
      );
    }
    if (params.username) {
      addCondition('u.user_name = ?', params.username);
    }
    if (params.job) {
      addCondition('p.acct_id_string LIKE ?', params.job);
    }
    if (params.name) {
      addCondition('p.jobname LIKE ?', params.name);
    }
    if (params.queue) {
      addCondition('p.queue LIKE ?', params.queue);
    }
    if (params.pbsServer) {
      addCondition('s.hostname LIKE ?', params.pbsServer);
    }
    if (params.range) {
      addCondition(
        'p.date_time >= ?',
        Date.now() - ARCHIVE_RANGE_MS[params.range],
      );
    }
    if (params.recordFrom) {
      addCondition('p.date_time >= ?', params.recordFrom.getTime());
    }
    if (params.recordTo) {
      addCondition('p.date_time <= ?', params.recordTo.getTime());
    }
    if (params.createdFrom) {
      addCondition('p.create_time >= ?', this.toEpochSeconds(params.createdFrom));
    }
    if (params.createdTo) {
      addCondition('p.create_time <= ?', this.toEpochSeconds(params.createdTo));
    }
    if (params.startedFrom) {
      addCondition('p.start_time >= ?', this.toEpochSeconds(params.startedFrom));
    }
    if (params.startedTo) {
      addCondition('p.start_time <= ?', this.toEpochSeconds(params.startedTo));
    }
    if (params.cpusFrom !== undefined) {
      addCondition('p.used_ncpus >= ?', params.cpusFrom);
    }
    if (params.cpusTo !== undefined) {
      addCondition('p.used_ncpus <= ?', params.cpusTo);
    }
    if (params.gpusFrom !== undefined) {
      addCondition('p.req_gpus >= ?', params.gpusFrom);
    }
    if (params.gpusTo !== undefined) {
      addCondition('p.req_gpus <= ?', params.gpusTo);
    }
    if (params.walltimeFrom) {
      addCondition('p.req_walltime >= ?', this.walltimeToSeconds(params.walltimeFrom));
    }
    if (params.walltimeTo) {
      addCondition('p.req_walltime <= ?', this.walltimeToSeconds(params.walltimeTo));
    }
    if (params.runtimeFrom) {
      addCondition('p.used_walltime >= ?', this.walltimeToSeconds(params.runtimeFrom));
    }
    if (params.runtimeTo) {
      addCondition('p.used_walltime <= ?', this.walltimeToSeconds(params.runtimeTo));
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // "Last N records" limits the matching set to the N most recent records
    // before sorting and pagination are applied
    let lastCountLimit = '';
    if (params.lastCount) {
      values.push(params.lastCount);
      lastCountLimit = `ORDER BY p.date_time DESC LIMIT $${values.length}`;
    }

    const records = `
      SELECT p.acct_id_string AS id_string, p.date_time, p.jobname, p.queue,
             u.user_name AS username, p.used_ncpus AS cpus,
             p.create_time, p.start_time, p.end_time, p.exit_status,
             p.req_walltime AS walltime, p.used_walltime AS runtime,
             p.used_cpupercent AS cpupercent,
             p.req_mem AS memory_reserved, p.used_mem AS memory_used,
             p.req_gpus AS req_gpus, p.used_gpupercent AS gpupercent,
             p.req_nodes AS req_nodes,
             s.hostname AS server_hostname
      FROM acct_pbs_record p
        NATURAL LEFT JOIN ci_acct_pbs_server s
        NATURAL LEFT JOIN acct_user u
      ${where}
      ${lastCountLimit}
    `;

    const sortColumn = ARCHIVE_SORT_COLUMNS[params.sort] ?? 'end_time';
    const sortOrder = params.order === 'asc' ? 'ASC' : 'DESC';
    const offset = (params.page - 1) * params.limit;

    try {
      const countResult = await this.pool!.query(
        `SELECT count(*) FROM (${records}) r`,
        values,
      );
      const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

      const listValues = [...values, params.limit, offset];
      const result = await this.pool!.query(
        `SELECT * FROM (${records}) r
         ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
         LIMIT $${listValues.length - 1} OFFSET $${listValues.length}`,
        listValues,
      );

      const jobs: ArchivedJobDTO[] = (result.rows || []).map((row) => ({
        id: row.id_string || '',
        cpus: this.toNumber(row.cpus) ?? 0,
        name: row.jobname || '',
        queue: row.queue || '',
        username: row.username || null,
        pbsServer: row.server_hostname || null,
        recordTime: this.toNumber(row.date_time) !== null
          ? Math.floor(this.toNumber(row.date_time)! / 1000)
          : null,
        createdAt: this.toNumber(row.create_time),
        startedAt: this.toNumber(row.start_time),
        endedAt: this.toNumber(row.end_time),
        requestedResources: row.req_nodes || null,
        memoryReserved: this.toNumber(row.memory_reserved),
        memoryUsed: this.toNumber(row.memory_used),
        gpuReserved: this.toNumber(row.req_gpus),
        gpupercent: this.toNumber(row.gpupercent),
        runtime: this.toNumber(row.runtime),
        walltime: this.toNumber(row.walltime),
        cpupercent: this.toNumber(row.cpupercent),
        exitStatus: this.toNumber(row.exit_status),
      }));

      return { data: { jobs }, totalCount };
    } catch (error) {
      this.logger.error(
        'Error getting archived jobs:',
        error instanceof Error ? error.stack : error,
      );
      return empty;
    }
  }

  private toEpochSeconds(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }

  // pg returns bigint/numeric columns as strings
  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  /**
   * Convert walltime "H:MM:SS" (or "MM:SS" / "SS") to seconds
   */
  private walltimeToSeconds(walltime: string): number {
    const parts = walltime.trim().split(':');
    if (parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) {
      throw new BadRequestException(
        `Invalid walltime '${walltime}', expected H:MM:SS`,
      );
    }
    return parts.reduce((total, part) => total * 60 + parseInt(part, 10), 0);
  }

  /**
   * Cleanup database connection pool on module destroy
   */
  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Accounting database connection pool closed');
    }
  }
}
