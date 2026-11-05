import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CanonicalOrgNameDTO {
  @Expose()
  @ApiProperty({ description: 'User organization' })
  user_org: string;

  @Expose()
  @ApiProperty({ description: 'Organization name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Academy', nullable: true })
  akademie: string | null;
}

export class StatisticsOrganizationDTO {
  @Expose()
  @ApiProperty({ description: 'Organization name' })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'Representative IdP name (user_org) of the organization',
  })
  idpName: string;
}
