import { Injectable, NotFoundException } from '@nestjs/common';
import { DataCollectionService } from '@/modules/data-collection/data-collection.service';
import {
  PbsQueue,
  PbsReservation,
  PbsNode,
} from '@/modules/data-collection/types/pbs.types';
import {
  QueueListDTO,
  QueuesListDTO,
  QueueAclUserDTO,
} from './dto/queue-list.dto';
import {
  QueueDetailDTO,
  QueueStateCountDTO,
  QueueAclDTO,
  QueueAclGroupDTO,
  QueueResourcesDTO,
  QueueReservationDTO,
} from './dto/queue-detail.dto';
import { UserContext, UserRole } from '@/common/types/user-context.types';

// Re-export for convenience
export type { UserContext };

@Injectable()
export class QueuesService {
  constructor(private readonly dataCollectionService: DataCollectionService) {}

  /**
   * Get list of all queues in hierarchical structure
   * @param userContext User context for access control
   * @param serverName Optional server name filter. If not provided, returns queues from all servers.
   * @param targetUsername Optional username to check access for. If provided, checks access for this user instead of the current user context.
   */
  getQueuesList(
    userContext: UserContext,
    serverName?: string,
    targetUsername?: string,
    qType?: string,
  ): QueuesListDTO {
    const pbsData = this.dataCollectionService.getPbsData();

    if (!pbsData?.servers) {
      return {
        queues: [],
      };
    }

    if (serverName) {
      const serverData = pbsData.servers[serverName];
      if (!serverData?.queues?.items) {
        return {
          queues: [],
        };
      }
      return this.buildQueuesListFromQueues(
        serverData.queues.items,
        userContext,
        serverName,
        undefined,
        targetUsername,
        qType,
      );
    }

    const allQueues: PbsQueue[] = [];
    const queueToServerMap = new Map<string, string>();
    for (const [serverNameKey, serverData] of Object.entries(pbsData.servers)) {
      if (serverData.queues?.items) {
        for (const queue of serverData.queues.items) {
          allQueues.push(queue);
          queueToServerMap.set(queue.name, serverNameKey);
        }
      }
    }

    if (allQueues.length === 0) {
      return {
        queues: [],
      };
    }

    return this.buildQueuesListFromQueues(
      allQueues,
      userContext,
      undefined,
      queueToServerMap,
      targetUsername,
      qType,
    );
  }

  /**
   * Build queues list from a collection of queues
   */
  private buildQueuesListFromQueues(
    queues: PbsQueue[],
    userContext: UserContext,
    serverName?: string,
    queueToServerMap?: Map<string, string>,
    targetUsername?: string,
    qType?: string,
  ): QueuesListDTO {
    // Build queue map and parent-child relationships
    const queueMap = new Map<string, PbsQueue>();
    const parentMap = new Map<string, string[]>(); // child -> parents
    const childMap = new Map<string, string[]>(); // parent -> children

    // Build maps
    for (const queue of queues) {
      queueMap.set(queue.name, queue);

      if (queue.attributes.queue_type === 'Route') {
        const destinations = this.parseRouteDestinations(queue);
        for (const destination of destinations) {
          // Add parent relationship
          if (!parentMap.has(destination)) {
            parentMap.set(destination, []);
          }
          parentMap.get(destination)!.push(queue.name);

          // Add child relationship
          if (!childMap.has(queue.name)) {
            childMap.set(queue.name, []);
          }
          childMap.get(queue.name)!.push(destination);
        }
      }
    }

    // Find root queues (queues with no Route queue parents)
    const rootQueues: PbsQueue[] = [];
    for (const queue of queues) {
      const parents = parentMap.get(queue.name) || [];
      // Check if any parent is a Route queue
      const hasRouteParent = parents.some((parentName) => {
        const parentQueue = queueMap.get(parentName);
        return parentQueue?.attributes.queue_type === 'Route';
      });

      // Root queue if it's a Route queue with no Route parents, or Execution queue with no Route parents
      if (!hasRouteParent) {
        rootQueues.push(queue);
      }
    }

    // Build hierarchical structure recursively
    const buildQueueTree = (queue: PbsQueue): QueueListDTO | null => {
      // Check if target user has access to this queue
      const hasAccess = this.checkQueueAccess(
        queue,
        userContext,
        targetUsername,
      );

      // If filtering by target user and they don't have access, exclude this queue and its children
      if (targetUsername && !hasAccess) {
        return null;
      }

      const children = childMap.get(queue.name) || [];
      const childQueues = children
        .map((childName) => queueMap.get(childName))
        .filter((q): q is PbsQueue => q !== undefined)
        .map((q) => buildQueueTree(q))
        .filter((q): q is QueueListDTO => q !== null); // Filter out null children

      // Sort children: Route queues first, then by priority (higher first), then by name
      childQueues.sort((a, b) => {
        if (a.queueType !== b.queueType) {
          return a.queueType === 'Route' ? -1 : 1;
        }
        const priorityA = a.priority ?? 0;
        const priorityB = b.priority ?? 0;
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }
        return a.name.localeCompare(b.name);
      });

      // Determine server name for this queue
      const queueServerName =
        serverName || queueToServerMap?.get(queue.name) || null;

      return this.mapQueueToList(
        queue,
        userContext,
        childQueues,
        queueServerName,
        targetUsername,
      );
    };

