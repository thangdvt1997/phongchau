import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { BusinessType } from '@prisma/client';

export class RegisterB2bDto {
  @ApiProperty()
  // See RegisterDto.email — normalize casing so email-uniqueness/login stay case-insensitive.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  contactPerson!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsString()
  companyName!: string;

  @ApiProperty()
  @IsString()
  taxId!: string;

  @ApiProperty()
  @IsString()
  country!: string;

  @ApiProperty({ enum: BusinessType })
  @IsEnum(BusinessType)
  businessType!: BusinessType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expectedVolume?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  interestedProducts?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;
}
