import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PerunCollectionService } from './services/perun-collection.service';
import { PrometheusCollectionService } from './services/prometheus-collection.service';
import { PbsCollectionService } from './services/pbs-collection.service';
import { PerunData, EtcGroupEntry, StorageSpaces, UserStorageQuota } from './types/perun.types';

export { PerunData, EtcGroupEntry, StorageSpaces, UserStorageQuota };

@Injectable()
export class DataCollectionService implements OnModuleInit {
  private readonly logger = new Logger(DataCollectionService.name);

  constructor(
    private readonly perunCollectionService: PerunCollectionService,
    private readonly prometheusCollectionService: PrometheusCollectionService,
    private readonly pbsCollectionService: PbsCollectionService,
  ) {}

  async onModuleInit() {
    this.logger.log('Application started - collecting initial data');
    await Promise.all([
      this.collectPerun(),
      this.collectPrometheus(),
      this.collectPbs(),
    ]);
    this.logger.log('Initial data collection completed');
  }

  // CRON job - PERUN: every 1 minute
  @Cron('*/1 * * * *')
  async handlePerunCron() {
    this.logger.log('CRON: Collecting data from PERUN...');
    await this.collectPerun();
  }

  // CRON job - PBS: every 2 minutes on odd minutes
  // Note: pbs-collector service writes data every 2 minutes on odd minutes, so we read every 2 minutes
  // on odd minutes (runs at :01, :03, :05, :07, etc.) to avoid reading during writes
  @Cron('1-59/2 * * * *')
  async handlePbsCron() {
    this.logger.log('CRON: Reading PBS data from files...');
    await this.collectPbs();
  }

  // CRON job - PROMETHEUS: every 20 minutes
  @Cron('*/20 * * * *')
  async handlePrometheusCron() {
    this.logger.log('CRON: Collecting data from PROMETHEUS...');
    await this.collectPrometheus();
  }

  async collectPerun(): Promise<void> {
    await this.perunCollectionService.collect();
  }

  async collectPrometheus(): Promise<void> {
    await this.prometheusCollectionService.collect();
  }

  async collectPbs(): Promise<void> {
    await this.pbsCollectionService.collect();
  }

  getPerunData(): PerunData | null {
    return this.perunCollectionService.getData();
  }

  getPrometheusData() {
    return this.prometheusCollectionService.getData();
  }

  getPbsData() {
    return this.pbsCollectionService.getData();
  }

  getStorageSpaces(): StorageSpaces | null {
    const perunData = this.perunCollectionService.getData();
    return perunData?.storageSpaces || null;
  }

  getUserStorageQuotas(username: string): UserStorageQuota[] | null {
    const perunData = this.perunCollectionService.getData();
    if (!perunData?.userStorageQuotas) return null;
    return perunData.userStorageQuotas[username] || null;
  }

  getDataTimestamps() {
    return {
      pbs: this.pbsCollectionService.getJobsFileTimestamps(),
      storageSpaces: this.perunCollectionService.getStorageSpacesTimestamp(),
      storageQuotas: this.perunCollectionService.getUserStorageQuotasTimestamp(),
      perun: this.perunCollectionService.getPerunTimestamp(),
      prometheus: this.prometheusCollectionService.getLastCollectedAt(),
    };
  }
}