    // Build tree for each root queue and filter out null results
    const rootQueueDTOs = rootQueues
      .map((queue) => buildQueueTree(queue))
      .filter((q): q is QueueListDTO => q !== null)
      .filter((q) => !qType ||
        q.hasReservation && qType == 'reservation' ||
        !q.hasReservation && qType == 'non-reservation');

    // Sort root queues: Route queues first, then by priority (higher first), then by name
    rootQueueDTOs.sort((a, b) => {
      if (a.queueType !== b.queueType) {
        return a.queueType === 'Route' ? -1 : 1;
      }
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      queues: rootQueueDTOs,
    };
  }

  /**
   * Get queue detail by name
   * @param name Queue name
   * @param userContext User context for access control
   * @param serverName Optional server name filter. If not provided, searches all servers.
   */
  getQueueDetail(
    name: string,
    userContext: UserContext,
    serverName?: string,
  ): QueueDetailDTO {
    const pbsData = this.dataCollectionService.getPbsData();

    if (!pbsData?.servers) {
      throw new NotFoundException(`Queue '${name}' was not found`);
    }

    // If server name is provided, only search in that server
    if (serverName) {
      const serverData = pbsData.servers[serverName];
      if (!serverData?.queues?.items) {
        throw new NotFoundException(`Queue '${name}' was not found`);
      }

      const queue = serverData.queues.items.find((q) => q.name === name);
      if (!queue) {
        throw new NotFoundException(`Queue '${name}' was not found`);
      }

      return this.buildQueueDetailFromQueues(
        queue,
        serverData.queues.items,
        userContext,
        serverName,
      );
    }

    // Search across all servers
    let queue: PbsQueue | undefined;
    let queues: PbsQueue[] = [];
    let foundServerName: string | undefined;
    for (const [serverKey, serverData] of Object.entries(pbsData.servers)) {
      if (serverData.queues?.items) {
        const foundQueue = serverData.queues.items.find((q) => q.name === name);
        if (foundQueue) {
          queue = foundQueue;
          queues = serverData.queues.items;
          foundServerName = serverKey;
          break;
        }
      }
    }

    if (!queue) {
      throw new NotFoundException(`Queue '${name}' was not found`);
    }

    return this.buildQueueDetailFromQueues(
      queue,
      queues,
      userContext,
      foundServerName,
    );
  }

