import { InfrastructureNodeListDTO } from '../dto/infrastructure-list.dto';
import { InfrastructureClusterListDTO } from '../dto/infrastructure-list.dto';

export interface NodeFilterStrategy {
  /**
   * Unique key identifying this filter type
   */
  readonly key: string;
  
  /**
   * Check if a node matches the filter value
   */
  matches(node: InfrastructureNodeListDTO, value: string | number): boolean;
  
  /**
   * Validate the filter value (optional)
   */
  validate?(value: string | number): boolean;
}

export interface ClusterFilterStrategy {
  /**
   * Unique key identifying this filter type
   */
  readonly key: string;
  
  /**
   * Check if a cluster matches the filter value
   */
  matches(cluster: InfrastructureClusterListDTO, value: string | number): boolean;
  
  /**
   * Validate the filter value (optional)
   */
  validate?(value: string | number): boolean;
}

/**
 * Union type for all filter strategies
 */
export type FilterStrategy = NodeFilterStrategy | ClusterFilterStrategy;

/**
 * Registry of all available filter strategies
 */
export type FilterStrategyRegistry = Map<string, FilterStrategy>;
