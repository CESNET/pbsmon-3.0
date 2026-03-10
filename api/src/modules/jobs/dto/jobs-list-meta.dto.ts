import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetaDto } from '@/common/dto/meta.dto';

export class JobsListMetaDto extends MetaDto {
  @ApiPropertyOptional({
    description: 'State values that can be used for filtering the searched jobs list',
    nullable: true,
  })
  filterableStates?: Record<string, string> | null;
}
