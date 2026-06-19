import { IsString } from 'class-validator';

export class PerunConfig {
  @IsString()
  dataPath: string;

  @IsString()
  storageSpacesDataPath: string;
}

export const getPerunConfig = (): PerunConfig => ({
  dataPath: process.env.PERUN_DATA_PATH || 'data/perun',
  storageSpacesDataPath: process.env.STORAGE_SPACES_DATA_PATH || 'data/storage-spaces',
});
