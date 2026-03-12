import {
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
   * Cleanup database connection pool on module destroy
   */
  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Accounting database connection pool closed');
    }
  }
}