  /**
   * Build queue detail from queue and queues collection
   */
  private buildQueueDetailFromQueues(
    queue: PbsQueue,
    queues: PbsQueue[],
    userContext: UserContext,
    serverName?: string,
  ): QueueDetailDTO {
    // Build parent-child relationships
    const queueMap = new Map<string, PbsQueue>();
    const parentMap = new Map<string, string[]>();
    const childMap = new Map<string, string[]>();

    for (const q of queues) {
      queueMap.set(q.name, q);

      if (q.attributes.queue_type === 'Route') {
        const destinations = this.parseRouteDestinations(q);
        for (const destination of destinations) {
          if (!parentMap.has(destination)) {
            parentMap.set(destination, []);
          }
          parentMap.get(destination)!.push(q.name);

          if (!childMap.has(q.name)) {
            childMap.set(q.name, []);
          }
          childMap.get(q.name)!.push(destination);
        }
      }
    }

    const parents = parentMap.get(queue.name) || [];
    // A queue can have only one parent, take the first one
    const parent = parents.length > 0 ? parents[0] : null;
    const childNames = childMap.get(queue.name) || [];

    // Build children recursively
    const buildChildDetail = (childName: string): QueueDetailDTO => {
      const childQueue = queueMap.get(childName);
      if (!childQueue) {
        throw new NotFoundException(`Child queue '${childName}' was not found`);
      }
      const childParents = parentMap.get(childName) || [];
      const childParent = childParents.length > 0 ? childParents[0] : null;
      const childChildNames = childMap.get(childName) || [];
      const childChildren = childChildNames
        .map((name) => queueMap.get(name))
        .filter((q): q is PbsQueue => q !== undefined)
        .map((q) => buildChildDetail(q.name));

      return this.mapQueueToDetail(
        childQueue,
        userContext,
        childParent,
        childChildNames,
        queueMap,
        childChildren,
        serverName,
      );
    };

    const children = childNames
      .map((childName) => queueMap.get(childName))
      .filter((q): q is PbsQueue => q !== undefined)
      .map((q) => buildChildDetail(q.name));

    // Sort children
    children.sort((a, b) => {
      if (a.queueType !== b.queueType) {
        return a.queueType === 'Route' ? -1 : 1;
      }
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return a.name.localeCompare(b.name);
    });

    return this.mapQueueToDetail(
      queue,
      userContext,
      parent,
      childNames,
      queueMap,
      children,
      serverName,
    );
  }

  /**
   * Parse route destinations from queue attributes
   */
  private parseRouteDestinations(queue: PbsQueue): string[] {
    const destinations = queue.attributes.route_destinations;
    if (!destinations) {
      return [];
    }
    return destinations
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
  }

  /**
   * Map PBS queue to list DTO with children
   */
  private mapQueueToList(
    queue: PbsQueue,
    userContext: UserContext,
    children: QueueListDTO[] = [],
    serverName?: string | null,
    targetUsername?: string,
  ): QueueListDTO {
    const priority = queue.attributes.Priority
      ? parseInt(queue.attributes.Priority, 10)
      : null;

    const totalJobs = queue.attributes.total_jobs
      ? parseInt(queue.attributes.total_jobs, 10)
      : null;

    const minWalltime = queue.attributes['resources_min.walltime'] || null;
    const maxWalltime = queue.attributes['resources_max.walltime'] || null;

    const enabled = queue.attributes.enabled === 'True';
    const started = queue.attributes.started === 'True';

    const hasAccess = this.checkQueueAccess(queue, userContext, targetUsername);

    const canBeDirectlySubmitted = queue.attributes.from_route_only !== 'True';

    const stateCount = this.parseStateCount(queue.attributes.state_count);

    const fairshare = queue.attributes.fairshare_tree || null;

    // Parse max_run format: "[u:PBS_GENERIC=5]" -> extract 5
    let maximumForUser: number | null = null;
    if (queue.attributes.max_run) {
      const match = queue.attributes.max_run.match(/=\s*(\d+)/);
      if (match) {
        maximumForUser = parseInt(match[1], 10);
      }
    }

    // Extract ACL groups for tooltip display
    const aclGroups =
      queue.attributes.acl_group_enable === 'True' &&
      queue.attributes.acl_groups
        ? queue.attributes.acl_groups.split(',').map((g) => g.trim())
        : null;

    // Extract ACL users and resolve their names from Perun data
    const aclUsers = this.getAclUsers(queue, userContext);

    // Check if queue has a reservation
    const hasReservation = this.checkQueueHasReservation(queue, serverName);
    const reservation = hasReservation
      ? this.parseReservation(queue, serverName ?? undefined, userContext)
      : null;

    return {
      name: queue.name,
      server: serverName || null,
      queueType: queue.attributes.queue_type as 'Execution' | 'Route',
      priority,
      totalJobs,
      stateCount,
      fairshare,
      maximumForUser,
      minWalltime,
      maxWalltime,
      enabled,
      started,
      hasAccess,
      canBeDirectlySubmitted,
      aclGroups,
      aclUsers,
      hasReservation,
      reservation,
      children: children.length > 0 ? children : undefined,
    };
  }

