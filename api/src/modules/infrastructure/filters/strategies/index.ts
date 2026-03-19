import { NodeFilterStrategy, ClusterFilterStrategy } from '../filter-strategy.interface';
import { InfrastructureNodeListDTO } from '../../dto/infrastructure-list.dto';
import { InfrastructureClusterListDTO } from '../../dto/infrastructure-list.dto';

// Node filter strategies
export class StateFilterStrategy implements NodeFilterStrategy {
  readonly key = 'states';
  
  matches(node: InfrastructureNodeListDTO, value: string | number): boolean {
    if (typeof value !== 'string') return false;
    return node.actualState === value;
  }
  
  validate(value: string | number): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }
}

export class QueueFilterStrategy implements NodeFilterStrategy {
  readonly key = 'queues';
  
  matches(node: InfrastructureNodeListDTO, value: string | number): boolean {
    if (typeof value !== 'string') return false;
    if (!node.queues) return false;
    return node.queues.includes(value);
  }
  
  validate(value: string | number): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }
}

export class NcpusFilterStrategy implements NodeFilterStrategy {
  readonly key = 'ncpus';
  
  matches(node: InfrastructureNodeListDTO, value: string | number): boolean {
    if (typeof value !== 'number') return false;
    return node.cpu >= value;
  }
  
  validate(value: string | number): boolean {
    return typeof value === 'number' && value >= 0;
  }
}

export class NgpusFilterStrategy implements NodeFilterStrategy {
  readonly key = 'ngpus';
  
  matches(node: InfrastructureNodeListDTO, value: string | number): boolean {
    if (typeof value !== 'number') return false;
    if (!node.gpuCount) return false;
    return node.gpuCount >= value;
  }
  
  validate(value: string | number): boolean {
    return typeof value === 'number' && value >= 0;
  }
}

// Cluster filter strategies
export class ClustersFilterStrategy implements ClusterFilterStrategy {
  readonly key = 'clusters';
  
  matches(cluster: InfrastructureClusterListDTO, value: string | number): boolean {
    if (typeof value !== 'string') return false;
    return cluster.name === value;
  }
  
  validate(value: string | number): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }
}

// Resource filter strategy (special case)
export class ResourceFilterStrategy implements NodeFilterStrategy {
  readonly key = 'resources';
  
  matches(node: InfrastructureNodeListDTO, value: string | number): boolean {
    if (typeof value !== 'string' || !node.resources) return false;

    const lt = value.includes('<=');
    const gt = value.includes('>=');
    const eq = !lt && !gt && value.includes('=');

    let [resourceName, resourceValue]: [string, string] = ['', ''];
    if (eq) {
      [resourceName, resourceValue] = value.split('=');
    } else if (lt) {
      [resourceName, resourceValue] = value.split('<=');
    } else if (gt) {
      [resourceName, resourceValue] = value.split('>=');
    }
    
    if (!resourceName || !resourceValue) return false;
    
    const nodeResourceValue = node.resources[resourceName];

    resourceValue = resourceValue.replace('GB', '');
    
    // Try to parse as number first
    const numValue = Number(resourceValue);
    if (!isNaN(numValue)) {
      if (eq) {
        return numValue === 0
          ? !nodeResourceValue
          : nodeResourceValue === numValue;
      } else if (lt) {
        return numValue === 0
          ? nodeResourceValue === 0 || !nodeResourceValue
          : typeof nodeResourceValue === 'number' && nodeResourceValue <= numValue;
      } else if (gt) {
        return typeof nodeResourceValue === 'number' && nodeResourceValue >= numValue;
      }
    }

    if (!nodeResourceValue) return false;

    if (!eq) {
      return false;
    }

    // Handle as string (comma-separated list)
    if (typeof nodeResourceValue === 'string') {
      return nodeResourceValue.split(',').map(v => v.trim()).includes(resourceValue);
    }
    
    return false;
  }
  
  validate(value: string | number): boolean {
    if (typeof value !== 'string') return false;
    const parts = value.split('=');
    return parts.length === 2 && parts[0].trim().length > 0 && parts[1].trim().length > 0;
  }
}

// Search filter strategy
export class SearchFilterStrategy implements NodeFilterStrategy {
  readonly key = 'search';
  
  matches(node: InfrastructureNodeListDTO, value: string | number): boolean {
    if (typeof value !== 'string') return false;
    const searchLower = value.toLowerCase();
    
    return (
      node.name.toLowerCase().includes(searchLower) ||
      node.actualState?.toLowerCase().includes(searchLower) ||
      node.queueNames?.some((q) => q.toLowerCase().includes(searchLower)) ||
      false
    );
  }
  
  validate(value: string | number): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }
}

export const ALL_FILTER_STRATEGIES: (NodeFilterStrategy | ClusterFilterStrategy)[] = [
  new StateFilterStrategy(),
  new QueueFilterStrategy(),
  new NcpusFilterStrategy(),
  new NgpusFilterStrategy(),
  new ClustersFilterStrategy(),
  new ResourceFilterStrategy(),
  new SearchFilterStrategy(),
];

/**
 * Create a registry of filter strategies by their keys
 */
export function createFilterStrategyRegistry(): Map<string, NodeFilterStrategy | ClusterFilterStrategy> {
  const registry = new Map<string, NodeFilterStrategy | ClusterFilterStrategy>();
  
  ALL_FILTER_STRATEGIES.forEach(strategy => {
    registry.set(strategy.key, strategy);
  });
  
  return registry;
}
