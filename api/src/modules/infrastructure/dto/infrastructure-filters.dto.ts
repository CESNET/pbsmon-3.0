import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';


export class InfrastructureFiltersDTO {
  @Expose()
  @Type(() => String)
  @ApiProperty({
    description: 'States of machine within clusters',
    type: [String],
    nullable: true,
    required: false,
  })
  states?: string[] | null;

  @Expose()
  @Type(() => String)
  @ApiProperty({
    description: 'Queues of machine within clusters',
    type: [String],
    nullable: true,
    required: false,
  })
  queues?: string[] | null;

  @Expose()
  @Type(() => Number)
  @ApiProperty({
    description: 'Number of cpu of machine within clusters',
    type: [Number],
    nullable: true,
    required: false,
  })
  ncpus?: number[] | null;

  @Expose()
  @Type(() => Number)
  @ApiProperty({
    description: 'Number of gpu of machine within clusters',
    type: [Number],
    nullable: true,
    required: false,
  })
  ngpus?: number[] | null;

  @Expose()
  @Type(() => String)
  @ApiProperty({
    description: 'Possible clusters within organizations',
    type: [String],
    nullable: true,
    required: false,
  })
  clusters?: string[] | null;

  @Expose()
  @Type(() => String)
  @ApiProperty({
    description: 'Machine resources',
    type: [String],
    nullable: true,
    required: false,
  })
  resources?: string[] | null;
}
