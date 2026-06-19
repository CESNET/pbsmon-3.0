export interface LocalizedString {
  cs: string;
  en: string;
}

export interface PerunMachine {
  cpu: number;
  name: string;
}

export interface PerunResource {
  id: string;
  name: string;
  cluster: string; // "true" or "false" as string
  desc: LocalizedString;
  spec: LocalizedString;
  cpudesc: string | null;
  gpudesc: string | null;
  photo: string | null;
  thumbnail: string | null;
  memory: string;
  disk: LocalizedString;
  network: LocalizedString;
  comment: LocalizedString;
  owner: LocalizedString;
  vos: string[];
  machines: PerunMachine[];
  cpu: number | null;
}

export interface PerunPhysicalMachine {
  id: string;
  name: LocalizedString;
  resources: PerunResource[];
}

export interface PerunMachines {
  frontends: unknown[]; // Typically empty, structure unknown
  physical_machines: PerunPhysicalMachine[];
}

export interface PerunVosInfo {
  expires: string; // Date string (YYYY-MM-DD)
  groups: string[];
  org: string;
  status: 'VALID' | 'EXPIRED' | string;
}

export interface PerunUserVos {
  [vosName: string]: PerunVosInfo;
}

export interface PerunUserPublications {
  [publicationName: string]: string;
}

export interface PerunUser {
  id?: string;
  logname: string;
  name: string;
  org: string;
  mail: string;
  lang: string;
  publications: PerunUserPublications | null;
  vos: PerunUserVos;
}

export interface PerunUsers {
  users: PerunUser[];
}

export interface EtcGroupEntry {
  groupname: string;
  password: string;
  gid: string;
  members: string[];
}

export interface PerunEtcGroupServer {
  serverName: string;
  entries: EtcGroupEntry[];
}

export type PerunEtcGroups = PerunEtcGroupServer[];

export interface StorageSpace {
  directory: string;
  usedTiB: number;
  freeTiB: number;
  totalTiB: number;
  usagePercent: number;
  formattedSize: string;
}

export interface StorageSpaces {
  storageSpaces: StorageSpace[];
  totalTiB: number;
  totalUsedTiB: number;
  totalFreeTiB: number;
  formattedTotal: string;
  formattedTotalUsed: string;
  formattedTotalFree: string;
}

export interface UserStorageQuota {
  directory: string;
  used: string;
  softQuota: string | null;
  hardQuota: string | null;
  grace: string | null;
  filesUsed: number | null;
  filesSoftLimit: number | null;
  filesHardLimit: number | null;
  filesGrace: string | null;
}

export interface PerunData {
  timestamp: string;
  machines: PerunMachines | null;
  users: PerunUsers | null;
  etcGroups: PerunEtcGroups;
  storageSpaces: StorageSpaces | null;
  userStorageQuotas: Record<string, UserStorageQuota[]> | null;
}
