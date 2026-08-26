import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class RfqItemInputDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specification?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  packaging?: string;
}

export class CreateRfqDto {
  @ApiProperty({ type: [RfqItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RfqItemInputDto)
  items!: RfqItemInputDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  destinationCountry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  destinationPort?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  incoterm?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentTerm?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  specialRequirement?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
