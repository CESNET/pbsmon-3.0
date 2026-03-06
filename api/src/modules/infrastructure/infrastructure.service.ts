import { Injectable, NotFoundException } from '@nestjs/common';
import { DataCollectionService } from '@/modules/data-collection/data-collection.service';
import { UserContext, UserRole } from '@/common/types/user-context.types';
import {
  PerunPhysicalMachine,
  PerunResource,
  PerunMachine,
} from '@/modules/data-collection/types/perun.types';
import {
  InfrastructureOrganizationListDTO,
  InfrastructureClusterListDTO,
  InfrastructureNodeListDTO,
  NodeState,
} from './dto/infrastructure-list.dto';
import {
  InfrastructureDetailDTO,
  InfrastructureOrganizationDetailDTO,
  InfrastructureClusterDetailDTO,
  InfrastructureNodeDetailDTO,
} from './dto/infrastructure-detail.dto';
import { InfrastructureListMetaDto } from './dto/infrastructure-list-meta.dto';
import { PbsNode, PbsQueue } from '@/modules/data-collection/types/pbs.types';
import { QueueListDTO } from '@/modules/queues/dto/queue-list.dto';
import { PrometheusResponse } from '@/modules/data-collection/clients/prometheus.client';

@Injectable()
export class InfrastructureService {
  constructor(private readonly dataCollectionService: DataCollectionService) {}

  getInfrastructureList(
    search?: string,
  ): {
    data: InfrastructureOrganizationListDTO[];
    meta: InfrastructureListMetaDto;
  } {
    const perunData = this.dataCollectionService.getPerunData();

    if (!perunData?.machines?.physical_machines) {
      return {
        data: [],
        meta: this.createEmptyMeta(),
      };
    }

    const data = perunData.machines.physical_machines.map((org) =>
      this.mapOrganizationToList(org),
    );

    // Sort nodes within each cluster by name (natural sort)
    const sortedData = data.map((org) => ({
      ...org,
      clusters: org.clusters.map((cluster) => ({
        ...cluster,
        nodes: cluster.nodes.sort((a, b) => this.naturalSort(a.name, b.name)),
      })),
    }));

    const meta = this.calculateStatistics(sortedData);

    // Apply search filter
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();

      // Filter by search term
      const filtered = sortedData
        .map((org) => {
          const clusters = org.clusters
            .map((cluster) => {
              // Filter nodes within cluster by node name
              const nodes = cluster.nodes.filter((node) =>
                node.name.toLowerCase().includes(searchLower) ||
                node.actualState?.toLowerCase().includes(searchLower) ||
                node.queueNames?.some((q) => q.toLowerCase().includes(searchLower))
              );

              if (nodes.length > 0) {
                return {
                  ...cluster,
                  nodes,
                  nodeCount: nodes.length,
                } as InfrastructureClusterListDTO;
              }

              return null;
            })
            .filter(Boolean) as InfrastructureClusterListDTO[];

          if (clusters.length > 0) {
            return {
              ...org,
              clusters,
              clusterCount: clusters.length,
            } as InfrastructureOrganizationListDTO;
          }

          return null;
        })
        .filter(Boolean) as InfrastructureOrganizationListDTO[];

      // Replace data with filtered result
      return { data: filtered, meta };
    }

