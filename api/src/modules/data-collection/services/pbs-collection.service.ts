import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getFileMtime } from '@/common/utils/fs.util';
import { PbsConfig } from '@/config/pbs.config';
import {
  PbsData,
  PbsServerData,
  PbsCollection,
  PbsEntity,
  PbsJob,
  PbsQueue,
  PbsNode,
  PbsServer,
  PbsResource,
  PbsReservation,
  PbsScheduler,
  PbsHook,
  PbsFairshare,
  PbsFairshareEntry,
} from '../types/pbs.types';

@Injectable()
export class PbsCollectionService {
  private readonly logger = new Logger(PbsCollectionService.name);
  private readonly config: PbsConfig;

  private pbsData: PbsData | null = null;
  private jobsFileTimestamps: Record<string, number> = {};

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<PbsConfig>('pbs')!;

    this.logger.log(
      `PBS data path configured: ${this.config.dataPath} (set PBS_DATA_PATH env var to override)`,
    );
  }

  async collect(): Promise<void> {
    this.logger.log('Collecting data from PBS filesystem...');
    try {
      const serversData: Record<string, PbsServerData> = {};
      const basePath = this.config.dataPath;

      // PBS data collection is now handled by a separate service (pbs-collector)
      // This service only reads the data files that are updated by pbs-collector
      if (this.config.mockData) {
        this.logger.log('MOCK_PBS_DATA is true, using mock data');
      } else {
        this.logger.log(
          'Reading PBS data from files (collected by pbs-collector service)',
        );
      }

      // Check if the base directory exists
      try {
        await fs.access(basePath);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('ENOENT')) {
          this.logger.warn(
            `PBS data directory does not exist: ${basePath}. Creating empty data structure.`,
          );
          this.pbsData = {
            timestamp: new Date().toISOString(),
            servers: {},
          };
          return;
        }
        throw error;
      }

      // Scan for server subdirectories
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      const serverDirs = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

      if (serverDirs.length === 0) {
        this.logger.warn(
          `No server directories found in ${basePath}. Expected subdirectories like 'pbs-m1', 'pbs-m2', etc.`,
        );
        this.pbsData = {
          timestamp: new Date().toISOString(),
          servers: {},
        };
        return;
      }

      for (const serverDir of serverDirs) {
        const serverPath = path.join(basePath, serverDir);
        this.logger.debug(`Collecting data for server: ${serverDir}`);

        const jobs = await this.loadEntityFile<PbsJob>(
          path.join(serverPath, 'jobs.json'),
          'jobs',
        );
        const queues = await this.loadEntityFile<PbsQueue>(
          path.join(serverPath, 'queues.json'),
          'queues',
        );
        const nodes = await this.loadEntityFile<PbsNode>(
          path.join(serverPath, 'nodes.json'),
          'nodes',
        );
        const servers = await this.loadEntityFile<PbsServer>(
          path.join(serverPath, 'servers.json'),
          'servers',
        );
        const resources = await this.loadEntityFile<PbsResource>(
          path.join(serverPath, 'resources.json'),
          'resources',
        );
        const reservations = await this.loadEntityFile<PbsReservation>(
          path.join(serverPath, 'reservations.json'),
          'reservations',
        );
        const schedulers = await this.loadEntityFile<PbsScheduler>(
          path.join(serverPath, 'schedulers.json'),
          'schedulers',
        );
        const hooks = await this.loadEntityFile<PbsHook>(
          path.join(serverPath, 'hooks.json'),
          'hooks',
        );
        const fairshare = await this.loadFairshareFile(
          path.join(serverPath, 'default_fairshare.txt'),
        );

        let serverName = serverDir;
        if (servers?.items && servers.items.length > 0) {
          const fullServerName = servers.items[0].name;
          serverName = fullServerName.split('.')[0] || serverDir;
        }

        const jobsFileMtime = await getFileMtime(
          path.join(serverPath, 'jobs.json'),
        );
        if (jobsFileMtime !== undefined) {
          this.jobsFileTimestamps[serverName] = jobsFileMtime;
        }

        if (!serversData[serverName]) {
          serversData[serverName] = {
            timestamp: new Date().toISOString(),
            serverName,
            jobs,
            queues,
            nodes,
            servers,
            resources,
            reservations,
            schedulers,
            hooks,
            fairshare,
          };
        } else {
          serversData[serverName] = {
            timestamp: new Date().toISOString(),
            serverName,
            jobs: jobs ?? serversData[serverName].jobs,
            queues: queues ?? serversData[serverName].queues,
            nodes: nodes ?? serversData[serverName].nodes,
            servers: servers ?? serversData[serverName].servers,
            resources: resources ?? serversData[serverName].resources,
            reservations: reservations ?? serversData[serverName].reservations,
            schedulers: schedulers ?? serversData[serverName].schedulers,
            hooks: hooks ?? serversData[serverName].hooks,
            fairshare: fairshare ?? serversData[serverName].fairshare,
          };
        }

        const loadedEntities = [
          jobs && 'Jobs',
          queues && 'Queues',
          nodes && 'Nodes',
          servers && 'Servers',
          resources && 'Resources',
          reservations && 'Reservations',
          schedulers && 'Schedulers',
          hooks && 'Hooks',
          fairshare && 'Fairshare',
        ]
          .filter(Boolean)
          .join(', ');

        this.logger.log(
          `PBS data collected for ${serverName} - Loaded: ${loadedEntities}`,
        );
      }

      this.pbsData = {
        timestamp: new Date().toISOString(),
        servers: serversData,
      };

      this.logger.log(
        `PBS data collection completed for ${Object.keys(serversData).length} server(s): ${Object.keys(serversData).join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Error collecting PBS data: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async loadEntityFile<T extends PbsEntity>(
    filePath: string,
    entityType: string,
  ): Promise<PbsCollection<T> | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data: PbsCollection<T> = JSON.parse(content);
      this.logger.debug(
        `Loaded ${entityType} data from ${filePath} (${data.count} items)`,
      );
      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('ENOENT')) {
        this.logger.warn(
          `PBS ${entityType} file not found: ${filePath}. Will preserve previous state if available.`,
        );
      } else {
        this.logger.warn(
          `Failed to load ${entityType} file: ${errorMessage}. Will preserve previous state if available.`,
        );
      }
      return null;
    }
  }

  private async loadFairshareFile(
    filePath: string,
  ): Promise<PbsFairshare | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());
      const entries: PbsFairshareEntry[] = [];

      for (const line of lines) {
        // Skip comment lines
        if (line.trim().startsWith('#')) {
          continue;
        }

        const parts = line.trim().split('\t');
        if (parts.length >= 3) {
          const username = parts[0];
          const value1 = parseInt(parts[1], 10);
          const value2 = parseInt(parts[2], 10);

          if (!isNaN(value1) && !isNaN(value2)) {
            entries.push({
              username,
              value1,
              value2,
            });
          }
        }
      }

      this.logger.debug(
        `Loaded Fairshare data from ${filePath} (${entries.length} entries)`,
      );

      return {
        entries,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('ENOENT')) {
        this.logger.warn(
          `PBS Fairshare file not found: ${filePath}. Skipping fairshare.`,
        );
      } else {
        this.logger.warn(`Failed to load fairshare file: ${errorMessage}`);
      }
      return null;
    }
  }

  getData(): PbsData | null {
    return this.pbsData;
  }

  /**
   * Last-modified timestamp (ms since epoch) of jobs.json per server name,
   * i.e. how fresh the currently held job data is.
   */
  getJobsFileTimestamps(): Record<string, number> {
    return this.jobsFileTimestamps;
  }
}
