import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
  _Object,
} from '@aws-sdk/client-s3';
import { posix } from 'path';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';
import { extract as tarExtract, pack as tarPack } from 'tar-stream';
import { SeptikConfig } from '@/config/septik.config';
import { UserContext, UserRole } from '@/common/types/user-context.types';
import { DataCollectionService } from '@/modules/data-collection/data-collection.service';
import { AccountingService } from '@/modules/accounting/accounting.service';

// e.g. 123.server or 123[12].server
const JOB_ID_RE = /^(\d+)(?:\[(\d*)\])?\.([A-Za-z0-9-]+)\.([A-Za-z0-9.-]+)$/;

// Septik events - files of all events present are provided
const SEPTIK_EVENTS = ['end', 'epilogue', 'prologue'];

export interface SeptikFile {
  stream: Readable;
  fileName: string;
  contentType: string;
  length?: number;
}

// Limits for viewing septik data in the browser
const VIEW_MAX_FILE_CONTENT = 1024 * 1024;
const VIEW_MAX_TOTAL_CONTENT = 10 * 1024 * 1024;
const BINARY_SNIFF_LENGTH = 8192;

export interface SeptikContentFile {
  // Basename of the S3 object (tar.gz) the file comes from
  archive: string;
  // Septik event of the archive (prologue, epilogue, end)
  event: string;
  path: string;
  size: number;
  mtime?: string;
  binary: boolean;
  // true if content is cut (or missing) because of the size limits
  truncated: boolean;
  content?: string;
}

export interface SeptikContents {
  // Events the files come from
  events: string[];
  files: SeptikContentFile[];
}