  /**
   * Map PBS queue to detail DTO with children and parent
   */
  private mapQueueToDetail(
    queue: PbsQueue,
    userContext: UserContext,
    parent: string | null = null,
    childNames: string[] = [],
    queueMap?: Map<string, PbsQueue>,
    children?: QueueDetailDTO[],
    serverName?: string,
  ): QueueDetailDTO {
    const priority = queue.attributes.Priority
      ? parseInt(queue.attributes.Priority, 10)
      : null;

    const totalJobs = queue.attributes.total_jobs
      ? parseInt(queue.attributes.total_jobs, 10)
      : null;

    const enabled = queue.attributes.enabled === 'True';
    const started = queue.attributes.started === 'True';

    const stateCount = this.parseStateCount(queue.attributes.state_count);
    const acl = this.parseAcl(queue, userContext);
    const resources = this.parseResources(queue);
    const reservation = this.parseReservation(queue, serverName, userContext);

    // Get additional attributes (exclude already mapped ones)
    const excludedKeys = new Set([
      'queue_type',
      'Priority',
      'total_jobs',
      'state_count',
      'enabled',
      'started',
      'route_destinations',
      'acl_user_enable',
      'acl_users',
      'acl_group_enable',
      'acl_groups',
      'acl_host_enable',
      'acl_hosts',
      'resources_min.mem',
      'resources_min.ncpus',
      'resources_min.ngpus',
      'resources_min.walltime',
      'resources_max.ncpus',
      'resources_max.ngpus',
      'resources_max.walltime',
      'resources_default.walltime',
      'resources_default.ncpus',
      'resources_default.ngpus',
      'resources_assigned.mem',
      'resources_assigned.ncpus',
      'resources_assigned.ngpus',
      'resources_assigned.nodect',
    ]);

    const additionalAttributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(queue.attributes)) {
      if (!excludedKeys.has(key)) {
        additionalAttributes[key] = value;
      }
    }

