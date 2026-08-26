export interface StoredFile {
  url: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Abstraction over "where uploaded files live". P0 implements local disk;
 * swapping to S3/MinIO later means implementing this interface only.
 */
export interface StorageService {
  save(buffer: Buffer, originalName: string, mimeType: string): Promise<StoredFile>;
  delete(path: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