@Injectable()
export class SeptikService {
  private readonly logger = new Logger(SeptikService.name);
  private readonly s3: S3Client | null = null;
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataCollectionService: DataCollectionService,
    private readonly accountingService: AccountingService,
  ) {
    const config = this.configService.get<SeptikConfig>('septik')!;
    this.bucket = config.bucket;
    if (config.endpoint && config.accessKey && config.secretKey) {
      this.s3 = new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKey,
          secretAccessKey: config.secretKey,
        },
      });
      this.logger.log(
        `Septik S3 client initialized (${config.endpoint}, bucket ${this.bucket})`,
      );
    } else {
      this.logger.warn(
        'SEPTIK_S3_ENDPOINT/ACCESS_KEY/SECRET_KEY not set - septik downloads disabled',
      );
    }
  }

  /**
   * Admin can download files of any job, other users only of their own jobs.
   * Job owner is taken from live PBS data, or from the accounting archive.
   */
  async assertCanDownload(
    userContext: UserContext,
    jobId: string,
  ): Promise<void> {
    if (userContext.role === UserRole.ADMIN) {
      return;
    }

    // A subjob of an array job can be archived only under its parent (e.g. 123[].server)
    const parentJobId = jobId.replace(/\[\d+\]\./, '[].');
    const owner =
      this.getLiveJobOwner(jobId) ??
      (await this.accountingService.getArchivedJobOwner(jobId)) ??
      (parentJobId !== jobId
        ? await this.accountingService.getArchivedJobOwner(parentJobId)
        : null);
    if (!owner) {
      throw new NotFoundException('Job not found');
    }

    const ownerBase = owner.split('@')[0];
    const usernameBase = userContext.username.split('@')[0];
    if (ownerBase !== usernameBase) {
      throw new ForbiddenException(
        'You can download septik data only of your own jobs',
      );
    }
  }

  /**
   * Open septik files of a job stored in S3.
   * Key layout: <digits of job number>/<server>/<domain>/<jobId>_<...>.tar.gz,
   * e.g. 2/4/8/9/9/1/5/4/server/name/24899154.server.name_<host>_..._end.tar.gz
   * Subjobs of array jobs have <digits of job number>/-/<digits of array index>/<server>/<domain>/,
   * e.g. 2/4/9/1/0/5/3/9/-/2/4/server/name/ for 24910539[24].server.name
   * Files of all events present are provided (_prologue.tar.gz, _epilogue.tar.gz,
   * _end.tar.gz), not all events have to exist. An event can have more files
   * (e.g. one per node of a multinode job).
   * A single object is streamed as-is, multiple objects are streamed together
   * in an uncompressed tar. Nothing is stored locally.
   */
  async openJobFiles(
    jobId: string,
    abortSignal: AbortSignal,
  ): Promise<SeptikFile> {
    if (!this.s3) {
      throw new ServiceUnavailableException('Septik storage is not configured');
    }

    const prefix = this.getKeyPrefix(jobId);
    const allObjects = await this.listObjects(prefix, abortSignal);
    const { objects } = this.selectEventObjects(allObjects);
    if (objects.length === 0) {
      throw new NotFoundException(`No septik data found for job ${jobId}`);
    }

    if (objects.length === 1) {
      const object = objects[0];
      return {
        stream: await this.getObjectStream(object.Key!, abortSignal),
        fileName: posix.basename(object.Key!),
        contentType: 'application/gzip',
        length: object.Size,
      };
    }

    return {
      stream: this.packObjects(objects, abortSignal),
      fileName: `${jobId}_septik.tar`,
      contentType: 'application/x-tar',
    };
  }

  /**
   * Unpack septik tar.gz files of a job (the same ones as openJobFiles provides)
   * and return their regular files with text content, for viewing in the browser.
   * Content is limited per file and in total, binary files have no content.
   */
  async readJobContents(
    jobId: string,
    abortSignal: AbortSignal,
  ): Promise<SeptikContents> {
    if (!this.s3) {
      throw new ServiceUnavailableException('Septik storage is not configured');
    }

    const prefix = this.getKeyPrefix(jobId);
    const allObjects = await this.listObjects(prefix, abortSignal);
    const { events, objects } = this.selectEventObjects(allObjects);
    if (objects.length === 0) {
      throw new NotFoundException(`No septik data found for job ${jobId}`);
    }

    const files: SeptikContentFile[] = [];
    const budget = { remaining: VIEW_MAX_TOTAL_CONTENT };
    for (const object of objects) {
      const body = await this.getObjectStream(object.Key!, abortSignal);
      try {
        files.push(
          ...(await this.extractObject(
            body,
            posix.basename(object.Key!),
            this.getEvent(object.Key!),
            budget,
          )),
        );
      } catch (error) {
        body.destroy();
        if (abortSignal.aborted) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Septik unpacking of ${object.Key} failed: ${message}`,
        );
        throw new BadGatewayException('Septik data could not be unpacked');
      }
    }
    return { events, files };
  }

  private async extractObject(
    body: Readable,
    archive: string,
    event: string,
    budget: { remaining: number },
  ): Promise<SeptikContentFile[]> {
    const extract = tarExtract();
    const gunzip = createGunzip();
    body.on('error', (error) => gunzip.destroy(error));
    gunzip.on('error', (error) => extract.destroy(error));
    body.pipe(gunzip).pipe(extract);

    const files: SeptikContentFile[] = [];
    for await (const entry of extract) {
      const { header } = entry;
      if (header.type !== 'file' && header.type !== 'contiguous-file') {
        entry.resume();
        continue;
      }

      const limit = Math.min(VIEW_MAX_FILE_CONTENT, budget.remaining);
      const chunks: Buffer[] = [];
      let collected = 0;
      // The whole entry has to be read to get to the next one
      for await (const chunk of entry as AsyncIterable<Buffer>) {
        if (collected < limit) {
          const part = chunk.subarray(0, limit - collected);
          chunks.push(part);
          collected += part.length;
        }
      }

      const data = Buffer.concat(chunks);
      const size = header.size ?? data.length;
      const binary = data.subarray(0, BINARY_SNIFF_LENGTH).includes(0);
      const file: SeptikContentFile = {
        archive,
        event,
        path: header.name.replace(/^\.\//, ''),
        size,
        mtime: header.mtime?.toISOString(),
        binary,
        truncated: !binary && data.length < size,
      };
      if (!binary) {
        file.content = data.toString('utf8');
        budget.remaining -= data.length;
      }
      files.push(file);
    }
    return files;
  }

  private getEvent(key: string): string {
    return SEPTIK_EVENTS.find((event) => key.endsWith(`_${event}.tar.gz`))!;
  }

  private selectEventObjects(objects: _Object[]): {
    events: string[];
    objects: _Object[];
  } {
    const events = SEPTIK_EVENTS.filter((event) =>
      objects.some((o) => o.Key!.endsWith(`_${event}.tar.gz`)),
    );
    return {
      events,
      objects: objects.filter((o) =>
        events.some((event) => o.Key!.endsWith(`_${event}.tar.gz`)),
      ),
    };
  }

  private getKeyPrefix(jobId: string): string {
    const match = JOB_ID_RE.exec(jobId);
    if (!match) {
      throw new BadRequestException(`Invalid job ID '${jobId}'`);
    }
    const [, jobNumber, arrayIndex, server, domain] = match;
    const jobDir = jobNumber.split('').join('/');

    if (arrayIndex === undefined) {
      return `${jobDir}/${server}/${domain}/${jobId}_`;
    }
    if (arrayIndex === '') {
      // Array job itself (123[]) does not run, only its subjobs have data
      throw new NotFoundException(
        `Array job ${jobId} has no septik data, see its subjobs`,
      );
    }
    // Subjob, e.g. 24910539[24] -> 2/4/9/1/0/5/3/9/-/2/4/server/name/
    // The directory belongs to the subjob only, so file names are not matched
    const indexDir = arrayIndex.split('').join('/');
    return `${jobDir}/-/${indexDir}/${server}/${domain}/`;
  }

  private async listObjects(
    prefix: string,
    abortSignal: AbortSignal,
  ): Promise<_Object[]> {
    const objects: _Object[] = [];
    let continuationToken: string | undefined;
    try {
      do {
        const result = await this.s3!.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
          { abortSignal },
        );
        objects.push(...(result.Contents ?? []).filter((o) => o.Key));
        continuationToken = result.NextContinuationToken;
      } while (continuationToken);
    } catch (error) {
      throw this.toHttpException(error, `listing ${prefix}`);
    }
    return objects.sort((a, b) => a.Key!.localeCompare(b.Key!));
  }

  private async getObjectStream(
    key: string,
    abortSignal: AbortSignal,
  ): Promise<Readable> {
    try {
      const result = await this.s3!.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { abortSignal },
      );
      return result.Body as Readable;
    } catch (error) {
      throw this.toHttpException(error, `getting ${key}`);
    }
  }

  private packObjects(objects: _Object[], abortSignal: AbortSignal): Readable {
    const tar = tarPack();

    const addAll = async () => {
      for (const object of objects) {
        const body = await this.getObjectStream(object.Key!, abortSignal);
        await new Promise<void>((resolve, reject) => {
          const entry = tar.entry(
            {
              name: posix.basename(object.Key!),
              size: object.Size,
              mtime: object.LastModified,
            },
            (error) => (error ? reject(error) : resolve()),
          );
          body.on('error', reject);
          body.pipe(entry);
        });
      }
      tar.finalize();
    };

    addAll().catch((error: Error) => {
      this.logger.error(`Septik tar packing failed: ${error.message}`);
      tar.destroy(error);
    });

    return Readable.from(tar);
  }

  private getLiveJobOwner(jobId: string): string | null {
    const pbsData = this.dataCollectionService.getPbsData();
    for (const serverData of Object.values(pbsData?.servers ?? {})) {
      const job = serverData.jobs?.items?.find((j) => j.name === jobId);
      if (job) {
        return job.attributes['Job_Owner'] || null;
      }
    }
    return null;
  }

  private toHttpException(error: unknown, action: string) {
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Septik S3 error while ${action}: ${name} ${message}`);

    if (name === 'NoSuchKey') {
      return new NotFoundException('Septik data not found');
    }
    return new BadGatewayException('Septik storage request failed');
  }
}
