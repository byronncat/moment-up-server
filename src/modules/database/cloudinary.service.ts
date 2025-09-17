import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

export interface CloudinaryUploadOptions {
  folder?: string;
  public_id?: string;
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  format?: string;
  transformation?: any[];
  tags?: string[];
  context?: Record<string, string>;
  overwrite?: boolean;
  unique_filename?: boolean;
  use_filename?: boolean;
}

export interface CloudinarySearchOptions {
  expression?: string;
  sort_by?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  max_results?: number;
  next_cursor?: string;
  with_field?: string[];
}

@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService
  ) {}

  onModuleInit() {
    const cloudName = this.configService.get<string>('db.cloudinary.cloudName');
    const apiKey = this.configService.get<string>('db.cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('db.cloudinary.apiSecret');

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.logger.info('Cloudinary client initialized successfully', {
      context: 'Database',
    });
  }

  public getClient() {
    return cloudinary;
  }

  public async upload(
    file: string | Buffer,
    options?: CloudinaryUploadOptions
  ): Promise<UploadApiResponse> {
    try {
      const result = await cloudinary.uploader.upload(file as string, {
        folder: options?.folder,
        public_id: options?.public_id,
        resource_type: options?.resource_type || 'auto',
        format: options?.format,
        transformation: options?.transformation,
        tags: options?.tags,
        context: options?.context,
        overwrite: options?.overwrite ?? false,
        unique_filename: options?.unique_filename ?? true,
        use_filename: options?.use_filename ?? false,
      });

      return result;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'Upload',
      });
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  public async uploadMultiple(
    files: Array<{ file: string | Buffer; options?: CloudinaryUploadOptions }>
  ): Promise<UploadApiResponse[]> {
    try {
      const uploadPromises = files.map(({ file, options }) => this.upload(file, options));
      const results = await Promise.all(uploadPromises);

      return results;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'UploadMultiple',
      });
      throw new Error(`Multiple upload failed: ${error.message}`);
    }
  }

  public async destroy(publicId: string, resourceType?: 'image' | 'video' | 'raw'): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType || 'image',
      });

      if (result.result === 'not found') throw new Error('File not found');
      if (result.result !== 'ok') throw new Error(`Failed to delete file: ${result.result}`);

      return result;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'Destroy',
      });
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  public async destroyMultiple(
    publicIds: string[],
    resourceType?: 'image' | 'video' | 'raw'
  ): Promise<any> {
    try {
      const result = await cloudinary.api.delete_resources(publicIds, {
        resource_type: resourceType || 'image',
      });

      return result;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'DestroyMultiple',
      });
      throw new Error(`Multiple delete failed: ${error.message}`);
    }
  }

  public async getResource(
    publicId: string,
    resourceType?: 'image' | 'video' | 'raw'
  ): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType || 'image',
      });

      return result;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'GetResource',
      });
      throw new Error(`Get resource failed: ${error.message}`);
    }
  }

  public async search(options?: CloudinarySearchOptions): Promise<any> {
    try {
      const searchParams: any = {};

      if (options?.expression) searchParams.expression = options.expression;
      if (options?.sort_by && options.sort_by.length > 0)
        searchParams.sort_by = options.sort_by.map(({ field, direction }) => ({
          [field]: direction,
        }));
      if (options?.max_results) searchParams.max_results = options.max_results;
      if (options?.next_cursor) searchParams.next_cursor = options.next_cursor;

      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: searchParams.expression || '',
        max_results: searchParams.max_results || 10,
      });

      return result;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'Search',
      });
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  public generateUrl(
    publicId: string,
    options?: {
      resourceType?: 'image' | 'video' | 'raw';
      transformation?: any[];
      format?: string;
      secure?: boolean;
    }
  ): string {
    try {
      return cloudinary.url(publicId, {
        resource_type: options?.resourceType || 'image',
        transformation: options?.transformation,
        format: options?.format,
        secure: options?.secure ?? true,
      });
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'GenerateUrl',
      });
      throw new Error(`URL generation failed: ${error.message}`);
    }
  }

  public async createFolder(folderName: string): Promise<any> {
    try {
      const result = await cloudinary.api.create_folder(folderName);

      return result;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'CreateFolder',
      });
      throw new Error(`Create folder failed: ${error.message}`);
    }
  }

  public async deleteFolder(folderName: string): Promise<any> {
    try {
      const result = await cloudinary.api.delete_folder(folderName);

      return result;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'DeleteFolder',
      });
      throw new Error(`Delete folder failed: ${error.message}`);
    }
  }

  public async getUsage(): Promise<any> {
    try {
      const result = await cloudinary.api.usage();

      return result;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'GetUsage',
      });
      throw new Error(`Get usage failed: ${error.message}`);
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await cloudinary.api.ping();
      return true;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'HealthCheck',
      });
      return false;
    }
  }

  public async archive(
    publicIds: string[],
    options?: { type?: string; target_format?: string }
  ): Promise<any> {
    try {
      const result = await cloudinary.utils.archive_params({
        public_ids: publicIds,
        type: options?.type || 'upload',
        target_format: options?.target_format || 'zip',
      });

      return result;
    } catch (error) {
      this.logger.error(error, {
        context: 'Cloudinary',
        location: 'Archive',
      });
      throw new Error(`Archive failed: ${error.message}`);
    }
  }
}
