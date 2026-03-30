import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsSummaryController } from './jobs-summary.controller';
import { JobsService } from './jobs.service';
import { DataCollectionModule } from '@/modules/data-collection/data-collection.module';

@Module({
  imports: [DataCollectionModule],
  controllers: [JobsController, JobsSummaryController],
  providers: [JobsService],
})
export class JobsModule {}
