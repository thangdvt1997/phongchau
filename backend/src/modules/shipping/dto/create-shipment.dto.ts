import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ShippingMethodType, ShippingZone } from '@prisma/client';

export class CreateShipmentDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiProperty({ enum: ShippingMethodType })
  @IsEnum(ShippingMethodType)
  method!: ShippingMethodType;

  @ApiPropertyOptional({ enum: ShippingZone })
  @IsOptional()
  @IsEnum(ShippingZone)
  zone?: ShippingZone;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  cost!: number;
}
