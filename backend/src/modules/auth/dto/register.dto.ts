import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  // Normalize casing so "User@x.com" and "user@x.com" are treated as the same account —
  // otherwise the email-uniqueness check in AuthService.assertEmailFree() misses the
  // collision (Postgres's default collation is case-sensitive) and login becomes
  // case-sensitive in a way most users don't expect.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
