import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PerunConfig } from '@/config/perun.config';
import {
  PerunData,
  PerunMachines,
  PerunUsers,
  EtcGroupEntry,
  PerunEtcGroups,
  StorageSpaces,
  StorageSpace,
  UserStorageQuota,
} from '../types/perun.types';

@Injectable()
export class PerunCollectionService {
  private readonly logger = new Logger(PerunCollectionService.name);
  private readonly config: PerunConfig;

  private perunData: PerunData | null = null;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<PerunConfig>('perun')!;

    this.logger.log(
      `PERUN data path configured: ${this.config.dataPath} (set PERUN_DATA_PATH env var to override)`,
    );
  }

  async collect(): Promise<void> {
    this.logger.log('Collecting data from PERUN filesystem...');
    try {
      // Load machines JSON file
      const machinesPath = path.join(
        this.config.dataPath,
        'pbsmon_machines.json',
      );
      let machines: PerunMachines | null = null;
      try {
        const machinesContent = await fs.readFile(machinesPath, 'utf-8');
        machines = JSON.parse(machinesContent) as PerunMachines;
        this.logger.debug(`Loaded machines data from ${machinesPath}`);
      } catch (error) {
        this.logger.warn(
          `Failed to load machines file: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Load users JSON file
      const usersPath = path.join(this.config.dataPath, 'pbsmon_users.json');
      let users: PerunUsers | null = null;
      try {
        const usersContent = await fs.readFile(usersPath, 'utf-8');
        users = JSON.parse(usersContent) as PerunUsers;
        this.logger.debug(`Loaded users data from ${usersPath}`);
      } catch (error) {
        this.logger.warn(
          `Failed to load users file: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Load all etc_group files
      const etcGroups: PerunEtcGroups = [];
      try {
        const etcGroupsPath = path.join(this.config.dataPath, 'etc_groups');
        const files = await fs.readdir(etcGroupsPath);
        const etcGroupFiles = files.filter((file) =>
          file.startsWith('etc_group_'),
        );

        for (const file of etcGroupFiles) {
          const serverName = file.replace('etc_group_', '');
          const filePath = path.join(etcGroupsPath, file);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const entries = this.parseEtcGroup(content);
            etcGroups.push({
              serverName,
              entries,
            });
            this.logger.debug(
              `Loaded etc_group file for server: ${serverName} (${entries.length} groups)`,
            );
          } catch (error) {
            this.logger.warn(
              `Failed to load etc_group file ${file}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('ENOENT')) {
          this.logger.warn(
            `PERUN data directory not found: ${this.config.dataPath}. Please ensure the directory exists or set PERUN_DATA_PATH environment variable.`,
          );
        } else {
          this.logger.warn(`Failed to read directory: ${errorMessage}`);
        }
      }

      // Load storage spaces file
      let storageSpaces: StorageSpaces | null = null;
      try {
        const storagePath = path.join(this.config.dataPath, 'motd.storage');
        const storageContent = await fs.readFile(storagePath, 'utf-8');
        storageSpaces = this.parseStorageSpaces(storageContent);
        this.logger.debug(`Loaded storage spaces data from ${storagePath}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('ENOENT')) {
          this.logger.warn(
            `Storage spaces file not found: ${path.join(this.config.dataPath, 'motd.storage')}`,
          );
        } else {
          this.logger.warn(
            `Failed to load storage spaces file: ${errorMessage}`,
          );
        }
      }

      // Load user storage quotas CSV
      let userStorageQuotas: Record<string, UserStorageQuota[]> | null = null;
      try {
        const quotasPath = path.join(this.config.storageSpacesDataPath, 'quotas.csv');
        const quotasContent = await fs.readFile(quotasPath, 'utf-8');
        userStorageQuotas = this.parseUserStorageQuotas(quotasContent);
        this.logger.debug(`Loaded user storage quotas from ${quotasPath}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('ENOENT')) {
          this.logger.warn(
            `User storage quotas file not found: ${path.join(this.config.storageSpacesDataPath, 'quotas.csv')}`,
          );
        } else {
          this.logger.warn(
            `Failed to load user storage quotas file: ${errorMessage}`,
          );
        }
      }

      this.perunData = {
        timestamp: new Date().toISOString(),
        machines,
        users,
        etcGroups,
        storageSpaces,
        userStorageQuotas,
      };

      this.logger.log(
        `PERUN data collected - Machines: ${machines ? '✓' : '✗'}, Users: ${users ? '✓' : '✗'}, Etc Groups: ${etcGroups.length} servers, Storage Spaces: ${storageSpaces ? '✓' : '✗'}`,
      );
    } catch (error) {
      this.logger.error(
        `Error collecting PERUN data: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  getData(): PerunData | null {
    return this.perunData;
  }

  /**
   * Convert storage size to TiB
   * @param value - Size value (e.g., "524", "9.3")
   * @param unit - Unit ("T" for TiB, "P" for PiB)
   * @returns Size in TiB
   */
  private convertToTiB(value: string, unit: string): number {
    const numValue = parseFloat(value);
    if (unit === 'P') {
      return numValue * 1024; // 1 PiB = 1024 TiB
    } else if (unit === 'T') {
      return numValue;
    }
    return 0;
  }

  /**
   * Format size in TiB to human-readable format
   * @param sizeTiB - Size in TiB
   * @returns Formatted string (e.g., "524 TiB" or "9.3 PiB")
   */
  private formatSize(sizeTiB: number): string {
    if (sizeTiB >= 1024) {
      const piB = sizeTiB / 1024;
      // Round to 1 decimal place if needed
      const rounded = Math.round(piB * 10) / 10;
      return `${rounded} PiB`;
    }
    return `${Math.round(sizeTiB)} TiB`;
  }

  /**
   * Parse a line from motd.storage file
   * Format: "[used][unit] [free][unit] [path]"
   * Example: "524T 121T /storage/brno11-elixir/home"
   */
  private parseStorageLine(line: string): StorageSpace | null {
    const trimmed = line.trim();
    if (!trimmed) {
      return null;
    }

    // Match: number (with optional decimal), unit (T or P), space, number, unit, space, path
    const match = trimmed.match(/^([\d.]+)([TP])\s+([\d.]+)([TP])\s+(.+)$/);
    if (!match) {
      this.logger.warn(`Failed to parse storage line: ${trimmed}`);
      return null;
    }

    const [, totalValue, totalUnit, freeValue, freeUnit, directory] = match;

    const totalTiB = this.convertToTiB(totalValue, totalUnit);
    const freeTiB = this.convertToTiB(freeValue, freeUnit);
    const usedTiB = totalTiB - freeTiB;
    const usagePercent =
      totalTiB > 0 ? Math.round((usedTiB / totalTiB) * 100) : 0;

    return {
      directory,
      usedTiB,
      freeTiB,
      totalTiB,
      usagePercent,
      formattedSize: this.formatSize(totalTiB),
    };
  }

  /**
   * Parse storage spaces from motd.storage file content
   */
  private parseStorageSpaces(content: string): StorageSpaces {
    const lines = content.split('\n');

    const storageSpaces: StorageSpace[] = [];
    let totalTiB = 0;
    let totalUsedTiB = 0;
    let totalFreeTiB = 0;

    for (const line of lines) {
      const storageSpace = this.parseStorageLine(line);
      if (storageSpace) {
        storageSpaces.push(storageSpace);
        totalTiB += storageSpace.totalTiB;
        totalUsedTiB += storageSpace.usedTiB;
        totalFreeTiB += storageSpace.freeTiB;
      }
    }

    return {
      storageSpaces,
      totalTiB,
      totalUsedTiB,
      totalFreeTiB,
      formattedTotal: this.formatSize(totalTiB),
      formattedTotalUsed: this.formatSize(totalUsedTiB),
      formattedTotalFree: this.formatSize(totalFreeTiB),
    };
  }

  private parseEtcGroup(content: string): EtcGroupEntry[] {
    const lines = content.split('\n').filter((line) => line.trim() !== '');
    const entries: EtcGroupEntry[] = [];

    for (const line of lines) {
      // Skip comments
      if (line.startsWith('#')) {
        continue;
      }

      const parts = line.split(':');
      if (parts.length >= 3) {
        const entry: EtcGroupEntry = {
          groupname: parts[0] || '',
          password: parts[1] || '',
          gid: parts[2] || '',
          members: parts[3]
            ? parts[3].split(',').filter((m) => m.trim() !== '')
            : [],
        };
        entries.push(entry);
      }
    }

    return entries;
  }

  private parseUserStorageQuotas(content: string): Record<string, UserStorageQuota[]> {
    const result: Record<string, UserStorageQuota[]> = {};
    const lines = content.split('\n').filter((l) => l.trim());

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 10) continue;

      const username = parts[0].trim();
      if (!username) continue;

      const parseNullable = (val: string): string | null => {
        const v = val.trim();
        return v === '-' || v === '' ? null : v;
      };

      const parseNullableInt = (val: string): number | null => {
        const v = val.trim();
        if (v === '-' || v === '') return null;
        const n = parseInt(v, 10);
        return isNaN(n) ? null : n;
      };

      const quota: UserStorageQuota = {
        directory: parts[1].trim(),
        used: parts[2].trim(),
        softQuota: parseNullable(parts[3]),
        hardQuota: parseNullable(parts[4]),
        grace: parseNullable(parts[5]),
        filesUsed: parseNullableInt(parts[6]),
        filesSoftLimit: parseNullableInt(parts[7]),
        filesHardLimit: parseNullableInt(parts[8]),
        filesGrace: parseNullable(parts[9]),
      };

      if (!result[username]) {
        result[username] = [];
      }
      result[username].push(quota);
    }

    return result;
  }
}
