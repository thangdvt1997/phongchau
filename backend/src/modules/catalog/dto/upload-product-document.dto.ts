import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadProductDocumentDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type!: DocumentType;
}
