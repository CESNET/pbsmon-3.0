import { Injectable } from '@nestjs/common';
import { InfrastructureClusterListDTO } from '../dto/infrastructure-list.dto';
import { InfrastructureOrganizationListDTO } from '../dto/infrastructure-list.dto';
import {
  NodeFilterStrategy,
  ClusterFilterStrategy,
  FilterStrategyRegistry,
} from './filter-strategy.interface';
import {
  ALL_FILTER_STRATEGIES,
  createFilterStrategyRegistry,
} from './strategies/index';

export interface FilterResult {
  data: InfrastructureOrganizationListDTO[];
}

type FilterType = 'node' | 'cluster';

@Injectable()
export class InfrastructureFilterService {
  private readonly strategyRegistry: FilterStrategyRegistry;
  
  constructor() {
    this.strategyRegistry = createFilterStrategyRegistry();
  }
  
  /**
   * Apply multiple filters to infrastructure data
   */
  applyFilters(
    data: InfrastructureOrganizationListDTO[],
    filters: [string, string | number][] = [],
  ): InfrastructureOrganizationListDTO[] {
    if (!filters || filters.length === 0) {
      return data;
    }
    
    let filteredData = data;
    
    // Group filters by type for more efficient processing
    const nodeFilters: Array<{key: string, value: string | number, strategy: NodeFilterStrategy}> = [];
    const clusterFilters: Array<{key: string, value: string | number, strategy: ClusterFilterStrategy}> = [];
    
    // Organize filters by type
    for (const [key, value] of filters) {
      const strategy = this.strategyRegistry.get(key);
      
      if (!strategy) {
        // Skip unknown filter keys (could log warning in production)
        continue;
      }
      
      // Validate the filter value
      if (strategy.validate && !strategy.validate(value)) {
        continue;
      }
      
      if ('matches' in strategy && this.isNodeFilterStrategy(strategy)) {
        nodeFilters.push({ key, value, strategy });
      } else if ('matches' in strategy && this.isClusterFilterStrategy(strategy)) {
        clusterFilters.push({ key, value, strategy });
      }
    }
    
    // Apply cluster filters first (they reduce the data set more aggressively)
    if (clusterFilters.length > 0) {
      filteredData = this.applyClusterFilters(filteredData, clusterFilters);
    }
    
    // Then apply node filters
    if (nodeFilters.length > 0) {
      filteredData = this.applyNodeFilters(filteredData, nodeFilters);
    }
    
    return filteredData;
  }
  
  /**
   * Apply cluster-level filters
   */
  private applyClusterFilters(
    data: InfrastructureOrganizationListDTO[],
    filters: Array<{key: string, value: string | number, strategy: ClusterFilterStrategy}>,
  ): InfrastructureOrganizationListDTO[] {
    return data
      .map((org) => {
        const filteredClusters = org.clusters
          .filter((cluster) => {
            // All cluster filters must match (AND logic)
            return filters.every(({ value, strategy }) => 
              strategy.matches(cluster, value)
            );
          })
          .map((cluster) => ({
            ...cluster,
            nodeCount: cluster.nodes.length,
          }));
        
        if (filteredClusters.length === 0) {
          return null;
        }
        
        return {
          ...org,
          clusters: filteredClusters,
          clusterCount: filteredClusters.length,
        };
      })
      .filter(Boolean) as InfrastructureOrganizationListDTO[];
  }
  
  /**
   * Apply node-level filters
   */
  private applyNodeFilters(
    data: InfrastructureOrganizationListDTO[],
    filters: Array<{key: string, value: string | number, strategy: NodeFilterStrategy}>,
  ): InfrastructureOrganizationListDTO[] {
    return data
      .map((org) => {
        const filteredClusters = org.clusters
          .map((cluster) => {
            const filteredNodes = cluster.nodes
              .filter((node) => {
                // All node filters must match (AND logic)
                return filters.every(({ value, strategy }) => 
                  strategy.matches(node, value)
                );
              });
            
            if (filteredNodes.length === 0) {
              return null;
            }
            
            return {
              ...cluster,
              nodes: filteredNodes,
              nodeCount: filteredNodes.length,
              totalCpu: filteredNodes.reduce((sum, node) => sum + node.cpu, 0),
            };
          })
          .filter(Boolean) as InfrastructureClusterListDTO[];
        
        if (filteredClusters.length === 0) {
          return null;
        }
        
        return {
          ...org,
          clusters: filteredClusters,
          clusterCount: filteredClusters.length,
        };
      })
      .filter(Boolean) as InfrastructureOrganizationListDTO[];
  }
  
  /**
   * Apply search filter (special case that can search across multiple fields)
   */
  applySearchFilter(
    data: InfrastructureOrganizationListDTO[],
    searchQuery: string,
  ): InfrastructureOrganizationListDTO[] {
    if (!searchQuery?.trim()) {
      return data;
    }
    
    const searchLower = searchQuery.toLowerCase().trim();
    const searchStrategy = this.strategyRegistry.get('search') as NodeFilterStrategy;
    
    if (!searchStrategy) {
      return data;
    }
    
    return this.applyNodeFilters(data, [{
      key: 'search',
      value: searchLower,
      strategy: searchStrategy,
    }]);
  }
  
  /**
   * Type guard for NodeFilterStrategy
   */
  private isNodeFilterStrategy(strategy: any): strategy is NodeFilterStrategy {
    return strategy && typeof strategy.matches === 'function' && strategy.key !== 'clusters';
  }
  
  /**
   * Type guard for ClusterFilterStrategy
   */
  private isClusterFilterStrategy(strategy: any): strategy is ClusterFilterStrategy {
    return strategy && typeof strategy.matches === 'function' && strategy.key === 'clusters';
  }
  
  /**
   * Get all available filter keys
   */
  getAvailableFilterKeys(): string[] {
    return Array.from(this.strategyRegistry.keys());
  }
}
