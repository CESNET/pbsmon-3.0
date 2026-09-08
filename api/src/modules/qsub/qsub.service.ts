import { Injectable } from '@nestjs/common';
import { DataCollectionService } from '@/modules/data-collection/data-collection.service';
import { InfrastructureService } from '@/modules/infrastructure/infrastructure.service';
import { QueuesService } from '@/modules/queues/queues.service';
import {
  qsubConfig,
  QsubFieldConfig,
  QsubFieldContext,
  getBasicFields,
  getAdvancedFields,
} from '@/config/qsub.config';
import { PbsNode, PbsQueue } from '@/modules/data-collection/types/pbs.types';
import {
  QsubPreviewRequestDto,
  QsubPreviewResponseDto,
  QualifiedNodeDto,
} from './dto/qsub-preview.dto';
import {
  InfrastructureNodeListDTO,
  NodeState,
} from '@/modules/infrastructure/dto/infrastructure-list.dto';
import { UserContext } from '@/common/types/user-context.types';
import { QueueListDTO } from '@/modules/queues/dto/queue-list.dto';

@Injectable()
export class QsubService {
  constructor(
    private readonly dataCollectionService: DataCollectionService,
    private readonly infrastructureService: InfrastructureService,
    private readonly queuesService: QueuesService,
  ) {}

  /**
   * Get QSUB configuration for frontend
   */
  getConfig(userContext: UserContext) {
    // Get all nodes and queues for data collection
    const pbsData = this.dataCollectionService.getPbsData();
    const allNodes: PbsNode[] = [];
    const allQueues: PbsQueue[] = [];

    if (pbsData?.servers) {
      for (const serverData of Object.values(pbsData.servers)) {
        if (serverData.nodes?.items) {
          allNodes.push(...serverData.nodes.items);
        }
        if (serverData.queues?.items) {
          allQueues.push(...serverData.queues.items);
        }
      }
    }

    // Get queues list with user access filtering
    const queuesList = this.queuesService.getQueuesList(userContext);

    // Helper function to flatten queue tree and collect Execution queues
    const flattenQueues = (
      queues: typeof queuesList.queues,
    ): typeof queuesList.queues => {
      const result: typeof queuesList.queues = [];
      for (const queue of queues) {
        // Only include Execution queues that can be directly submitted to and user has access
        // hasAccess must be explicitly true (not just truthy, to handle undefined)
        if (queue.canBeDirectlySubmitted === true && queue.hasAccess === true) {
          result.push(queue);
        }
        // Recursively process children
        if (queue.children) {
          result.push(...flattenQueues(queue.children));
        }
      }
      return result;
    };

    // Get all accessible Execution queues
    const accessibleQueues = flattenQueues(queuesList.queues);

    // Collect data for each field
    const fields = qsubConfig.map((field) => {
      let options = field.dataCollectionFunction(allNodes, allQueues);

      // Special handling for queue field - use queues from QueuesService directly
      if (field.name === 'queue') {
        // Build options directly from accessible queues
        options = accessibleQueues.map((queue) => {
          const fullName = queue.server
            ? `${queue.name}@${queue.server}.metacentrum.cz`
            : queue.name;
          return {
            value: fullName,
            label: fullName,
          };
        });

        // Sort by name
        options.sort((a, b) => a.value.localeCompare(b.value));

        // Find first queue where the queue name (before @) starts with "default"
        let defaultQueueValue: string | null = null;
        if (options.length > 0) {
          const defaultQueue = options.find((opt) => {
            const queueName = opt.value.split('@')[0]; // Get queue name part before @
            return queueName.startsWith('default');
          });
          defaultQueueValue = defaultQueue?.value || options[0].value; // Fallback to first queue if no default found
        }

        return {
          name: field.name,
          type: field.type,
          label: field.label,
          description: field.description,
          required: field.required,
          default: defaultQueueValue,
          category: field.category,
          dependsOn: field.dependsOn,
          options: options || undefined,
        };
      }

      // Special handling for scratch_type - set first value as default
      if (
        field.name === 'scratch_type' &&
        Array.isArray(options) &&
        options.length > 0
      ) {
        const firstValue =
          typeof options[0] === 'string' ? options[0] : options[0].value;
        return {
          name: field.name,
          type: field.type,
          label: field.label,
          description: field.description,
          required: field.required,
          default: firstValue,
          category: field.category,
          dependsOn: field.dependsOn,
          options: options || undefined,
        };
      }

      return {
        name: field.name,
        type: field.type,
        label: field.label,
        description: field.description,
        required: field.required,
        default: field.default,
        category: field.category,
        dependsOn: field.dependsOn,
        options: options || undefined,
      };
    });

    return { fields };
  }

