import { Injectable, Logger } from '@nestjs/common';
import {
  PrometheusClient,
  PrometheusResponse,
} from '../clients/prometheus.client';

export interface PrometheusQueryConfig {
  name: string;
  description: string;
  query: string;
}

export interface PrometheusCollectionData {
  timestamp: string;
  [queryName: string]: PrometheusResponse | string;
}

@Injectable()
export class PrometheusCollectionService {
  private readonly logger = new Logger(PrometheusCollectionService.name);

  private prometheusData: PrometheusCollectionData = {
    timestamp: new Date().toISOString(),
  };
  private lastCollectedAt?: number;

  // Define the queries (PROD data only)
  private readonly queries: PrometheusQueryConfig[] = [
    {
      name: 'AAI Users Info',
      description: 'List of users (username, user id)',
      query: 'aai_dump_user_info',
    },
    {
      name: 'CPU Info',
      description: 'CPU count by hostname, model, cores, threads',
      query: 'count by (hostname, model, cores, threads) (cpumon_cpu_info)',
    },
    {
      name: 'Memory Total',
      description: 'Total memory in bytes per node',
      query: 'node_memory_MemTotal_bytes',
    },
    {
      name: 'GPU Device State',
      description: 'GPU device state codes',
      query: 'gpumon_device_state_code',
    },
    {
      name: 'Disk Info',
      description: 'SMART device information',
      query: 'smartmon_device_info',
    },
    {
      name: 'Network Info',
      description: 'Network interface count by hostname, speed, driver',
      query: 'count by (hostname, speed_mbps, driver) (nicmon_info)',
    },
    {
      name: 'Node Owners',
      description: 'Node ownership information',
      query: 'count by (node, label_owner) (kube_node_labels{label_owner!=""})',
    },
    {
      name: 'VM Count',
      description: 'Number of VMs per hypervisor',
      query: 'count by(hostname)(libvirtd_domain_domain_state)',
    },
    {
      name: 'OpenStack Projects',
      description: 'List of OpenStack projects (id + name)',
      query: 'openstack_identity_project_info',
    },
    {
      name: 'OpenStack Servers',
      description: 'List of OpenStack servers/VMs (id, name, project_id)',
      query: 'custom_openstack_server_info',
    },
    {
      name: 'OpenStack Users',
      description: 'List of all OpenStack users with their projects',
      query: 'aai_dump_user_resource_capability_info',
    },
  ];

  constructor(private readonly prometheusClient: PrometheusClient) {}

  async collect(): Promise<void> {
    this.logger.log('Collecting data from PROMETHEUS...');

    const collectedData: Record<string, PrometheusResponse> = {};
    let someFailed = false;

    for (const queryConfig of this.queries) {
      try {
        const numAttempts = 5;
        this.logger.debug(`Querying: ${queryConfig.name}`);
        for (let attempt = 1; attempt <= numAttempts; attempt++) {
            const result = await this.prometheusClient.query(queryConfig.query);
            if (result.status === 'success' && result.data.result.length > 0) {
              collectedData[queryConfig.name] = result;
              this.logger.debug(`Successfully collected: ${queryConfig.name}`);
              break;
            }
            if (attempt === numAttempts) {
              someFailed = true;
              this.logger.warn(
                `Failed to collect data for "${queryConfig.name}" after ${numAttempts} attempts.`,
              );
              break;
            }
            await new Promise(f => setTimeout(f, 200));
        }
      } catch (error) {
        someFailed = true;
        this.logger.warn(
          `Failed to collect data for "${queryConfig.name}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `PROMETHEUS data collected - ${Object.keys(collectedData).length}/${this.queries.length} queries successful`,
    );

    /* If some queries failed, we keep the previous data for those queries (if available) to avoid losing all data. */
    for (const queryConfig of this.queries) {
      if (!collectedData[queryConfig.name] && this.prometheusData[queryConfig.name]) {
        collectedData[queryConfig.name] = this.prometheusData[queryConfig.name] as PrometheusResponse;
        someFailed = true;
      }
    }

    if (!someFailed) {
      this.lastCollectedAt = Date.now();
    }


    this.prometheusData = {
      timestamp: new Date().toISOString(),
      ...collectedData,
    } as PrometheusCollectionData;

  }

  getData(): PrometheusCollectionData {
    return this.prometheusData;
  }

  /** Timestamp (ms since epoch) of the last completed collection run, undefined if none has run yet. */
  getLastCollectedAt(): number | undefined {
    return this.lastCollectedAt;
  }

  getQueries(): PrometheusQueryConfig[] {
    return this.queries;
  }
}
