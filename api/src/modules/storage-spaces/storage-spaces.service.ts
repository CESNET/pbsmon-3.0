import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { DataCollectionService } from '@/modules/data-collection/data-collection.service';
import { UserContext, UserRole } from '@/common/types/user-context.types';
import { StorageSpaceDTO, StorageSpacesDTO } from './dto/storage-space.dto';
import { UserStorageQuotasDTO } from './dto/user-storage-quota.dto';

@Injectable()
export class StorageSpacesService {
  private readonly logger = new Logger(StorageSpacesService.name);

  constructor(private readonly dataCollectionService: DataCollectionService) {}

  async getStorageSpaces(): Promise<StorageSpacesDTO> {
    const storageSpaces = this.dataCollectionService.getStorageSpaces();

    if (!storageSpaces) {
      this.logger.warn('Storage spaces data not available');
      return {
        storageSpaces: [],
        totalTiB: 0,
        totalUsedTiB: 0,
        totalFreeTiB: 0,
        formattedTotal: '0 TiB',
        formattedTotalUsed: '0 TiB',
        formattedTotalFree: '0 TiB',
      };
    }

    const storageSpaceDTOs: StorageSpaceDTO[] = storageSpaces.storageSpaces.map(
      (space) => ({
        directory: space.directory,
        usedTiB: space.usedTiB,
        freeTiB: space.freeTiB,
        totalTiB: space.totalTiB,
        usagePercent: space.usagePercent,
        formattedSize: space.formattedSize,
      }),
    );

    return {
      storageSpaces: storageSpaceDTOs,
      totalTiB: storageSpaces.totalTiB,
      totalUsedTiB: storageSpaces.totalUsedTiB,
      totalFreeTiB: storageSpaces.totalFreeTiB,
      formattedTotal: storageSpaces.formattedTotal,
      formattedTotalUsed: storageSpaces.formattedTotalUsed,
      formattedTotalFree: storageSpaces.formattedTotalFree,
    };
  }

  getUserStorageQuotas(userContext: UserContext, username: string): UserStorageQuotasDTO {
    if (!this.canSeeOwner(userContext, username)) {
      throw new ForbiddenException('Access denied');
    }

    const quotas = this.dataCollectionService.getUserStorageQuotas(username);
    return {
      username,
      quotas: quotas || [],
      canSeeOwner: true,
    };
  }

  private canSeeOwner(userContext: UserContext, username: string): boolean {
    if (userContext.role === UserRole.ADMIN) return true;

    const usernameBase = username.split('@')[0];
    const currentBase = userContext.username.split('@')[0];

    if (userContext.username === username || currentBase === usernameBase) return true;

    const perunData = this.dataCollectionService.getPerunData();
    if (!perunData?.etcGroups) return false;

    const allUsersSet = new Set<string>();
    if (perunData.users?.users) {
      for (const u of perunData.users.users) {
        if (u.logname) {
          allUsersSet.add(u.logname.split('@')[0]);
          allUsersSet.add(u.logname);
        }
      }
    }
    const totalUsers = allUsersSet.size;

    const allGroupsMap = new Map<string, Set<string>>();
    for (const serverGroups of perunData.etcGroups) {
      for (const group of serverGroups.entries) {
        if (!allGroupsMap.has(group.groupname)) {
          allGroupsMap.set(group.groupname, new Set(group.members));
        } else {
          for (const m of group.members) allGroupsMap.get(group.groupname)!.add(m);
        }
      }
    }

    for (const [, members] of allGroupsMap) {
      if (totalUsers > 0 && members.size / totalUsers > 0.8) continue;
      const currentIsMember = members.has(currentBase) || members.has(userContext.username);
      if (!currentIsMember) continue;
      if (members.has(usernameBase) || members.has(username)) return true;
    }

    return false;
  }
}
