import { Module } from '@nestjs/common';
import { SeptikController } from './septik.controller';
import { SeptikService } from './septik.service';
import { DataCollectionModule } from '@/modules/data-collection/data-collection.module';
import { AccountingModule } from '@/modules/accounting/accounting.module';

@Module({
  imports: [DataCollectionModule, AccountingModule],
  controllers: [SeptikController],
  providers: [SeptikService],
})
export class SeptikModule {}
