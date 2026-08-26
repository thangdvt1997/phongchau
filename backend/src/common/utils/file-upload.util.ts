import { BadRequestException } from '@nestjs/common';
import type { Options as MulterOptions } from 'multer';

/** Applies to every upload endpoint (product images, product documents, payment proofs). */
export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_MIME_TYPES = ['application/pdf'];

function mimeTypeFileFilter(allowed: string[]): MulterOptions['fileFilter'] {
  return (_req, file, callback) => {
    if (!allowed.includes(file.mimetype)) {
      // multer's FileFilterCallback overload for the error case takes exactly one
      // argument — no `acceptFile` boolean alongside a non-null error.
      callback(
        new BadRequestException(`Unsupported file type "${file.mimetype}". Allowed types: ${allowed.join(', ')}`),
      );
      return;
    }
    callback(null, true);
  };
}

/** FileInterceptor options for image uploads: jpeg/png/webp only, capped at MAX_UPLOAD_FILE_SIZE_BYTES. */
export const imageUploadOptions: MulterOptions = {
  limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
  fileFilter: mimeTypeFileFilter(IMAGE_MIME_TYPES),
};

/** FileInterceptor options for PDF document uploads, capped at MAX_UPLOAD_FILE_SIZE_BYTES. */
export const documentUploadOptions: MulterOptions = {
  limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
  fileFilter: mimeTypeFileFilter(DOCUMENT_MIME_TYPES),
};

/** FileInterceptor options for payment proof uploads: image or PDF, capped at MAX_UPLOAD_FILE_SIZE_BYTES. */
export const paymentProofUploadOptions: MulterOptions = {
  limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES },
  fileFilter: mimeTypeFileFilter([...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES]),
};
