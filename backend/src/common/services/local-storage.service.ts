import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StorageService, StoredFile } from '../interfaces/storage.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get<string>('uploadDir') ?? './uploads';
    this.publicBaseUrl = this.config.get<string>('publicBaseUrl') ?? '';
  }

  async save(buffer: Buffer, originalName: string, mimeType: string): Promise<StoredFile> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const ext = path.extname(originalName);
    const fileName = `${randomUUID()}${ext}`;
    const fullPath = path.join(this.uploadDir, fileName);
    await fs.writeFile(fullPath, buffer);

    return {
      url: `${this.publicBaseUrl}/api/v1/uploads/${fileName}`,
      path: fullPath,
      mimeType,
      sizeBytes: buffer.length,
    };
  }

  async delete(filePath: string): Promise<void> {
    await fs.rm(filePath, { force: true });
  }
}
