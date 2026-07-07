import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { UserContextGuard } from '@/common/guards/user-context.guard';
import { QsubModule } from '@/modules/qsub/qsub.module';
import { QueuesModule } from '@/modules/queues/queues.module';
import { StorageSpacesModule } from '@/modules/storage-spaces/storage-spaces.module';
import { InfrastructureModule } from '@/modules/infrastructure/infrastructure.module';
import { UsersModule } from '@/modules/users/users.module';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { StatusModule } from '@/modules/status/status.module';
import { DataFreshnessModule } from '@/modules/data-freshness/data-freshness.module';
import { DataCollectionModule } from '@/modules/data-collection/data-collection.module';
import { AccountingModule } from '@/modules/accounting/accounting.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { AuthModule } from '@/modules/auth/auth.module';
import configuration, {
  prometheusConfig,
  perunConfig,
  pbsConfig,
  accountingConfig,
  oidcConfig,
} from '@/config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        configuration,
        prometheusConfig,
        perunConfig,
        pbsConfig,
        accountingConfig,
        oidcConfig,
      ],
      envFilePath: '.env',
    }),
    QsubModule,
    QueuesModule,
    StorageSpacesModule,
    InfrastructureModule,
    UsersModule,
    JobsModule,
    StatusModule,
    DataFreshnessModule,
    DataCollectionModule,
    AccountingModule,
    ProjectsModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserContextGuard,
    },
  ],
})
export class AppModule {}
