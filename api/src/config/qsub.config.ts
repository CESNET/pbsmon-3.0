import { PbsNode, PbsQueue } from '@/modules/data-collection/types/pbs.types';
import { QueueListDTO } from '@/modules/queues/dto/queue-list.dto';

export type QsubFieldType =
  | 'select'
  | 'time'
  | 'input'
  | 'number'
  | 'boolean'
  | 'multiselect'
  | 'memory';

export interface QsubFieldContext {
  [fieldName: string]: any;
}

export type QsubFilterFunction = (
  node: PbsNode,
  value: any,
  queues?: QueueListDTO[],
  context?: QsubFieldContext,
) => boolean;

export type QsubScriptParamFunction = (
  value: any,
  context?: QsubFieldContext,
) => string | null;

export type QsubDataCollectionFunction = (
  nodes: PbsNode[],
  queues: PbsQueue[],
) => any[] | null;

export interface MultilingualText {
  en: string;
  cs: string;
}

export interface QsubFieldConfig {
  name: string;
  type: QsubFieldType;
  label: MultilingualText;
  description?: MultilingualText;
  required?: boolean;
  default?: any;
  category: 'basic' | 'advanced';
  filterFunction: QsubFilterFunction;
  scriptParamFunction: QsubScriptParamFunction;
  dataCollectionFunction: QsubDataCollectionFunction;
  dependsOn?: string[]; // Field names this field depends on
}

