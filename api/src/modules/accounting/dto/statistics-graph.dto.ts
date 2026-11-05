import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class StatisticsGraphRequestDTO {
  @ApiProperty({
    description:
      'Graph parameters as filled in the form (e.g. cluster, period: { from, to }). Which ones are required depends on the graph.',
    type: 'object',
    additionalProperties: true,
  })
  params: Record<string, unknown>;
}

export class StatisticsGraphDataDTO {
  @Expose()
  @ApiProperty({ description: 'Graph identifier' })
  graphId: string;

  @Expose()
  @ApiProperty({ description: 'Column names of the result', type: [String] })
  columns: string[];

  @Expose()
  @ApiProperty({
    description:
      'Result rows, each row has one value per column. Dates are returned as YYYY-MM-DD strings.',
    type: 'array',
    items: { type: 'array', items: {} },
  })
  rows: unknown[][];
}

export class StatisticsGraphChartDTO {
  @Expose()
  @ApiProperty({ description: 'Graph identifier' })
  graphId: string;

  @Expose()
  @ApiProperty({ description: 'Chart as a standalone SVG document' })
  svg: string;
}
