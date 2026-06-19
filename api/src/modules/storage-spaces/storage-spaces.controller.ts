import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiResponse } from '@/common/dto/api-response.dto';
import { ApiOkResponseModel } from '@/common/swagger/api-generic-response';
import { UserContextDecorator } from '@/common/decorators/user-context.decorator';
import { UserContext } from '@/common/types/user-context.types';
import { StorageSpacesService } from './storage-spaces.service';
import { StorageSpacesDTO } from './dto/storage-space.dto';
import { UserStorageQuotasDTO } from './dto/user-storage-quota.dto';

@ApiTags('storage-spaces')
@Controller('storage-spaces')
export class StorageSpacesController {
  constructor(private readonly storageSpacesService: StorageSpacesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all storage spaces' })
  @ApiOkResponseModel(StorageSpacesDTO, 'Storage spaces data')
  async getStorageSpaces(): Promise<ApiResponse<StorageSpacesDTO>> {
    const data = await this.storageSpacesService.getStorageSpaces();
    return new ApiResponse(data);
  }

  @Get('user/:username')
  @ApiOperation({ summary: 'Get storage quotas for a user' })
  @ApiParam({ name: 'username', type: String, description: 'Username to look up quotas for' })
  @ApiOkResponseModel(UserStorageQuotasDTO, 'User storage quotas')
  getUserStorageQuotas(
    @UserContextDecorator() userContext: UserContext,
    @Param('username') username: string,
  ): ApiResponse<UserStorageQuotasDTO> {
    const data = this.storageSpacesService.getUserStorageQuotas(userContext, username);
    return new ApiResponse(data);
  }
}