    return { data: sortedData, meta };
  }

  /**
   * Natural sort comparison for alphanumeric strings
   * Ensures node2 comes before node11
   */
  private naturalSort(a: string, b: string): number {
    const regex = /(\d+)/g;
    const aParts = a.split(regex);
    const bParts = b.split(regex);

    for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
      const aPart = aParts[i];
      const bPart = bParts[i];

      // Check if parts are numeric
      if (/^\d+$/.test(aPart) && /^\d+$/.test(bPart)) {
        const aNum = parseInt(aPart, 10);
        const bNum = parseInt(bPart, 10);
        if (aNum !== bNum) {
          return aNum - bNum;
        }
      } else {
        // String comparison
        if (aPart < bPart) return -1;
        if (aPart > bPart) return 1;
      }
    }

    return aParts.length - bParts.length;
  }

  private calculateStatistics(
    organizations: InfrastructureOrganizationListDTO[],
  ): InfrastructureListMetaDto {
    let totalClusters = 0;
    let totalNodes = 0;
    let totalCpu = 0;
    let freeNodes = 0;
    let partiallyUsedNodes = 0;
    let usedNodes = 0;
    let unknownNodes = 0;

    const pbsData = this.dataCollectionService.getPbsData();

    // Helper function to find PBS node by PERUN machine name
    const findPbsNode = (perunNodeName: string): PbsNode | undefined => {
      if (!pbsData?.servers) {
        return undefined;
      }

      // PERUN machine names are FQDNs (e.g., "alfrid1.meta.zcu.cz")
      // PBS node names are short hostnames (e.g., "alfrid1")
      // Extract hostname from PERUN name for matching
      const perunHostname = perunNodeName.split('.')[0];

      for (const serverData of Object.values(pbsData.servers)) {
        if (serverData.nodes?.items) {
          let pbsNode = serverData.nodes.items.find(
            (node) => node.name === perunNodeName,
          );
          if (pbsNode) {
            return pbsNode;
          }

          pbsNode = serverData.nodes.items.find(
            (node) => node.name === perunHostname,
          );
          if (pbsNode) {
            return pbsNode;
          }

          pbsNode = serverData.nodes.items.find(
            (node) =>
              node.attributes['resources_available.host'] === perunNodeName ||
              node.attributes['resources_available.vnode'] === perunNodeName ||
              node.attributes['resources_available.host']?.split('.')[0] ===
                perunHostname,
          );
          if (pbsNode) {
            return pbsNode;
          }
        }
      }
      return undefined;
    };

    let totalGpu = 0;
    let totalMemory = 0;

    for (const org of organizations) {
      totalClusters += org.clusters.length;
      for (const cluster of org.clusters) {
        totalNodes += cluster.nodes.length;
        totalCpu += cluster.totalCpu;

        for (const node of cluster.nodes) {
          if (node.actualState === NodeState.FREE) {
            freeNodes++;
          } else if (node.actualState === NodeState.PARTIALLY_USED) {
            partiallyUsedNodes++;
          } else if (node.actualState === NodeState.USED) {
            usedNodes++;
          } else {
            unknownNodes++;
          }

          // Get GPU and memory from PBS if available
          const pbsNode = findPbsNode(node.name);
          if (pbsNode) {
            const availableGpus = parseInt(
              pbsNode.attributes['resources_available.ngpus'] || '0',
              10,
            );
            totalGpu += availableGpus;

            // Parse memory (format: "515862mb", "1536 GiB", etc.)
            const memoryStr =
              pbsNode.attributes['resources_available.mem'] || '0';
            // Match patterns like "515862mb", "1536 GiB", "1024KB", etc.
            const memoryMatch = memoryStr.match(/^(\d+)\s*([a-z]+)$/i);
            if (memoryMatch) {
              const value = parseInt(memoryMatch[1], 10);
              const unit = memoryMatch[2].toLowerCase();
              // Convert to bytes for consistency
              let bytes = value;
              if (unit === 'b' || unit === 'bytes') {
                bytes = value;
              } else if (unit === 'kb' || unit === 'k') {
                bytes = value * 1024;
              } else if (unit === 'mb' || unit === 'm') {
                bytes = value * 1024 * 1024;
              } else if (unit === 'gb' || unit === 'g' || unit === 'gib') {
                bytes = value * 1024 * 1024 * 1024;
              } else if (unit === 'tb' || unit === 't' || unit === 'tib') {
                bytes = value * 1024 * 1024 * 1024 * 1024;
              }
              totalMemory += bytes;
            } else {
              // Try to parse as just a number (assume bytes)
              const numValue = parseInt(memoryStr, 10);
              if (!isNaN(numValue)) {
                totalMemory += numValue;
              }
            }
          }
        }
      }
    }

    return {
      totalCount: organizations.length,
      totalOrganizations: organizations.length,
      totalClusters,
      totalNodes,
      totalCpu,
      totalGpu: totalGpu,
      totalMemory: totalMemory,
      freeNodes,
      partiallyUsedNodes,
      usedNodes,
      unknownNodes,
    };
  }

  /**
   * Create empty meta for empty data
   */
  private createEmptyMeta(): InfrastructureListMetaDto {
    return {
      totalCount: 0,
      totalOrganizations: 0,
      totalClusters: 0,
      totalNodes: 0,
      totalCpu: 0,
      totalGpu: 0,
      totalMemory: 0,
      freeNodes: 0,
      partiallyUsedNodes: 0,
      usedNodes: 0,
      unknownNodes: 0,
    };
  }

  /**
   * Get organization detail by ID
   */
  getOrganizationDetail(orgId: string): InfrastructureDetailDTO {
    const perunData = this.dataCollectionService.getPerunData();

    if (!perunData?.machines?.physical_machines) {
      throw new NotFoundException(
        `Organization with id '${orgId}' was not found`,
      );
    }

    const org = perunData.machines.physical_machines.find(
      (o) => o.id === orgId,
    );
    if (!org) {
      throw new NotFoundException(
        `Organization with id '${orgId}' was not found`,
      );
    }
    return this.mapOrganizationToDetail(org);
  }

  /**
   * Get cluster detail by ID
   */
  getClusterDetail(clusterId: string): InfrastructureDetailDTO {
    const perunData = this.dataCollectionService.getPerunData();

    if (!perunData?.machines?.physical_machines) {
      throw new NotFoundException(
        `Cluster with id '${clusterId}' was not found`,
      );
    }

    const cluster = this.findCluster(
      clusterId,
      perunData.machines.physical_machines,
    );
    if (!cluster) {
      throw new NotFoundException(
        `Cluster with id '${clusterId}' was not found`,
      );
    }
    return this.mapClusterToDetail(cluster);
  }

  /**
   * Get machine (node) detail by node name
   * @param nodeName - The node name (can be full FQDN or just hostname)
   * @param userContext - User context for access control
   */
  getMachineDetail(
    nodeName: string,
    userContext?: any,
  ): InfrastructureDetailDTO {
    const perunData = this.dataCollectionService.getPerunData();

    if (!perunData?.machines?.physical_machines) {
      throw new NotFoundException(`Machine '${nodeName}' was not found`);
    }

    const node = this.findNodeByName(
      nodeName,
      perunData.machines.physical_machines,
    );
    if (!node) {
      throw new NotFoundException(`Machine '${nodeName}' was not found`);
    }
    return this.mapNodeToDetail(node, userContext);
  }

  /**
   * Get infrastructure detail by ID (deprecated - use specific methods instead)
   * ID format: organization-{id}, cluster-{id}, node-{clusterId}-{nodeName}
   * @deprecated Use getOrganizationDetail, getClusterDetail, or getMachineDetail instead
   */
  getInfrastructureDetail(id: string): InfrastructureDetailDTO {
    const perunData = this.dataCollectionService.getPerunData();

    if (!perunData?.machines?.physical_machines) {
      throw new NotFoundException(
        `Infrastructure with id '${id}' was not found`,
      );
    }

    // Parse ID to determine type
    if (id.startsWith('organization-')) {
      const orgId = id.replace('organization-', '');
      return this.getOrganizationDetail(orgId);
    }

    if (id.startsWith('cluster-')) {
      const clusterId = id.replace('cluster-', '');
      return this.getClusterDetail(clusterId);
    }

    if (id.startsWith('node-')) {
      const parts = id.replace('node-', '').split('-');
      if (parts.length < 2) {
        throw new NotFoundException(`Invalid node ID format: '${id}'`);
      }
      const nodeName = parts.slice(1).join('-');
      return this.getMachineDetail(nodeName);
    }

    throw new NotFoundException(`Infrastructure with id '${id}' was not found`);
  }

  /**
   * Map organization to list DTO
   */
  private mapOrganizationToList(
    org: PerunPhysicalMachine,
  ): InfrastructureOrganizationListDTO {
    const clusters = (org.resources || []).map((resource) => {
      const machines = resource.machines || [];
      const nodes =
        resource.cluster === 'true'
          ? machines.map((machine) => this.mapNodeToList(machine, resource.id))
          : [this.mapOrganizationToMachine(resource)];
      return {
        id: resource.id,
        name: resource.name,
        cluster: resource.cluster,
        totalCpu:
          resource.cluster === 'true'
            ? machines.reduce((sum, m) => sum + m.cpu, 0)
            : resource.cpu || 0,
        nodeCount: nodes.length,
        nodes,
      } as InfrastructureClusterListDTO;
    });

    return {
      id: org.id,
      name: org.name,
      clusterCount: clusters.length,
      clusters,
    };
  }

  /**
   * Map organization to detail DTO
   */
  private mapOrganizationToDetail(
    org: PerunPhysicalMachine,
  ): InfrastructureDetailDTO {
    const resources = (org.resources || []).map((resource) =>
      this.mapClusterToDetailDTO(resource, org),
    );

    const orgDetail: InfrastructureOrganizationDetailDTO = {
      id: org.id,
      name: org.name,
      resources,
    };

    return {
      type: 'Organization',
      id: org.id,
      name: org.name,
      organization: orgDetail,
      cluster: null,
      node: null,
    };
  }

  /**
   * Map cluster to detail DTO
   */
  private mapClusterToDetail(cluster: {
    resource: PerunResource;
    orgId: string;
  }): InfrastructureDetailDTO {
    // Find the organization to pass to mapClusterToDetailDTO
    const perunData = this.dataCollectionService.getPerunData();
    const organization = perunData?.machines?.physical_machines?.find(
      (org) => org.id === cluster.orgId,
    );
    const clusterDetail = this.mapClusterToDetailDTO(
      cluster.resource,
      organization,
    );

    return {
      type: 'Cluster',
      id: cluster.resource.id,
      name: cluster.resource.name,
      organization: null,
      cluster: clusterDetail,
      node: null,
    };
  }

  /**
   * Map cluster resource to detail DTO
   */
  private mapClusterToDetailDTO(
    resource: PerunResource,
    organization?: PerunPhysicalMachine,
  ): InfrastructureClusterDetailDTO {
    const machines = (resource.machines || []).map((machine) =>
      this.mapNodeToDetailDTO(
        machine,
        resource.id,
        resource,
        organization,
        undefined,
      ),
    );

    return {
      id: resource.id,
      name: resource.name,
      cluster: resource.cluster,
      desc: resource.desc,
      spec: resource.spec,
      cpudesc: resource.cpudesc,
      gpudesc: resource.gpudesc,
      photo: resource.photo,
      thumbnail: resource.thumbnail,
      memory: resource.memory,
      disk: resource.disk,
      network: resource.network,
      comment: resource.comment,
      owner: resource.owner,
      vos: resource.vos,
      machines,
    };
  }

  /**
   * Map node to detail DTO
   */
  private mapNodeToDetail(
    node: {
      machine: PerunMachine;
      clusterId: string;
      cluster: PerunResource;
      organization: PerunPhysicalMachine;
    },
    userContext?: any,
  ): InfrastructureDetailDTO {
    const nodeDetail = this.mapNodeToDetailDTO(
      node.machine,
      node.clusterId,
      node.cluster,
      node.organization,
      userContext,
    );

    return {
      type: 'Node',
      id: `node-${node.clusterId}-${node.machine.name}`,
      name: node.machine.name,
      organization: null,
      cluster: null,
      node: nodeDetail,
    };
  }

  /**
   * Get set of hostnames from Prometheus queries that contain hostname field
   * These are the queries that are collected and contain hostname: CPU Info, Network Info, VM Count
   */
  private getPrometheusHostnames(): Set<string> {
    const hostnames = new Set<string>();
    try {
      const prometheusData = this.dataCollectionService.getPrometheusData();

      // Check queries that are collected and contain hostname field
      const queriesWithHostname = ['CPU Info', 'Network Info', 'VM Count'];

      for (const queryName of queriesWithHostname) {
        const response = prometheusData?.[queryName] as
          | PrometheusResponse
          | undefined;

        if (response?.data?.result) {
          for (const item of response.data.result) {
            const hostname = item.metric?.hostname;
            if (hostname) {
              hostnames.add(hostname);
            }
          }
        }
      }
    } catch (error) {
      // Silently fail - if Prometheus data is not available, return empty set
    }
    return hostnames;
  }

  /**
   * Get cloud node information from Prometheus for a specific hostname
   */
  private getCloudNodeInfo(hostname: string): {
    cpuCount: number | null;
    vmCount: number | null;
    cpuModel: string | null;
  } {
    const info = {
      cpuCount: null as number | null,
      vmCount: null as number | null,
      cpuModel: null as string | null,
    };

    try {
      const prometheusData = this.dataCollectionService.getPrometheusData();

      // Get CPU Info
      const cpuInfoResponse = prometheusData?.['CPU Info'] as
        | PrometheusResponse
        | undefined;
      if (cpuInfoResponse?.data?.result) {
        for (const item of cpuInfoResponse.data.result) {
          if (item.metric?.hostname === hostname) {
            const cores = parseInt(item.metric?.cores || '0', 10);
            const threads = parseInt(item.metric?.threads || '0', 10);
            // Use threads if available, otherwise cores
            info.cpuCount = threads > 0 ? threads : cores > 0 ? cores : null;
            info.cpuModel = item.metric?.model || null;
            break;
          }
        }
      }

      // Get VM Count
      const vmCountResponse = prometheusData?.['VM Count'] as
        | PrometheusResponse
        | undefined;
      if (vmCountResponse?.data?.result) {
        for (const item of vmCountResponse.data.result) {
          if (item.metric?.hostname === hostname) {
            const count = parseFloat(item.value?.[1] || '0');
            info.vmCount = count > 0 ? Math.round(count) : null;
            break;
          }
        }
      }
    } catch (error) {
      // Silently fail - return partial info
    }

    return info;
  }

  /**
   * Check if a node is a cloud node (OpenStack) by checking Prometheus hostname data
   */
  private isCloudNode(nodeName: string): boolean {
    const hostnames = this.getPrometheusHostnames();

    // Check for exact match
    return hostnames.has(nodeName);
  }

  /**
   * Map node machine to list DTO
   */
  private mapNodeToList(
    machine: PerunMachine,
    clusterId: string,
  ): InfrastructureNodeListDTO {
    const pbsState = this.getNodeStateFromPbs(machine.name);
    const pbsNodeData = this.getPbsNodeData(machine.name);

    // Extract queue names from PBS node attributes
    let queueNames: string[] | null = null;
    const queueNamesSet = new Set<string>();

    // Get queues from queue_list attribute
    if (pbsNodeData?.pbsNode?.attributes['resources_available.queue_list']) {
      const queuesStr =
        pbsNodeData.pbsNode.attributes['resources_available.queue_list'];
      // Queues format: "q_2h,q_4h,q_1d,q_gpu,..."
      const queuesFromList = queuesStr
        .split(',')
        .map((q) => q.trim())
        .filter(Boolean);
      queuesFromList.forEach((q) => queueNamesSet.add(q));
    }

    if (pbsNodeData?.pbsNode?.attributes['queue']) {
      queueNamesSet.add(pbsNodeData.pbsNode.attributes['queue']);
    }

    // Get queue from reservation if node has a reservation
    if (pbsNodeData?.pbsNode?.attributes.resv && pbsNodeData.serverName) {
      const reservationNames = pbsNodeData.pbsNode.attributes.resv.split(',').map((r) => r.trim());
      const pbsData = this.dataCollectionService.getPbsData();
      const serverData = pbsData?.servers?.[pbsNodeData.serverName];

      reservationNames.forEach((reservationName) => {
        if (serverData?.reservations?.items) {
          const reservation = serverData.reservations.items.find(
            (r) => r.name === reservationName,
          );
          if (reservation?.attributes.queue) {
            queueNamesSet.add(reservation.attributes.queue);
          }
        }
      });
    }

    if (queueNamesSet.size > 0) {
      queueNames = Array.from(queueNamesSet);
    }

    // Check if node is a cloud node and get cloud info
    const isCloud = this.isCloudNode(machine.name);
    const cloudInfo = isCloud ? this.getCloudNodeInfo(machine.name) : null;

    return {
      name: machine.name,
      cpu: machine.cpu,
      actualState: pbsState.state,
      cpuUsagePercent: pbsState.cpuUsage,
      cpuAssigned: pbsState.cpuAssigned,
      gpuUsagePercent: pbsState.gpuUsage,
      gpuCount: pbsState.gpuCount,
      gpuAssigned: pbsState.gpuAssigned,
      gpuCapability: pbsState.gpuCapability,
      gpuMemory: pbsState.gpuMemory,
      cudaVersion: pbsState.cudaVersion,
      memoryTotal: pbsState.memoryTotal,
      memoryUsed: pbsState.memoryUsed,
      memoryUsagePercent: pbsState.memoryUsagePercent,
      queueNames,
      ostack: cloudInfo,
    };
  }

  private mapOrganizationToMachine(resource: PerunResource): InfrastructureNodeListDTO {
    if (resource.cluster === 'true') {
      throw new Error(
        `Resource '${resource.name}' is a cluster, cannot be mapped to machine`,
      );
    }

    return this.mapNodeToList(
      {
        name: resource.name,
        cpu: resource.cpu || 0,
      } as PerunMachine,
      resource.id,
    );
  }

  /**
   * Map node machine to detail DTO
   */
  private mapNodeToDetailDTO(
    machine: PerunMachine,
    clusterId: string,
    cluster?: PerunResource,
    organization?: PerunPhysicalMachine,
    userContext?: UserContext,
  ): InfrastructureNodeDetailDTO {
    const pbsState = this.getNodeStateFromPbs(machine.name);
    const pbsNodeData = this.getPbsNodeData(machine.name);

    // Parse jobs from node's jobs attribute
    const jobs: string[] = [];
    if (pbsNodeData?.pbsNode?.attributes?.jobs) {
      const jobsStr = pbsNodeData.pbsNode.attributes.jobs;
      // Jobs format: "14490844.pbs-m1.metacentrum.cz/0, 14571383[170].pbs-m1.metacentrum.cz/..."
      const jobList = jobsStr.split(',').map((j) => j.trim());
      jobs.push(...jobList);
    }

    // Parse queues from queue_list attribute and build QueueListDTO objects
    const queues: QueueListDTO[] = [];
    if (
      pbsNodeData.serverName &&
      (
        pbsNodeData?.pbsNode?.attributes['resources_available.queue_list'] ||
        pbsNodeData?.pbsNode?.attributes['queue']
      )
    ) {
      const queuesStr =
        pbsNodeData?.pbsNode?.attributes['resources_available.queue_list'] ?
        pbsNodeData.pbsNode.attributes['resources_available.queue_list'] :
        '';
      // Queues format: "q_2h,q_4h,q_1d,q_gpu,..."
      const queueNames = queuesStr.split(',').map((q) => q.trim());
      pbsNodeData?.pbsNode?.attributes['queue'] && queueNames.push(...[pbsNodeData.pbsNode.attributes['queue']]);

      // Get PBS data to find queue objects
      const pbsData = this.dataCollectionService.getPbsData();
      const serverData = pbsData?.servers?.[pbsNodeData.serverName];

      if (serverData?.queues?.items) {
        // Build parent-child relationships (child -> parents)
        const parentMap = new Map<string, string[]>();
        const allQueuesMap = new Map<string, PbsQueue>();
        const queueMap = new Map<string, QueueListDTO>(); // Track queues by name to avoid duplicates

        for (const q of serverData.queues.items) {
          allQueuesMap.set(q.name, q);

          if (q.attributes.queue_type === 'Route') {
            const destinations = this.parseRouteDestinations(q);
            for (const destination of destinations) {
              if (!parentMap.has(destination)) {
                parentMap.set(destination, []);
              }
              parentMap.get(destination)!.push(q.name);
            }
          }
        }

        // Process Execution queues from node's queue_list
        for (const queueName of queueNames) {
          const pbsQueues = serverData.queues?.items.filter(
            (q) => q.name === queueName || q.attributes['default_chunk.queue_list'] === queueName
          );

          for (const pbsQueue of pbsQueues || []) {
            // Only process Execution queues
            if (pbsQueue && pbsQueue.attributes.queue_type === 'Execution') {
              // Add the Execution queue itself
              if (!queueMap.has(pbsQueue.name)) {
                const queueDTO = this.mapPbsQueueToList(
                  pbsQueue,
                  pbsNodeData.serverName,
                );
                queueMap.set(pbsQueue.name, queueDTO);
              }

              // Find parent Route queues and add them too
              const parentRouteQueues = parentMap.get(queueName) || [];
              for (const parentQueueName of parentRouteQueues) {
                const parentQueue = allQueuesMap.get(parentQueueName);
                if (
                  parentQueue &&
                  parentQueue.attributes.queue_type === 'Route' &&
                  !queueMap.has(parentQueueName)
                ) {
                  const parentQueueDTO = this.mapPbsQueueToList(
                    parentQueue,
                    pbsNodeData.serverName,
                  );
                  queueMap.set(parentQueueName, parentQueueDTO);
                }
              }
            }
          }
        }

        // Convert map to array
        queues.push(...Array.from(queueMap.values()));
      }
    }

    const rawPbsAttributes = pbsNodeData?.pbsNode?.attributes || null;

    const outages: Array<Record<string, any>> = [];

    // Extract comment and comment_aux from PBS node attributes
    const comment = pbsNodeData?.pbsNode?.attributes?.comment || null;
    const commentAux = pbsNodeData?.pbsNode?.attributes?.comment_aux || null;

    // Parse reservation information if node has a reservation
    const reservations = this.parseNodeReservations(
      pbsNodeData?.pbsNode,
    );

    const pbsData = pbsNodeData?.pbsNode
      ? {
          name: pbsNodeData.pbsNode.name,
          actualState: pbsState.state,
          cpuUsagePercent: pbsState.cpuUsage,
          cpuAssigned: pbsState.cpuAssigned,
          gpuUsagePercent: pbsState.gpuUsage,
          gpuCount: pbsState.gpuCount,
          gpuAssigned: pbsState.gpuAssigned,
          gpuCapability: pbsState.gpuCapability,
          gpuMemory: pbsState.gpuMemory,
          cudaVersion: pbsState.cudaVersion,
          memoryTotal: pbsState.memoryTotal,
          memoryUsed: pbsState.memoryUsed,
          memoryUsagePercent: pbsState.memoryUsagePercent,
          jobs: jobs.length > 0 ? jobs : null,
          queues: queues.length > 0 ? queues : null,
          rawPbsAttributes,
          outages: outages.length > 0 ? outages : null,
          comment: comment || null,
          commentAux: commentAux || null,
          scratchLocalTotal: pbsState.scratchLocalTotal,
          scratchLocalUsed: pbsState.scratchLocalUsed,
          scratchLocalAvailable: pbsState.scratchLocalAvailable,
          scratchSsdTotal: pbsState.scratchSsdTotal,
          scratchSsdUsed: pbsState.scratchSsdUsed,
          scratchSsdAvailable: pbsState.scratchSsdAvailable,
          scratchSharedTotal: pbsState.scratchSharedTotal,
          scratchShmAvailable: pbsState.scratchShmAvailable,
          reservations,
        }
      : null;

    // Check if node is a cloud node and get cloud info
    const isCloud = this.isCloudNode(machine.name);
    const cloudInfo = isCloud ? this.getCloudNodeInfo(machine.name) : null;

    return {
      name: machine.name,
      cpu: machine.cpu,
      pbs: pbsData,
      clusterName: cluster?.name
        ? { cs: cluster.name, en: cluster.name }
        : null,
      clusterId: cluster?.id,
      owner: cluster?.owner,
      ostack: cloudInfo,
    };
  }

  /**
   * Parse reservations information for a node
   */
  private parseNodeReservations(
    pbsNode: PbsNode | null | undefined,
  ): Array<string> | null {

    const reservationNames: string[] = [];
    if (pbsNode?.attributes?.resv) {
      const resvList = pbsNode.attributes.resv.split(',');
      resvList.forEach((r) => {
        reservationNames.push(r.trim());
      });
    }

    return reservationNames.length > 0 ? reservationNames : null;
  }

  private mapPbsQueueToList(queue: PbsQueue, serverName: string): QueueListDTO {
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

    // Parse state_count
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

    const canBeDirectlySubmitted = queue.attributes.from_route_only !== 'True';

    return {
      name: queue.name,
      server: serverName,
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
      hasAccess: true,
      canBeDirectlySubmitted,
    };
  }

  /**
   * Parse route destinations from a Route queue
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

  private parseStateCount(stateCountStr?: string): QueueListDTO['stateCount'] {
    if (!stateCountStr) {
      return null;
    }

    const counts: Record<string, number> = {};
    const parts = stateCountStr.split(/\s+/);
    for (const part of parts) {
      const [state, count] = part.split(':');
      if (state && count) {
        counts[state.toLowerCase()] = parseInt(count, 10) || 0;
      }
    }

    return {
      transit: counts.transit || 0,
      queued: counts.queued || 0,
      held: counts.held || 0,
      waiting: counts.waiting || 0,
      running: counts.running || 0,
      exiting: counts.exiting || 0,
      begun: counts.begun || 0,
    };
  }

  private getPbsNodeData(nodeName: string): {
    pbsNode: PbsNode | null;
    serverName: string | null;
  } {
    const pbsData = this.dataCollectionService.getPbsData();

    if (!pbsData?.servers) {
      return { pbsNode: null, serverName: null };
    }

    const perunHostname = nodeName.split('.')[0];

    for (const [serverName, serverData] of Object.entries(pbsData.servers)) {
      if (serverData.nodes?.items) {
        // Try exact match first
        let pbsNode = serverData.nodes.items.find(
          (node) => node.name === nodeName,
        );
        if (pbsNode) {
          return { pbsNode, serverName };
        }
        // Try hostname match (PERUN FQDN vs PBS short name)
        pbsNode = serverData.nodes.items.find(
          (node) => node.name === perunHostname,
        );
        if (pbsNode) {
          return { pbsNode, serverName };
        }
        // Try matching against PBS host attribute (full hostname)
        pbsNode = serverData.nodes.items.find(
          (node) =>
            node.attributes['resources_available.host'] === nodeName ||
            node.attributes['resources_available.vnode'] === nodeName ||
            node.attributes['resources_available.host']?.split('.')[0] ===
              perunHostname,
        );
        if (pbsNode) {
          return { pbsNode, serverName };
        }
      }
    }

    return { pbsNode: null, serverName: null };
  }

  /**
   * Get the "worse" state from state and state_aux
   * Priority: not-available > maintenance > used > partially_used > free > unknown
   */
  private getWorseState(
    state: string | null | undefined,
    stateAux: string | null | undefined,
  ): string {
    const stateLower = (state || '').toLowerCase();
    const stateAuxLower = (stateAux || '').toLowerCase();

    // Helper to get state severity (higher = worse)
    const getStateSeverity = (s: string): number => {
      const sLower = s.toLowerCase();
      // Unavailability states (worst)
      if (
        sLower.includes('down') ||
        sLower.includes('stale') ||
        sLower.includes('state-unknown') ||
        sLower.includes('initializing') ||
        sLower.includes('unresolvable') ||
        sLower.includes('sleep')
      ) {
        return 5;
      }
      // Maintenance states
      if (
        sLower.includes('maintenance') ||
        sLower.includes('offline') ||
        sLower.includes('offline_by_mom')
      ) {
        return 4;
      }
      // Occupancy states (busy, job-busy, job-exclusive, resv-exclusive)
      if (
        sLower.includes('busy') ||
        sLower.includes('job-busy') ||
        sLower.includes('job-exclusive') ||
        sLower.includes('resv-exclusive')
      ) {
        return 2;
      }
      // Free state
      if (sLower.includes('free')) {
        return 1;
      }
      // Unknown/default
      return 3;
    };

    const stateSeverity = getStateSeverity(stateLower);
    const stateAuxSeverity = getStateSeverity(stateAuxLower);

    // Return the state with higher severity (worse state)
    // If severities are equal, prefer state over state_aux
    if (stateAuxSeverity > stateSeverity && stateAux && stateAux.trim()) {
      return stateAux;
    }
    if (state && state.trim()) {
      return state;
    }
    return stateAux || state || '';
  }

  /**
   * Map PBS state string to our NodeState enum
   */
  private mapPbsStateToNodeState(pbsState: string): NodeState {
    const stateLower = pbsState.toLowerCase();

    // Unavailability states -> NOT_AVAILABLE
    if (
      stateLower.includes('down') ||
      stateLower.includes('stale') ||
      stateLower.includes('state-unknown') ||
      stateLower.includes('initializing') ||
      stateLower.includes('unresolvable') ||
      stateLower.includes('sleep')
    ) {
      return NodeState.NOT_AVAILABLE;
    }

    // Maintenance states -> MAINTENANCE
    if (
      stateLower.includes('maintenance') ||
      stateLower.includes('offline') ||
      stateLower.includes('offline_by_mom')
    ) {
      return NodeState.MAINTENANCE;
    }

    // Occupancy states will be determined by usage, but we can check for specific ones
    // These will be overridden by usage calculation unless in maintenance/not-available
    // For now, return UNKNOWN and let usage calculation handle it
    return NodeState.UNKNOWN;
  }

  /**
   * Check if node is in maintenance or reserved queue
   * Checks the 'queue' attribute directly
   */
  private isNodeInMaintenanceOrReservedQueue(pbsNode: PbsNode): boolean {
    // Check if queue attribute exists
    if (!pbsNode.attributes.queue) {
      return false;
    }

    const queue = pbsNode.attributes.queue.toLowerCase().trim();
    return queue === 'maintenance' || queue === 'reserved';
  }

  /**
   * Get node state from PBS data
   */
  private getNodeStateFromPbs(nodeName: string): {
    state: NodeState | null;
    cpuUsage: number | null;
    cpuAssigned: number | null;
    gpuUsage: number | null;
    gpuCount: number | null;
    gpuAssigned: number | null;
    gpuCapability: string | null;
    gpuMemory: string | null;
    cudaVersion: string | null;
    memoryTotal: number | null;
    memoryUsed: number | null;
    memoryUsagePercent: number | null;
    scratchLocalTotal: number | null;
    scratchLocalUsed: number | null;
    scratchLocalAvailable: number | null;
    scratchSsdTotal: number | null;
    scratchSsdUsed: number | null;
    scratchSsdAvailable: number | null;
    scratchSharedTotal: number | null;
    scratchShmAvailable: boolean | null;
  } {
    const { pbsNode } = this.getPbsNodeData(nodeName);

    if (!pbsNode) {
      return {
        state: null, // No PBS detected - return null instead of UNKNOWN
        cpuUsage: null,
        cpuAssigned: null,
        gpuUsage: null,
        gpuCount: null,
        gpuAssigned: null,
        gpuCapability: null,
        gpuMemory: null,
        cudaVersion: null,
        memoryTotal: null,
        memoryUsed: null,
        memoryUsagePercent: null,
        scratchLocalTotal: null,
        scratchLocalUsed: null,
        scratchLocalAvailable: null,
        scratchSsdTotal: null,
        scratchSsdUsed: null,
        scratchSsdAvailable: null,
        scratchSharedTotal: null,
        scratchShmAvailable: null,
      };
    }

    // Extract CPU/GPU usage from PBS node attributes
    const assignedCpus = parseInt(
      pbsNode.attributes['resources_assigned.ncpus'] || '0',
      10,
    );
    const availableCpus = parseInt(
      pbsNode.attributes['resources_available.ncpus'] || '0',
      10,
    );
    const assignedGpus = parseInt(
      pbsNode.attributes['resources_assigned.ngpus'] || '0',
      10,
    );
    const availableGpus = parseInt(
      pbsNode.attributes['resources_available.ngpus'] || '0',
      10,
    );

    // Extract additional GPU information
    const gpuCapability =
      pbsNode.attributes['resources_available.gpu_cap'] || null;
    const gpuMemory = pbsNode.attributes['resources_available.gpu_mem'] || null;
    const cudaVersion =
      pbsNode.attributes['resources_available.cuda_version'] || null;

    // Extract memory information
    const memoryTotalStr =
      pbsNode.attributes['resources_available.mem'] || null;
    const memoryUsedStr = pbsNode.attributes['resources_assigned.mem'] || null;

    // Parse memory values (format: "515862mb", "1536 GiB", etc.)
    const parseMemory = (memoryStr: string | null): number | null => {
      if (!memoryStr) return null;
      // Match patterns like "515862mb", "1536 GiB", "1024KB", etc.
      const memoryMatch = memoryStr.match(/^(\d+)\s*([a-z]+)$/i);
      if (memoryMatch) {
        const value = parseInt(memoryMatch[1], 10);
        const unit = memoryMatch[2].toLowerCase();
        // Convert to GB for consistency
        let gb = value;
        if (unit === 'b' || unit === 'bytes') {
          gb = value / (1024 * 1024 * 1024);
        } else if (unit === 'kb' || unit === 'k') {
          gb = value / (1024 * 1024);
        } else if (unit === 'mb' || unit === 'm') {
          gb = value / 1024;
        } else if (unit === 'gb' || unit === 'g' || unit === 'gib') {
          gb = value;
        } else if (unit === 'tb' || unit === 't' || unit === 'tib') {
          gb = value * 1024;
        }
        return Math.round(gb * 100) / 100; // Round to 2 decimal places
      }
      // Try to parse as just a number (assume bytes, convert to GB)
      const numValue = parseInt(memoryStr, 10);
      if (!isNaN(numValue)) {
        return Math.round((numValue / (1024 * 1024 * 1024)) * 100) / 100;
      }
      return null;
    };

    const memoryTotal = parseMemory(memoryTotalStr);
    const memoryUsed = parseMemory(memoryUsedStr);
    const memoryUsagePercent =
      memoryTotal && memoryTotal > 0 && memoryUsed !== null
        ? (memoryUsed / memoryTotal) * 100
        : null;

    // Extract scratch space information
    const scratchLocalTotalStr =
      pbsNode.attributes['resources_available.scratch_local'] || null;
    const scratchLocalAssignedStr =
      pbsNode.attributes['resources_assigned.scratch_local'] || null;
    const scratchLocalTotal = parseMemory(scratchLocalTotalStr);
    const scratchLocalUsed = parseMemory(scratchLocalAssignedStr);
    const scratchLocalAvailable =
      scratchLocalTotal !== null && scratchLocalUsed !== null
        ? scratchLocalTotal - scratchLocalUsed
        : scratchLocalTotal;

    const scratchSsdTotalStr =
      pbsNode.attributes['resources_available.scratch_ssd'] || null;
    const scratchSsdAssignedStr =
      pbsNode.attributes['resources_assigned.scratch_ssd'] || null;
    const scratchSsdTotal = parseMemory(scratchSsdTotalStr);
    const scratchSsdUsed = parseMemory(scratchSsdAssignedStr);
    const scratchSsdAvailable =
      scratchSsdTotal !== null && scratchSsdUsed !== null
        ? scratchSsdTotal - scratchSsdUsed
        : scratchSsdTotal;

    const scratchSharedTotalStr =
      pbsNode.attributes['resources_available.scratch_shared'] || null;
    const scratchSharedTotal = parseMemory(scratchSharedTotalStr);

    const scratchShmAvailable =
      pbsNode.attributes['resources_available.scratch_shm'] === 'True';

    // Check if node is in maintenance or reserved queue FIRST - this overrides everything
    // This must be checked before state/state_aux processing
    if (this.isNodeInMaintenanceOrReservedQueue(pbsNode)) {
      return {
        state: NodeState.MAINTENANCE,
        cpuUsage: null, // Don't show usage during maintenance
        cpuAssigned: null,
        gpuUsage: null,
        gpuCount: availableGpus > 0 ? availableGpus : null,
        gpuAssigned: null,
        gpuCapability,
        gpuMemory,
        cudaVersion,
        memoryTotal,
        memoryUsed: null, // Don't show usage during maintenance
        memoryUsagePercent: null,
        scratchLocalTotal,
        scratchLocalUsed: null,
        scratchLocalAvailable: scratchLocalTotal,
        scratchSsdTotal,
        scratchSsdUsed: null,
        scratchSsdAvailable: scratchSsdTotal,
        scratchSharedTotal,
        scratchShmAvailable,
      };
    }

    // Get state and state_aux, take the "worse" one
    const pbsState = pbsNode.attributes.state || '';
    const pbsStateAux = pbsNode.attributes.state_aux || '';
    const worseState = this.getWorseState(pbsState, pbsStateAux);

    // Map PBS state to our NodeState
    const mappedState = this.mapPbsStateToNodeState(worseState);

    // If mapped to maintenance or not-available, return early
    if (mappedState === NodeState.MAINTENANCE) {
      return {
        state: NodeState.MAINTENANCE,
        cpuUsage: null,
        cpuAssigned: null,
        gpuUsage: null,
        gpuCount: availableGpus > 0 ? availableGpus : null,
        gpuAssigned: null,
        gpuCapability,
        gpuMemory,
        cudaVersion,
        memoryTotal,
        memoryUsed: null,
        memoryUsagePercent: null,
        scratchLocalTotal,
        scratchLocalUsed: null,
        scratchLocalAvailable: scratchLocalTotal,
        scratchSsdTotal,
        scratchSsdUsed: null,
        scratchSsdAvailable: scratchSsdTotal,
        scratchSharedTotal,
        scratchShmAvailable,
      };
    }

    if (mappedState === NodeState.NOT_AVAILABLE) {
      return {
        state: NodeState.NOT_AVAILABLE,
        cpuUsage: null,
        cpuAssigned: null,
        gpuUsage: null,
        gpuCount: availableGpus > 0 ? availableGpus : null,
        gpuAssigned: null,
        gpuCapability,
        gpuMemory,
        cudaVersion,
        memoryTotal,
        memoryUsed: null,
        memoryUsagePercent: null,
        scratchLocalTotal,
        scratchLocalUsed: null,
        scratchLocalAvailable: scratchLocalTotal,
        scratchSsdTotal,
        scratchSsdUsed: null,
        scratchSsdAvailable: scratchSsdTotal,
        scratchSharedTotal,
        scratchShmAvailable,
      };
    }

    // Calculate usage percentages for occupancy states
    const cpuUsage =
      availableCpus > 0 ? (assignedCpus / availableCpus) * 100 : null;
    const gpuUsage =
      availableGpus > 0 ? (assignedGpus / availableGpus) * 100 : null;

    // Determine state based on usage (free, partially_used, used)
    let state: NodeState = NodeState.UNKNOWN;
    if (cpuUsage !== null) {
      if (cpuUsage === 0) {
        state = NodeState.FREE;
      } else if (cpuUsage === 100) {
        state = NodeState.USED;
      } else {
        state = NodeState.PARTIALLY_USED;
      }
    }

    return {
      state,
      cpuUsage: cpuUsage !== null ? Math.round(cpuUsage * 100) / 100 : null,
      cpuAssigned: assignedCpus > 0 ? assignedCpus : null,
      gpuUsage: gpuUsage !== null ? Math.round(gpuUsage * 100) / 100 : null,
      gpuCount: availableGpus > 0 ? availableGpus : null,
      gpuAssigned: assignedGpus > 0 ? assignedGpus : null,
      gpuCapability,
      gpuMemory,
      cudaVersion,
      memoryTotal,
      memoryUsed,
      memoryUsagePercent:
        memoryUsagePercent !== null
          ? Math.round(memoryUsagePercent * 100) / 100
          : null,
      scratchLocalTotal,
      scratchLocalUsed,
      scratchLocalAvailable,
      scratchSsdTotal,
      scratchSsdUsed,
      scratchSsdAvailable,
      scratchSharedTotal,
      scratchShmAvailable,
    };
  }

  /**
   * Find cluster by ID across all organizations
   */
  private findCluster(
    clusterId: string,
    organizations: PerunPhysicalMachine[],
  ): { resource: PerunResource; orgId: string } | null {
    for (const org of organizations) {
      const resources = org.resources || [];
      const resource = resources.find((r) => r.id === clusterId);
      if (resource) {
        return { resource, orgId: org.id };
      }
    }
    return null;
  }

  /**
   * Find node by name and cluster ID
   */
  private findNode(
    nodeName: string,
    clusterId: string,
    organizations: PerunPhysicalMachine[],
  ): { machine: PerunMachine; clusterId: string } | null {
    for (const org of organizations) {
      const resources = org.resources || [];
      const resource = resources.find((r) => r.id === clusterId);
      if (resource) {
        const machines = resource.machines || [];
        const machine = machines.find((m) => m.name === nodeName);
        if (machine) {
          return { machine, clusterId };
        }
      }
    }
    return null;
  }

  /**
   * Find node by name across all clusters
   */
  private findNodeByName(
    nodeName: string,
    organizations: PerunPhysicalMachine[],
  ): {
    machine: PerunMachine;
    clusterId: string;
    cluster: PerunResource;
    organization: PerunPhysicalMachine;
  } | null {
    // Extract hostname from FQDN for matching
    const nodeHostname = nodeName.split('.')[0];

    for (const org of organizations) {
      const resources = org.resources || [];
      for (const resource of resources) {
        const machines =
          resource.cluster === 'true'
            ? resource.machines || []
            : [{ name: resource.name, cpu: resource.cpu || 0 } as PerunMachine];
        // Try exact match first
        let machine = machines.find((m) => m.name === nodeName);
        if (machine) {
          return {
            machine,
            clusterId: resource.id,
            cluster: resource,
            organization: org,
          };
        }
        // Try hostname match (FQDN vs short name)
        machine = machines.find((m) => {
          const machineHostname = m.name.split('.')[0];
          return machineHostname === nodeHostname || m.name === nodeHostname;
        });
        if (machine) {
          return {
            machine,
            clusterId: resource.id,
            cluster: resource,
            organization: org,
          };
        }
      }
    }
    return null;
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

    // Step 1: First, collect all groups across all servers and merge them
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

    // Step 2: Filter out system-wide groups (80%+ of all users) BEFORE checking membership
    const MAX_PERCENTAGE_OF_ALL_USERS = 0.8; // 80%
    const filteredGroups = new Map<
      string,
      { gid: string; members: Set<string> }
    >();

    for (const [groupName, groupData] of allGroupsMap.entries()) {
      if (totalUsers > 0) {
        // Calculate unique base usernames in this group
        const groupUniqueUsers = new Set<string>();
        for (const member of groupData.members) {
          const memberBase = member.split('@')[0];
          groupUniqueUsers.add(memberBase);
          groupUniqueUsers.add(member);
        }
        const percentage = groupUniqueUsers.size / totalUsers;
        // Skip groups that contain too many users (system-wide groups)
        if (percentage > MAX_PERCENTAGE_OF_ALL_USERS) {
          continue;
        }
      }
      filteredGroups.set(groupName, groupData);
    }

    // Step 3: Now iterate over filtered groups and check if user is a member
    for (const [groupName, groupData] of filteredGroups.entries()) {
      // Check if user is a member of this group
      const isMember =
        groupData.members.has(usernameBase) || groupData.members.has(username);
      if (!isMember) {
        continue;
      }

      // Step 4: Add all members from this group (except the user themselves)
      for (const member of groupData.members) {
        if (member !== usernameBase && member !== username) {
          result.add(member);
        }
      }
    }

    return result;
  }
}
