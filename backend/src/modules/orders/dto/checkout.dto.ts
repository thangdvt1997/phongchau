import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PaymentProviderType } from '@prisma/client';
import { AddressInputDto } from './address-input.dto';

export class CheckoutDto {
  @ApiProperty({ required: false, description: 'Required when checking out as a guest' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @ApiProperty({ required: false, type: AddressInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInputDto)
  shippingAddress?: AddressInputDto;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  billingSameAsShipping?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  billingAddressId?: string;

  @ApiProperty({ required: false, type: AddressInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressInputDto)
  billingAddress?: AddressInputDto;

  @ApiProperty({ enum: PaymentProviderType })
  @IsEnum(PaymentProviderType)
  paymentProvider!: PaymentProviderType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerNote?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
