import {
  Controller,
  Get,
  Header,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UserContextDecorator } from '@/common/decorators/user-context.decorator';
import { UserContext } from '@/common/types/user-context.types';
import { SeptikContents, SeptikService } from './septik.service';

@ApiTags('septik')
@Controller('septik')
export class SeptikController {
  constructor(private readonly septikService: SeptikService) {}

  @Get(':jobId/contents')
  // Job data must not stay in the browser's disk cache
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'View septik job files',
    description:
      'Unpacks the same septik tar.gz files as the download endpoint and returns the files they contain. Text content is limited to 1 MB per file and 10 MB in total, binary files have no content.',
  })
  @ApiParam({
    name: 'jobId',
    description:
      'Job ID (e.g., "123.server" or "123[12].server")',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Files of the septik data' })
  @ApiResponse({ status: 403, description: 'Job is not owned by the user' })
  @ApiResponse({ status: 404, description: 'Job or its data not found' })
  async getJobContents(
    @UserContextDecorator() userContext: UserContext,
    @Param('jobId') jobId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SeptikContents> {
    await this.septikService.assertCanDownload(userContext, jobId);

    // Stop the S3 transfer when the client goes away
    const abortController = new AbortController();
    res.on('close', () => abortController.abort());

    return this.septikService.readJobContents(jobId, abortController.signal);
  }

  @Get(':jobId')
  @ApiOperation({
    summary: 'Download septik job files',
    description:
      'Streams septik tar.gz files of a job from S3 storage. Files of all events present ("end", "epilogue", "prologue") are provided, not all events have to exist. A single file is streamed as-is, more files (more events, or one per node of a multinode job) are streamed together in one tar. Admin can download data of any job, other users only of jobs they own (owner is taken from live PBS data or the jobs archive).',
  })
  @ApiParam({
    name: 'jobId',
    description:
      'Job ID (e.g., "123.server" or "123[12].server")',
    type: String,
  })
  @ApiProduces('application/gzip', 'application/x-tar')
  @ApiResponse({ status: 200, description: 'Septik tar.gz (or tar of them)' })
  @ApiResponse({ status: 403, description: 'Job is not owned by the user' })
  @ApiResponse({ status: 404, description: 'Job or its data not found' })
  async getJobFiles(
    @UserContextDecorator() userContext: UserContext,
    @Param('jobId') jobId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    await this.septikService.assertCanDownload(userContext, jobId);

    // Stop the S3 transfer when the client goes away
    const abortController = new AbortController();
    res.on('close', () => abortController.abort());

    const file = await this.septikService.openJobFiles(
      jobId,
      abortController.signal,
    );
    res.on('close', () => file.stream.destroy());

    const fileName = file.fileName.replace(/[^A-Za-z0-9._[\]-]/g, '_');
    return new StreamableFile(file.stream, {
      type: file.contentType,
      disposition: `attachment; filename="${fileName}"`,
      length: file.length,
    }).setErrorHandler(() => {
      // Transfer broke midway - abort so the client does not get a truncated file as complete
      res.destroy();
    });
  }
}
