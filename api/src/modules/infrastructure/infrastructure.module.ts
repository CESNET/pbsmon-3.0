import { Module } from '@nestjs/common';
import { InfrastructureController } from './infrastructure.controller';
import { InfrastructureService } from './infrastructure.service';
import { InfrastructureFilterService } from './filters/filter.service';
import { DataCollectionModule } from '@/modules/data-collection/data-collection.module';

@Module({
  imports: [DataCollectionModule],
  controllers: [InfrastructureController],
  providers: [InfrastructureService, InfrastructureFilterService],
  exports: [InfrastructureService],
})
export class InfrastructureModule {}