    return {
      name: queue.name,
      server: serverName || null,
      queueType: queue.attributes.queue_type as 'Execution' | 'Route',
      priority,
      totalJobs,
      stateCount,
      enabled,
      started,
      hasAccess: this.checkQueueAccess(queue, userContext),
      acl,
      resources,
      reservation,
      children: children && children.length > 0 ? children : null,
      parent: parent,
      additionalAttributes:
        Object.keys(additionalAttributes).length > 0
          ? additionalAttributes
          : null,
    };
  }

  /**
   * Parse state count from state_count string
   * Format: "Transit:0 Queued:0 Held:0 Waiting:0 Running:0 Exiting:0 Begun:0 "
   */
  private parseStateCount(stateCountStr?: string): QueueStateCountDTO | null {
    if (!stateCountStr) {
      return null;
    }

    const parseValue = (prefix: string): number => {
      const regex = new RegExp(`${prefix}:(\\d+)`);
      const match = stateCountStr.match(regex);
      return match ? parseInt(match[1], 10) : 0;
    };

    return {
      transit: parseValue('Transit'),
      queued: parseValue('Queued'),
      held: parseValue('Held'),
      waiting: parseValue('Waiting'),
      running: parseValue('Running'),
      exiting: parseValue('Exiting'),
      begun: parseValue('Begun'),
    };
  }

  /**
   * Parse ACL information from queue attributes
   * @param queue PBS queue
   * @param userContext User context for access control and anonymization
   */
  private parseAcl(
    queue: PbsQueue,
    userContext: UserContext,
  ): QueueAclDTO | null {
    const userEnable = queue.attributes.acl_user_enable === 'True';
    const groupEnable = queue.attributes.acl_group_enable === 'True';
    const hostEnable = queue.attributes.acl_host_enable === 'True';

    if (!userEnable && !groupEnable && !hostEnable) {
      return null;
    }

    const acl: QueueAclDTO = {};

    if (userEnable && queue.attributes.acl_users) {
      // Use the same method to get users with anonymization based on user context
      acl.users = this.getAclUsers(queue, userContext);
    }

    if (groupEnable && queue.attributes.acl_groups) {
      const groupNames = queue.attributes.acl_groups
        .split(',')
        .map((g) => g.trim());

      // Get user's groups to check access
      const userGroups = new Set<string>();
      if (userContext.role !== UserRole.ADMIN) {
        const userGroupsList = this.getUserGroups(userContext.username);
        userGroupsList.forEach((g) => userGroups.add(g));
      }

      acl.groups = groupNames.map((groupName) => {
        const hasAccess =
          userContext.role === UserRole.ADMIN || userGroups.has(groupName);
        return {
          name: groupName,
          hasAccess,
        } as QueueAclGroupDTO;
      });
    }

    if (hostEnable && queue.attributes.acl_hosts) {
      acl.hosts = queue.attributes.acl_hosts.split(',').map((h) => h.trim());
    }

    return acl;
  }

  /**
   * Check if a queue has an associated reservation
   */
  private checkQueueHasReservation(
    queue: PbsQueue,
    serverName?: string | null,
  ): boolean {
    const pbsData = this.dataCollectionService.getPbsData();
    if (!pbsData?.servers) {
      return false;
    }

    // Find the server data
    let serverData = serverName ? pbsData.servers[serverName] : null;
    if (!serverData) {
      // Search across all servers if serverName not provided
      for (const [key, data] of Object.entries(pbsData.servers)) {
        if (data.reservations?.items) {
          const foundReservation = data.reservations.items.find(
            (r) => r.attributes.queue === queue.name,
          );
          if (foundReservation) {
            return true;
          }
        }
      }
      return false;
    }

    if (!serverData.reservations?.items) {
      return false;
    }

    // Check if any reservation is linked to this queue
    return serverData.reservations.items.some(
      (r) => r.attributes.queue === queue.name,
    );
  }

  /**
   * Parse reservation information for a queue
   * Finds reservations linked to this queue and associated nodes
   */
  private parseReservation(
    queue: PbsQueue,
    serverName?: string,
    userContext?: UserContext,
  ): QueueReservationDTO | null {
    const pbsData = this.dataCollectionService.getPbsData();
    if (!pbsData?.servers) {
      return null;
    }

    // Find the server data
    let serverData = serverName ? pbsData.servers[serverName] : null;
    if (!serverData) {
      // Search across all servers if serverName not provided
      for (const [key, data] of Object.entries(pbsData.servers)) {
        if (data.reservations?.items) {
          const foundReservation = data.reservations.items.find(
            (r) => r.attributes.queue === queue.name,
          );
          if (foundReservation) {
            serverData = data;
            serverName = key;
            break;
          }
        }
      }
    }

    if (!serverData?.reservations?.items) {
      return null;
    }

    // Find reservation(s) linked to this queue
    const reservations = serverData.reservations.items.filter(
      (r) => r.attributes.queue === queue.name,
    );

    if (reservations.length === 0) {
      return null;
    }

    // Use the first reservation (typically there's only one per queue)
    const reservation = reservations[0];

    // Check if reservation has started
    // Reservation state 5 typically means "RESV_RUNNING" (started)
    const isStarted = reservation.attributes.reserve_state === '5';

    // Find nodes that have this reservation
    const nodes: string[] = [];
    if (serverData.nodes?.items) {
      for (const node of serverData.nodes.items) {
        const nodeResv = node.attributes.resv;
        if (nodeResv && nodeResv === reservation.name) {
          nodes.push(node.name);
        }
      }
    }

    // Parse authorized users
    const authorizedUsersRaw = reservation.attributes.Authorized_Users
      ? reservation.attributes.Authorized_Users.split(',')
          .map((u) => u.trim())
          .filter(Boolean)
      : null;

    // Check if current user has access to the reservation
    let hasAccess = true;
    if (userContext && authorizedUsersRaw && authorizedUsersRaw.length > 0) {
      if (userContext.role !== UserRole.ADMIN) {
        const usernameBase = userContext.username.split('@')[0];
        // Check if user is in authorized users list
        hasAccess = authorizedUsersRaw.some((authUser) => {
          const authUserBase = authUser.split('@')[0];
          return (
            authUser === userContext.username ||
            authUserBase === usernameBase ||
            authUser === usernameBase
          );
        });
      }
    }

    // Format authorized users with access information
    let authorizedUsers: Array<{
      username: string;
      hasAccess: boolean;
    }> | null = null;
    if (authorizedUsersRaw && authorizedUsersRaw.length > 0) {
      // Get allowed usernames for checking access to each authorized user
      const allowedUsernames = new Set<string>();
      if (userContext) {
        if (userContext.role === UserRole.ADMIN) {
          // Admins can see all users
          authorizedUsersRaw.forEach((u) => {
            const username = u.split('@')[0];
            allowedUsernames.add(u);
            allowedUsernames.add(username);
          });
        } else {
          const usernameBase = userContext.username.split('@')[0];
          allowedUsernames.add(userContext.username);
          allowedUsernames.add(usernameBase);

          // Get users from groups the current user belongs to
          const perunData = this.dataCollectionService.getPerunData();
          const groupMembers = this.getUsersFromUserGroups(
            perunData,
            userContext.username,
          );
          for (const member of groupMembers) {
            allowedUsernames.add(member);
            allowedUsernames.add(member.split('@')[0]);
          }
        }
      }

      authorizedUsers = authorizedUsersRaw.map((authUser) => {
        const username = authUser.split('@')[0];
        const userHasAccess =
          !userContext ||
          userContext.role === UserRole.ADMIN ||
          allowedUsernames.has(authUser) ||
          allowedUsernames.has(username);
        return {
          username,
          hasAccess: userHasAccess,
        };
      });
    }

    // Parse reservation start/end times
    const startTime = reservation.attributes.reserve_start
      ? parseInt(reservation.attributes.reserve_start, 10)
      : null;
    const endTime = reservation.attributes.reserve_end
      ? parseInt(reservation.attributes.reserve_end, 10)
      : null;
    const duration = reservation.attributes.reserve_duration
      ? parseInt(reservation.attributes.reserve_duration, 10)
      : null;

    const owner = reservation.attributes.Reserve_Owner || null;

    // Calculate if current user can see the reservation owner
    let canSeeOwner = true;
    if (userContext && owner) {
      if (userContext.role !== UserRole.ADMIN) {
        const usernameBase = userContext.username.split('@')[0];
        const ownerBase = owner.split('@')[0];
        const allowedUsernames = new Set<string>();
        allowedUsernames.add(userContext.username);
        allowedUsernames.add(usernameBase);

        // Get users from groups the current user belongs to
        const perunData = this.dataCollectionService.getPerunData();
        const groupMembers = this.getUsersFromUserGroups(
          perunData,
          userContext.username,
        );
        for (const member of groupMembers) {
          allowedUsernames.add(member);
          allowedUsernames.add(member.split('@')[0]);
        }

        canSeeOwner =
          allowedUsernames.has(owner) || allowedUsernames.has(ownerBase);
      }
    }

    return {
      name: reservation.name,
      displayName: reservation.attributes.Reserve_Name || null,
      owner: canSeeOwner ? owner : 'Anonym',
      canSeeOwner,
      hasAccess,
      state: reservation.attributes.reserve_state || null,
      startTime,
      endTime,
      duration,
      resourceMem: reservation.attributes['Resource_List.mem'] || null,
      resourceNcpus: reservation.attributes['Resource_List.ncpus'] || null,
      resourceNgpus: reservation.attributes['Resource_List.ngpus'] || null,
      resourceNodect: reservation.attributes['Resource_List.nodect'] || null,
      authorizedUsers,
      nodes: nodes.length > 0 ? nodes : null,
      isStarted,
      queue: reservation.attributes.queue || null,
    };
  }

  /**
   * Parse resource information from queue attributes
   */
  private parseResources(queue: PbsQueue): QueueResourcesDTO | null {
    const resources: QueueResourcesDTO = {};

    if (queue.attributes['resources_min.mem']) {
      resources.minMem = queue.attributes['resources_min.mem'];
    }
    if (queue.attributes['resources_min.ncpus']) {
      resources.minNcpus = queue.attributes['resources_min.ncpus'];
    }
    if (queue.attributes['resources_min.ngpus']) {
      resources.minNgpus = queue.attributes['resources_min.ngpus'];
    }
    if (queue.attributes['resources_min.walltime']) {
      resources.minWalltime = queue.attributes['resources_min.walltime'];
    }
    if (queue.attributes['resources_max.ncpus']) {
      resources.maxNcpus = queue.attributes['resources_max.ncpus'];
    }
    if (queue.attributes['resources_max.ngpus']) {
      resources.maxNgpus = queue.attributes['resources_max.ngpus'];
    }
    if (queue.attributes['resources_max.walltime']) {
      resources.maxWalltime = queue.attributes['resources_max.walltime'];
    }
    if (queue.attributes['resources_default.walltime']) {
      resources.defaultWalltime =
        queue.attributes['resources_default.walltime'];
    }
    if (queue.attributes['resources_default.ncpus']) {
      resources.defaultNcpus = queue.attributes['resources_default.ncpus'];
    }
    if (queue.attributes['resources_default.ngpus']) {
      resources.defaultNgpus = queue.attributes['resources_default.ngpus'];
    }
    if (queue.attributes['resources_assigned.mem']) {
      resources.assignedMem = queue.attributes['resources_assigned.mem'];
    }
    if (queue.attributes['resources_assigned.ncpus']) {
      resources.assignedNcpus = queue.attributes['resources_assigned.ncpus'];
    }
    if (queue.attributes['resources_assigned.ngpus']) {
      resources.assignedNgpus = queue.attributes['resources_assigned.ngpus'];
    }
    if (queue.attributes['resources_assigned.nodect']) {
      resources.assignedNodect = queue.attributes['resources_assigned.nodect'];
    }

    return Object.keys(resources).length > 0 ? resources : null;
  }

  /**
   * Check if user has access to the queue based on ACLs
   * Admin role has access to everything
   * @param targetUsername If provided, checks access for this user instead of userContext.username
   */
  private checkQueueAccess(
    queue: PbsQueue,
    userContext: UserContext,
    targetUsername?: string,
  ): boolean {
    // If checking access for a specific user, only allow if current user is admin or viewing themselves
    if (targetUsername) {
      const currentUsername = userContext.username.split('@')[0];
      const targetUsernameBase = targetUsername.split('@')[0];
      if (
        userContext.role !== UserRole.ADMIN &&
        currentUsername !== targetUsernameBase
      ) {
        // Non-admin users can only check access for themselves
        return false;
      }
    }

    if (!targetUsername && userContext.role === UserRole.ADMIN) {
      return true;
    }

    const userEnable = queue.attributes.acl_user_enable === 'True';
    const groupEnable = queue.attributes.acl_group_enable === 'True';
    const hostEnable = queue.attributes.acl_host_enable === 'True';

    // If no ACL is enabled, queue is accessible to everyone
    if (!userEnable && !groupEnable && !hostEnable) {
      return true;
    }

    // Use targetUsername if provided, otherwise use userContext.username
    const usernameToCheck = targetUsername || userContext.username;
    const usernameBase = usernameToCheck.split('@')[0];

    // Check user ACL
    if (userEnable) {
      const allowedUsers = queue.attributes.acl_users
        ? queue.attributes.acl_users.split(',').map((u) => u.trim())
        : [];

      // Check if username matches (handle @domain format)
      if (
        allowedUsers.some((u) => {
          const allowedUser = u.split('@')[0];
          return allowedUser === usernameBase;
        })
      ) {
        return true;
      }
    }

    // Check group ACL
    if (groupEnable) {
      const allowedGroups = queue.attributes.acl_groups
        ? queue.attributes.acl_groups.split(',').map((g) => g.trim())
        : [];

      // Get user's groups from Perun data
      const userGroups = this.getUserGroups(usernameToCheck);
      if (userGroups.some((group) => allowedGroups.includes(group))) {
        return true;
      }
    }

    // If ACL is enabled but no match found, deny access
    return false;
  }

  /**
   * Get all groups that a user belongs to from Perun etc_groups data
   * @param username Username to find groups for
   * @returns Array of group names the user belongs to
   */
  private getUserGroups(username: string): string[] {
    const perunData = this.dataCollectionService.getPerunData();

    if (!perunData?.etcGroups || perunData.etcGroups.length === 0) {
      return [];
    }

    const usernameBase = username.split('@')[0];
    const userGroups = new Set<string>();

    // Find all groups the user belongs to across all servers
    for (const serverGroups of perunData.etcGroups) {
      for (const group of serverGroups.entries) {
        // Check if user is a member of this group
        const isMember =
          group.members.includes(usernameBase) ||
          group.members.includes(username);
        if (isMember) {
          userGroups.add(group.groupname);
        }
      }
    }

    return Array.from(userGroups);
  }

  /**
   * Get ACL users with resolved names from Perun data
   * Anonymizes usernames for non-admin users unless they share groups
   * @param queue PBS queue
   * @param userContext User context for access control
   * @returns Array of ACL users with username and name, or null if no ACL users
   */
  private getAclUsers(
    queue: PbsQueue,
    userContext: UserContext,
  ): QueueAclUserDTO[] | null {
    if (
      queue.attributes.acl_user_enable !== 'True' ||
      !queue.attributes.acl_users
    ) {
      return null;
    }

    const perunData = this.dataCollectionService.getPerunData();

    // Build Perun users lookup map for O(1) access
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

    // For non-admin users, get allowed usernames from their groups
    const allowedUsernames = new Set<string>();
    if (userContext.role !== UserRole.ADMIN) {
      const usernameBase = userContext.username.split('@')[0];
      allowedUsernames.add(userContext.username);
      allowedUsernames.add(usernameBase);

      // Get users from groups the user belongs to (excluding system-wide groups)
      const groupMembers = this.getUsersFromUserGroups(
        perunData,
        userContext.username,
      );
      for (const member of groupMembers) {
        allowedUsernames.add(member);
        allowedUsernames.add(member.split('@')[0]);
      }
    }

    // Parse ACL users and resolve their names
    const aclUserStrings = queue.attributes.acl_users
      .split(',')
      .map((u) => u.trim());
    const aclUsers: QueueAclUserDTO[] = aclUserStrings.map((username) => {
      const usernameBase = username.split('@')[0];
      const name =
        perunUsersMap.get(username) || perunUsersMap.get(usernameBase) || null;

      // Determine visibility based on user role and shared groups
      const canSeeFullInfo =
        userContext.role === UserRole.ADMIN ||
        allowedUsernames.has(username) ||
        allowedUsernames.has(usernameBase);

      return {
        username: canSeeFullInfo ? username : null,
        name: canSeeFullInfo ? name : null,
        nickname: usernameBase,
      };
    });

    return aclUsers.length > 0 ? aclUsers : null;
  }

  /**
   * Get all users that belong to the same groups as the given user
   * (excluding system-wide groups that contain 80%+ of all users)
   * @param perunData Perun data
   * @param username Username to find group members for
   * @returns Set of usernames that share groups with the user
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
}