export const qsubConfig: QsubFieldConfig[] = [
  // ========== BASIC SETTINGS ==========
  {
    name: 'walltime',
    type: 'time',
    label: { en: 'Walltime', cs: 'Doba běhu' },
    required: true,
    default: '01:00:00',
    category: 'basic',
    filterFunction: (node, value, queues) => {
      if (!value) return true;
      // Walltime filtering is typically done at queue level, not node level
      // This is a placeholder - actual filtering would need queue data
      return true;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      // Format: -l walltime=HH:MM:SS
      return `-l walltime=${value}`;
    },
    dataCollectionFunction: () => null, // Time input doesn't need options
  },

  {
    name: 'queue',
    type: 'select',
    label: { en: 'Queue', cs: 'Fronta' },
    required: false,
    default: 'default@pbs-m1.metacentrum.cz',
    category: 'basic',
    filterFunction: (node, value, queues) => {
      if (!value) return true;
      const queueList = node.attributes['resources_available.queue_list'];
      if (!queueList) return false;

      const queueName = value.includes('@') ? value.split('@')[0] : value;

      const findQueue = (
        queueList: QueueListDTO[],
        name: string,
      ): QueueListDTO | null => {
        for (const queue of queueList) {
          if (queue.name === name) {
            return queue;
          }
          if (queue.children) {
            const found = findQueue(queue.children, name);
            if (found) return found;
          }
        }
        return null;
      };

      const queue = queues ? findQueue(queues, queueName) : null;
      if (!queue) return false;

      // If it's a routing queue, collect all child execution queues recursively
      const getAllExecutionQueues = (q: QueueListDTO): string[] => {
        const executionQueues: string[] = [];
        if (q.queueType === 'Execution') {
          executionQueues.push(q.name);
        }
        if (q.children) {
          for (const child of q.children) {
            executionQueues.push(...getAllExecutionQueues(child));
            if (child.defaultQueueList) {
              executionQueues.push(child.defaultQueueList);
            }
          }
        }
        return executionQueues;
      };

      // Get all execution queues (if routing queue, get all children; if execution queue, just itself)
      const executionQueues = getAllExecutionQueues(queue);

      // Check if node is in any of the execution queues
      const nodeQueues = queueList.split(',').map((q) => q.trim());
      return executionQueues.some((eq) => nodeQueues.includes(eq));
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-q ${value}`;
    },
    dataCollectionFunction: (nodes, queues) => {
      // This will be filtered and formatted by user access in the service
      // Return execution queues only (not route queues)
      if (!queues) return [];

      return queues
        .filter((q) => q.attributes.queue_type === 'Execution')
        .map((q) => q.name)
        .sort();
    },
  },

  {
    name: 'ncpu',
    type: 'number',
    label: { en: 'CPU Count', cs: 'Počet CPU' },
    required: true,
    default: 1,
    category: 'basic',
    filterFunction: (node, value) => {
      if (!value) return false;
      const availableCpus = parseInt(
        node.attributes['resources_available.ncpus'] || '0',
        10,
      );
      return availableCpus >= value;
    },
    scriptParamFunction: (value, context) => {
      if (!value) return null;
      // Build select statement - this will be combined with other select params
      const parts = [`select=1:ncpus=${value}`];

      // Add memory if specified
      if (context?.memory && context.memory.amount) {
        const memValue =
          context.memory.unit === 'gb'
            ? `${context.memory.amount}gb`
            : `${context.memory.amount}mb`;
        parts.push(`mem=${memValue}`);
      }

      // Add GPU if specified
      if (context?.ngpu && context.ngpu > 0) {
        parts.push(`ngpus=${context.ngpu}`);
      }

      // Add GPU memory if specified
      if (context?.gpu_memory && context.gpu_memory.amount) {
        const gpuMemValue =
          context.gpu_memory.unit === 'gb'
            ? `${context.gpu_memory.amount}gb`
            : `${context.gpu_memory.amount}mb`;
        parts.push(`gpu_mem=${gpuMemValue}`);
      }

      // Add scratch if specified
      if (context?.scratch_type && context.scratch_type !== 'shm') {
        let resourceName: string;
        if (context.scratch_type === 'local') {
          resourceName = 'scratch_local';
        } else if (context.scratch_type === 'shared') {
          resourceName = 'scratch_shared';
        } else if (context.scratch_type === 'ssd') {
          resourceName = 'scratch_ssd';
        } else {
          resourceName = 'scratch_local';
        }

        if (context.scratch_memory) {
          parts.push(
            `${resourceName}=${context.scratch_memory.amount}${context.scratch_memory.unit}`,
          );
        }
      }

      if (context?.scratch_type && context.scratch_type === 'shm') {
        parts.push(
          `scratch_shm=True`,
        );
      }

      return `-l ${parts.join(':')}`;
    },
    dataCollectionFunction: (nodes) => {
      // Return unique CPU counts available
      const cpuCounts = new Set<number>();
      nodes.forEach((node) => {
        const ncpus = parseInt(
          node.attributes['resources_available.ncpus'] || '0',
          10,
        );
        if (ncpus > 0) {
          cpuCounts.add(ncpus);
        }
      });
      return Array.from(cpuCounts).sort((a, b) => a - b);
    },
  },

  {
    name: 'memory',
    type: 'memory',
    label: { en: 'RAM Memory', cs: 'RAM paměť' },
    required: false,
    default: { amount: 1, unit: 'gb' },
    category: 'basic',
    filterFunction: (node, value) => {
      if (!value || !value.amount) return true;
      const availableMem = parseSize(
        node.attributes['resources_available.mem'] || '0',
      );
      // Convert value to GB for comparison
      const requiredMem =
        value.unit === 'gb' ? value.amount : value.amount / 1024; // Convert MB to GB
      return availableMem >= requiredMem;
    },
    scriptParamFunction: (value) => {
      // Memory is handled in ncpu scriptParamFunction to combine select params
      return null;
    },
    dataCollectionFunction: () => null, // Memory input doesn't need options
  },

  {
    name: 'ngpu',
    type: 'number',
    label: { en: 'GPU Count', cs: 'Počet GPU' },
    required: false,
    default: 0,
    category: 'basic',
    filterFunction: (node, value) => {
      if (!value || value === 0) return true;
      const availableGpus = parseInt(
        node.attributes['resources_available.ngpus'] || '0',
        10,
      );
      return availableGpus >= value;
    },
    scriptParamFunction: (value) => {
      // GPU is handled in ncpu scriptParamFunction to combine select params
      return null;
    },
    dataCollectionFunction: (nodes) => {
      const gpuCounts = new Set<number>();
      nodes.forEach((node) => {
        const ngpus = parseInt(
          node.attributes['resources_available.ngpus'] || '0',
          10,
        );
        if (ngpus > 0) {
          gpuCounts.add(ngpus);
        }
      });
      return Array.from(gpuCounts).sort((a, b) => a - b);
    },
  },

  {
    name: 'gpu_memory',
    type: 'memory',
    label: { en: 'GPU Memory', cs: 'GPU paměť' },
    required: false,
    default: null,
    category: 'basic',
    filterFunction: (node, value) => {
      if (!value || !value.amount) return true;
      const gpuMemStr = node.attributes['resources_available.gpu_mem'];
      if (!gpuMemStr) return false;
      const availableGpuMem = parseSize(gpuMemStr);
      // Convert value to GB for comparison
      const requiredGpuMem =
        value.unit === 'gb' ? value.amount : value.amount / 1024; // Convert MB to GB
      return availableGpuMem >= requiredGpuMem;
    },
    scriptParamFunction: (value) => {
      // GPU memory is handled in ncpu scriptParamFunction to combine select params
      return null;
    },
    dataCollectionFunction: () => null, // Memory input doesn't need options
  },

  {
    name: 'scratch_type',
    type: 'select',
    label: { en: 'Scratch Type', cs: 'Typ scratch úložiště' },
    required: false,
    default: null,
    category: 'basic',
    filterFunction: (node, value) => {
      if (!value) return true;
      if (value === 'shm') {
        return node.attributes['resources_available.scratch_shm'] === 'True';
      }
      if (value === 'local') {
        return !!node.attributes['resources_available.scratch_local'];
      }
      if (value === 'shared') {
        return !!node.attributes['resources_available.scratch_shared'];
      }
      if (value === 'ssd') {
        return !!node.attributes['resources_available.scratch_ssd'];
      }
      return false;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      // Scratch type is handled in scratch_memory parameter
      return null;
    },
    dataCollectionFunction: () => {
      return [
        { value: 'local', label: 'Local' },
        { value: 'shared', label: 'Shared' },
        { value: 'shm', label: 'SHM' },
        { value: 'ssd', label: 'SSD' },
      ];
    },
  },

  {
    name: 'scratch_memory',
    type: 'memory',
    label: { en: 'Scratch Memory', cs: 'Scratch paměť' },
    required: false,
    default: { amount: 400, unit: 'mb' },
    category: 'basic',
    dependsOn: ['scratch_type'],
    filterFunction: (node, value, queues, context) => {
      if (!value || !value.amount || !context?.scratch_type) return true;
      if (context.scratch_type === 'shm') return true; // Not applicable for shm

      let attrName: string;
      if (context.scratch_type === 'local') {
        attrName = 'resources_available.scratch_local';
      } else if (context.scratch_type === 'shared') {
        attrName = 'resources_available.scratch_shared';
      } else if (context.scratch_type === 'ssd') {
        attrName = 'resources_available.scratch_ssd';
      } else {
        return true;
      }

      const available = parseSize(node.attributes[attrName] || '0');
      // Convert value to GB for comparison
      const requiredSize =
        value.unit === 'gb' ? value.amount : value.amount / 1024; // Convert MB to GB
      return available >= requiredSize;
    },
    scriptParamFunction: (value, context) => {
      // Scratch memory is handled in ncpu scriptParamFunction to combine select params
      return null;
    },
    dataCollectionFunction: () => null,
  },

  {
    name: 'cluster',
    type: 'select',
    label: { en: 'Cluster', cs: 'Cluster' },
    required: false,
    default: null,
    category: 'basic',
    filterFunction: (node, value) => {
      if (!value) return true;
      const nodeCluster = node.attributes['resources_available.cluster'];
      return nodeCluster === value;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      // Cluster selection uses cl_<clustername> attribute
      return `-l select=1:cl_${value}=1`;
    },
    dataCollectionFunction: (nodes) => {
      const clusters = new Set<string>();
      nodes.forEach((node) => {
        const cluster = node.attributes['resources_available.cluster'];
        if (cluster) {
          clusters.add(cluster);
        }
      });
      return Array.from(clusters).sort();
    },
  },

  {
    name: 'vnode',
    type: 'select',
    label: { en: 'Node (vnode)', cs: 'Uzel (vnode)' },
    required: false,
    default: null,
    category: 'basic',
    filterFunction: (node, value) => {
      if (!value) return true;
      const nodeVnode = node.attributes['resources_available.vnode'];
      return nodeVnode === value || node.name === value;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:vnode=${value}`;
    },
    dataCollectionFunction: (nodes) => {
      return nodes.map((node) => ({
        value: node.attributes['resources_available.vnode'] || node.name,
        label: node.attributes['resources_available.vnode'] || node.name,
      }));
    },
  },

  {
    name: 'place',
    type: 'select',
    label: { en: 'Place/Location', cs: 'Místo/Lokace' },
    required: false,
    default: null,
    category: 'basic',
    filterFunction: (node, value) => {
      if (!value) return true;
      const locationAttr = `resources_available.${value}`;
      return node.attributes[locationAttr] === 'True';
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:${value}=1`;
    },
    dataCollectionFunction: () => {
      return [
        { value: 'brno', label: 'Brno' },
        { value: 'budejovice', label: 'Budejovice' },
        { value: 'plzen', label: 'Plzen' },
        { value: 'praha', label: 'Praha' },
        { value: 'liberec', label: 'Liberec' },
      ];
    },
  },

  // ========== ADVANCED SETTINGS ==========

  {
    name: 'arch',
    type: 'select',
    label: { en: 'Architecture', cs: 'Architektura' },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value) return true;
      const arch = node.attributes['resources_available.arch'];
      return arch === value;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:arch=${value}`;
    },
    dataCollectionFunction: (nodes) => {
      const archs = new Set<string>();
      nodes.forEach((node) => {
        const arch = node.attributes['resources_available.arch'];
        if (arch) {
          archs.add(arch);
        }
      });
      return Array.from(archs).sort();
    },
  },

  {
    name: 'cgroups',
    type: 'multiselect',
    label: { en: 'Cgroups', cs: 'Cgroups' },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value || !Array.isArray(value) || value.length === 0) return true;
      const nodeCgroups = node.attributes['resources_available.cgroups'];
      if (!nodeCgroups) return false;
      const nodeCgroupsList = nodeCgroups.split(',').map((c) => c.trim());
      return value.every((cg) => nodeCgroupsList.includes(cg));
    },
    scriptParamFunction: (value) => {
      if (!value || !Array.isArray(value) || value.length === 0) return null;
      return `-l select=1:cgroups=${value.join(',')}`;
    },
    dataCollectionFunction: (nodes) => {
      const cgroups = new Set<string>();
      nodes.forEach((node) => {
        const nodeCgroups = node.attributes['resources_available.cgroups'];
        if (nodeCgroups) {
          nodeCgroups.split(',').forEach((cg) => {
            cgroups.add(cg.trim());
          });
        }
      });
      return Array.from(cgroups).sort();
    },
  },

  {
    name: 'cpu_flag',
    type: 'multiselect',
    label: { en: 'CPU Flag', cs: 'Vlastnosti CPU' },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value || !Array.isArray(value) || value.length === 0) return true;
      const nodeFlags = node.attributes['resources_available.cpu_flag'];
      if (!nodeFlags) return false;
      const nodeFlagsList = nodeFlags.split(',').map((f) => f.trim());
      return value.every((flag) => nodeFlagsList.includes(flag));
    },
    scriptParamFunction: (value) => {
      if (!value || !Array.isArray(value) || value.length === 0) return null;
      return `-l select=1:cpu_flag=${value.join(',')}`;
    },
    dataCollectionFunction: (nodes) => {
      const flags = new Set<string>();
      nodes.forEach((node) => {
        const nodeFlags = node.attributes['resources_available.cpu_flag'];
        if (nodeFlags) {
          nodeFlags.split(',').forEach((flag) => {
            flags.add(flag.trim());
          });
        }
      });
      return Array.from(flags).sort();
    },
  },

  {
    name: 'cpu_vendor',
    type: 'select',
    label: { en: 'CPU Vendor', cs: 'Výrobce CPU' },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value) return true;
      const vendor = node.attributes['resources_available.cpu_vendor'];
      return vendor === value;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:cpu_vendor=${value}`;
    },
    dataCollectionFunction: (nodes) => {
      const vendors = new Set<string>();
      nodes.forEach((node) => {
        const vendor = node.attributes['resources_available.cpu_vendor'];
        if (vendor) {
          vendors.add(vendor);
        }
      });
      return Array.from(vendors).sort();
    },
  },

  {
    name: 'gpu_cap',
    type: 'multiselect',
    label: { en: 'GPU Capabilities', cs: 'Vlastnosti GPU' },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value || !Array.isArray(value) || value.length === 0) return true;
      const nodeCaps = node.attributes['resources_available.gpu_cap'];
      if (!nodeCaps) return false;
      const nodeCapsList = nodeCaps.split(',').map((c) => c.trim());
      return value.every((cap) => nodeCapsList.includes(cap));
    },
    scriptParamFunction: (value) => {
      if (!value || !Array.isArray(value) || value.length === 0) return null;
      return `:gpu_cap=${value.join(',')}`;
    },
    dataCollectionFunction: (nodes) => {
      const caps = new Set<string>();
      nodes.forEach((node) => {
        const nodeCaps = node.attributes['resources_available.gpu_cap'];
        if (nodeCaps) {
          nodeCaps.split(',').forEach((cap) => {
            caps.add(cap.trim());
          });
        }
      });
      return Array.from(caps).sort();
    },
  },

  {
    name: 'host_licenses',
    type: 'multiselect',
    label: { en: 'Host Licenses', cs: 'Licence na uzlu' },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value || !Array.isArray(value) || value.length === 0) return true;
      const nodeLicenses = node.attributes['resources_available.host_licenses'];
      if (!nodeLicenses) return false;
      const nodeLicensesList = nodeLicenses.split(',').map((l) => l.trim());
      return value.every((license) => nodeLicensesList.includes(license));
    },
    scriptParamFunction: (value) => {
      if (!value || !Array.isArray(value) || value.length === 0) return null;
      return `-l select=1:host_licenses=${value.join(',')}`;
    },
    dataCollectionFunction: (nodes) => {
      const licenses = new Set<string>();
      nodes.forEach((node) => {
        const nodeLicenses =
          node.attributes['resources_available.host_licenses'];
        if (nodeLicenses) {
          nodeLicenses.split(',').forEach((license) => {
            licenses.add(license.trim());
          });
        }
      });
      return Array.from(licenses).sort();
    },
  },

  {
    name: 'luna',
    type: 'select',
    label: { en: 'Luna', cs: 'Luna' },
    description: {
      en: 'Luna cluster subdivision by year of purchase',
      cs: 'Podrozdělení clusteru Luna podle roku pořízení',
    },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value) return true;
      const luna = node.attributes['resources_available.luna'];
      return luna === value;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:luna=${value}`;
    },
    dataCollectionFunction: (nodes) => {
      const lunaValues = new Set<string>();
      nodes.forEach((node) => {
        const luna = node.attributes['resources_available.luna'];
        if (luna) {
          lunaValues.add(luna);
        }
      });
      return Array.from(lunaValues).sort();
    },
  },

  {
    name: 'pbs_server',
    type: 'select',
    label: { en: 'PBS Server', cs: 'PBS Server' },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value) return true;
      const server = node.attributes['resources_available.pbs_server'];
      return server === value;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:pbs_server=${value}`;
    },
    dataCollectionFunction: (nodes) => {
      const servers = new Set<string>();
      nodes.forEach((node) => {
        const server = node.attributes['resources_available.pbs_server'];
        if (server) {
          servers.add(server);
        }
      });
      return Array.from(servers).sort();
    },
  },

  {
    name: 'singularity',
    type: 'boolean',
    label: { en: 'Singularity', cs: 'Singularity' },
    required: false,
    default: false,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value) return true;
      return node.attributes['resources_available.singularity'] === 'True';
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:singularity=1`;
    },
    dataCollectionFunction: () => null, // Boolean doesn't need options
  },

  {
    name: 'spec',
    type: 'number',
    label: { en: 'SPEC', cs: 'SPEC' },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value) return true;
      const spec = parseFloat(
        node.attributes['resources_available.spec'] || '0',
      );
      return spec >= value;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:spec=${value}`;
    },
    dataCollectionFunction: (nodes) => {
      const specs = new Set<number>();
      nodes.forEach((node) => {
        const spec = parseFloat(
          node.attributes['resources_available.spec'] || '0',
        );
        if (spec > 0) {
          specs.add(spec);
        }
      });
      return Array.from(specs).sort((a, b) => a - b);
    },
  },

  {
    name: 'osfamily',
    type: 'select',
    label: { en: 'OS Family', cs: 'Rodina OS' },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value) return true;
      const osfamily = node.attributes['resources_available.osfamily'];
      return osfamily === value;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:osfamily=${value}`;
    },
    dataCollectionFunction: (nodes) => {
      const osfamilies = new Set<string>();
      nodes.forEach((node) => {
        const osfamily = node.attributes['resources_available.osfamily'];
        if (osfamily) {
          osfamilies.add(osfamily);
        }
      });
      return Array.from(osfamilies).sort();
    },
  },

  {
    name: 'os',
    type: 'select',
    label: { en: 'OS', cs: 'OS' },
    required: false,
    default: null,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value) return true;
      const os = node.attributes['resources_available.os'];
      return os === value;
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:os=${value}`;
    },
    dataCollectionFunction: (nodes) => {
      const osVersions = new Set<string>();
      nodes.forEach((node) => {
        const os = node.attributes['resources_available.os'];
        if (os) {
          osVersions.add(os);
        }
      });
      return Array.from(osVersions).sort();
    },
  },

  {
    name: 'umg',
    type: 'boolean',
    label: { en: 'UMG', cs: 'UMG' },
    required: false,
    default: false,
    category: 'advanced',
    filterFunction: (node, value) => {
      if (!value) return true;
      return node.attributes['resources_available.umg'] === 'True';
    },
    scriptParamFunction: (value) => {
      if (!value) return null;
      return `-l select=1:umg=1`;
    },
    dataCollectionFunction: () => null, // Boolean doesn't need options
  },
];

export function parseSize(sizeStr: string): number {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(gb|mb|tb|kb)?$/i);
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
}

export function getBasicFields(): QsubFieldConfig[] {
  return qsubConfig.filter((field) => field.category === 'basic');
}

export function getAdvancedFields(): QsubFieldConfig[] {
  return qsubConfig.filter((field) => field.category === 'advanced');
}

export function getFieldConfig(name: string): QsubFieldConfig | undefined {
  return qsubConfig.find((field) => field.name === name);
}