  /**
   * Generate qsub command and find qualified nodes
   */
  async getPreview(
    request: QsubPreviewRequestDto,
    userContext: UserContext,
  ): Promise<QsubPreviewResponseDto> {
    const pbsData = this.dataCollectionService.getPbsData();
    if (!pbsData?.servers) {
      return {
        qsubCommand: '',
        qsubScript: '',
        qualifiedNodes: [],
        totalCount: 0,
        immediatelyAvailableCount: 0,
      };
    }

    // Collect all nodes and queues
    const allNodes: PbsNode[] = [];
    const allQueues: PbsQueue[] = [];
    const nodeToServerMap = new Map<PbsNode, string>();

    for (const [serverName, serverData] of Object.entries(pbsData.servers)) {
      if (serverData.nodes?.items) {
        for (const node of serverData.nodes.items) {
          allNodes.push(node);
          nodeToServerMap.set(node, serverName);
        }
      }
      if (serverData.queues?.items) {
        allQueues.push(...serverData.queues.items);
      }
    }

    const hierarchicalQueues: QueueListDTO[] =
      this.queuesService.getQueuesList(userContext)?.queues || [];

    // Build context from request
    const context: QsubFieldContext = { ...request };

    // Filter nodes based on all field configurations
    const qualifiedPbsNodes = allNodes.filter((node) => {
      return qsubConfig.every((field) => {
        const value = (request as any)[field.name];
        // Handle empty values (null, undefined, empty string, empty object)
        if (
          value === undefined ||
          value === null ||
          value === '' ||
          (typeof value === 'object' &&
            value !== null &&
            Object.keys(value).length === 0)
        ) {
          // If field is not set and not required, skip filtering
          if (!field.required) return true;
          // If required and not set, filter out
          return false;
        }
        // Handle memory type - check if it has amount
        if (typeof value === 'object' && value !== null && 'amount' in value) {
          // For memory fields, check if amount is empty or zero
          if (!value.amount || value.amount === '' || value.amount === 0) {
            if (!field.required) return true;
            return false;
          }
        }
        // The queue and walltime fields need the hierarchical queue tree (with
        // children and walltime limits); other fields get the flat PbsQueue array.
        // Type assertion needed because filterFunction accepts QueueListDTO[] | PbsQueue[]
        const queuesForFilter =
          field.name === 'queue' || field.name === 'walltime'
            ? (hierarchicalQueues as any)
            : (allQueues as any);
        return field.filterFunction(node, value, queuesForFilter, context);
      });
    });

    // Get infrastructure list to map PBS nodes to infrastructure nodes
    const infrastructureList =
      this.infrastructureService.getInfrastructureList();
    const allInfrastructureNodes: InfrastructureNodeListDTO[] = [];

    // Flatten infrastructure nodes
    for (const org of infrastructureList.data) {
      for (const cluster of org.clusters) {
        for (const node of cluster.nodes) {
          allInfrastructureNodes.push(node);
        }
      }
    }

    // Map qualified PBS nodes to infrastructure nodes
    const qualifiedNodes: QualifiedNodeDto[] = qualifiedPbsNodes
      .map((pbsNode) => {
        // Find matching infrastructure node
        const infraNode = allInfrastructureNodes.find((infraNode) => {
          // Try various matching strategies
          const pbsHostname = pbsNode.name.split('.')[0];
          const infraHostname = infraNode.name.split('.')[0];

          return (
            infraNode.name === pbsNode.name ||
            infraHostname === pbsHostname ||
            infraNode.name === pbsNode.attributes['resources_available.host'] ||
            infraNode.name === pbsNode.attributes['resources_available.vnode']
          );
        });

        if (!infraNode) {
          return null;
        }

        // Check if node can run immediately - must have enough free resources
        let canRunImmediately = false;

        // Node must be in a runnable state (not maintenance, not used)
        if (
          infraNode.actualState === NodeState.FREE ||
          infraNode.actualState === NodeState.PARTIALLY_USED
        ) {
          // Calculate free resources
          const totalCpus = infraNode.cpu || 0;
          const assignedCpus = infraNode.cpuAssigned || 0;
          const freeCpus = totalCpus - assignedCpus;

          const totalGpus = infraNode.gpuCount || 0;
          const assignedGpus = infraNode.gpuAssigned || 0;
          const freeGpus = totalGpus - assignedGpus;

          const totalMemory = infraNode.memoryTotal || 0;
          const usedMemory = infraNode.memoryUsed || 0;
          const freeMemory = totalMemory - usedMemory;

          // Check if node has enough free resources for the job
          const requiredCpus = request.ncpu || 0;
          const requiredGpus = request.ngpu || 0;

          // Convert memory requirement to GB if specified
          let requiredMemory = 0;
          if (request.memory && request.memory.amount) {
            requiredMemory =
              request.memory.unit === 'gb'
                ? request.memory.amount
                : request.memory.amount / 1024; // Convert MB to GB
          }

          // Check GPU memory if specified (GPU memory is per GPU)
          let hasEnoughGpuMemory = true;
          if (
            request.gpu_memory &&
            request.gpu_memory.amount &&
            requiredGpus > 0
          ) {
            const requiredGpuMemory =
              request.gpu_memory.unit === 'gb'
                ? request.gpu_memory.amount
                : request.gpu_memory.amount / 1024; // Convert MB to GB

            // Parse GPU memory from node (format: "46068mb" or "46gb")
            if (infraNode.gpuMemory) {
              const parseGpuMemory = (gpuMemStr: string): number => {
                const match = gpuMemStr.match(
                  /^(\d+(?:\.\d+)?)\s*(gb|mb|tb|kb)?$/i,
                );
                if (!match) return 0;
                const value = parseFloat(match[1]);
                const unit = (match[2] || 'gb').toLowerCase();
                switch (unit) {
                  case 'tb':
                    return value * 1024;
                  case 'gb':
                    return value;
                  case 'mb':
                    return value / 1024;
                  case 'kb':
                    return value / (1024 * 1024);
                  default:
                    return value;
                }
              };

              const availableGpuMemory = parseGpuMemory(infraNode.gpuMemory);
              hasEnoughGpuMemory = availableGpuMemory >= requiredGpuMemory;
            } else {
              hasEnoughGpuMemory = false;
            }
          }

          // Check if all requirements are met
          canRunImmediately =
            freeCpus >= requiredCpus &&
            freeGpus >= requiredGpus &&
            freeMemory >= requiredMemory &&
            hasEnoughGpuMemory;
        }

        return {
          ...infraNode,
          canRunImmediately,
        };
      })
      .filter((node): node is QualifiedNodeDto => node !== null);

    // Generate qsub command and shell script
    const qsubCommand = this.generateQsubCommand(request, context);
    const qsubScript = this.generateQsubScript(request, context);

    const immediatelyAvailableCount = qualifiedNodes.filter(
      (node) => node.canRunImmediately,
    ).length;

    return {
      qsubCommand,
      qsubScript,
      qualifiedNodes,
      totalCount: qualifiedNodes.length,
      immediatelyAvailableCount,
    };
  }

