import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaymentProviderType, Role } from '@prisma/client';
import { STORAGE_SERVICE, StorageService } from '../../common/interfaces/storage.interface';
import { PaymentsService } from './payments.service';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { paymentProofUploadOptions } from '../../common/utils/file-upload.util';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  /**
   * Called unauthenticated by the payment gateway itself; each provider's
   * verifyWebhook() is responsible for validating the payload's signature.
   */
  @Post('payments/webhook/:provider')
  webhook(@Param('provider') provider: string, @Body() body: Record<string, unknown>) {
    return this.paymentsService.handleWebhook(this.parseProviderType(provider), body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/payments/:id/mark-paid')
  markPaid(@Param('id') id: string) {
    return this.paymentsService.markPaid(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/payments/:id/refund')
  refund(@Param('id') id: string, @Body() dto: RefundPaymentDto) {
    return this.paymentsService.refund(id, dto);
  }

  /**
   * Customer-facing despite the /admin path prefix (kept alongside the other
   * per-payment actions for discoverability) — the customer uploads their own bank
   * transfer proof, so this only requires authentication, not admin RBAC.
   */
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post('admin/payments/:id/proof')
  @UseInterceptors(FileInterceptor('file', { ...paymentProofUploadOptions, storage: memoryStorage() }))
  async uploadProof(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }
    const stored = await this.storage.save(file.buffer, file.originalname, file.mimetype);
    return this.paymentsService.attachProof(id, stored.url);
  }

  private parseProviderType(value: string): PaymentProviderType {
    const values = Object.values(PaymentProviderType) as string[];
    if (!values.includes(value)) {
      throw new BadRequestException(`Unknown payment provider: ${value}`);
    }
    return value as PaymentProviderType;
  }
}