  /**
   * Generate qsub command from request
   */
  private generateQsubCommand(
    request: QsubPreviewRequestDto,
    context: QsubFieldContext,
  ): string {
    const parts: string[] = ['qsub'];
    let selectParam: string | null = null;

    // Process each field to generate script parameters
    for (const field of qsubConfig) {
      const value = (request as any)[field.name];
      if (value === undefined || value === null || value === '') {
        continue;
      }

      const param = field.scriptParamFunction(value, context);
      if (param) {
        if (param.startsWith('-l select=')) {
          // This is a select parameter - merge with existing if any
          if (selectParam) {
            // Merge: extract resource parts from both
            const existingParts = selectParam.split(':').slice(1);
            const newParts = param.replace('-l select=1:', '').split(':');
            const allParts = [...existingParts, ...newParts];
            selectParam = `-l select=1:${allParts.join(':')}`;
          } else {
            selectParam = param;
          }
        } else if (param.startsWith(':')) {
          // This is a continuation of select param (e.g., :ngpus=1)
          if (selectParam) {
            selectParam += param;
          } else {
            // Create new select param
            selectParam = `-l select=1${param}`;
          }
        } else {
          // Regular parameter (e.g., -q queue_name, -l walltime=...)
          parts.push(param);
        }
      }
    }

    // Add select param if we have one
    if (selectParam) {
      parts.push(selectParam);
    }

    return parts.join(' ');
  }

  /**
   * Generate qsub shell script from request
   */
  private generateQsubScript(
    request: QsubPreviewRequestDto,
    context: QsubFieldContext,
  ): string {
    const lines: string[] = ['#!/bin/bash'];
    let selectParam: string | null = null;

    // Process each field to generate script parameters
    for (const field of qsubConfig) {
      const value = (request as any)[field.name];
      if (value === undefined || value === null || value === '') {
        continue;
      }

      const param = field.scriptParamFunction(value, context);
      if (param) {
        if (param.startsWith('-l select=')) {
          // This is a select parameter - merge with existing if any
          if (selectParam) {
            // Merge: extract resource parts from both
            const existingParts = selectParam.split(':').slice(1);
            const newParts = param.replace('-l select=1:', '').split(':');
            const allParts = [...existingParts, ...newParts];
            selectParam = `select=1:${allParts.join(':')}`;
          } else {
            selectParam = param.replace('-l ', '');
          }
        } else if (param.startsWith(':')) {
          // This is a continuation of select param (e.g., :ngpus=1)
          if (selectParam) {
            selectParam += param;
          } else {
            // Create new select param
            selectParam = `select=1${param}`;
          }
        } else if (param.startsWith('-q ')) {
          // Queue parameter
          const queueName = param.replace('-q ', '');
          lines.push(`#PBS -q ${queueName}`);
        } else if (param.startsWith('-l walltime=')) {
          // Walltime parameter
          const walltime = param.replace('-l walltime=', '');
          lines.push(`#PBS -l walltime=${walltime}`);
        } else if (param.startsWith('-l ')) {
          // Other -l parameters (shouldn't happen with current config, but handle it)
          const resource = param.replace('-l ', '');
          lines.push(`#PBS -l ${resource}`);
        }
      }
    }

    // Add select param if we have one
    if (selectParam) {
      lines.push(`#PBS -l ${selectParam}`);
    }

    // Add job name (optional, but common)
    lines.push('#PBS -N my_awesome_job');
    lines.push(''); // Empty line before script content

    return lines.join('\n');
  }
}
