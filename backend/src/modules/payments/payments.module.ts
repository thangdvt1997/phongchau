import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  PAYMENT_PROVIDER_REGISTRY,
  PaymentProvider,
} from '../../common/interfaces/payment-provider.interface';
import { PaymentProviderType } from '@prisma/client';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CodPaymentProvider } from './providers/cod.provider';
import { BankTransferPaymentProvider } from './providers/bank-transfer.provider';
import { VnpayPaymentProvider } from './providers/vnpay.provider';
import { StripePaymentProvider } from './providers/stripe.provider';

@Module({
  imports: [CommonModule],
  controllers: [PaymentsController],
  providers: [
    CodPaymentProvider,
    BankTransferPaymentProvider,
    VnpayPaymentProvider,
    StripePaymentProvider,
    RolesGuard,
    {
      provide: PAYMENT_PROVIDER_REGISTRY,
      useFactory: (
        cod: CodPaymentProvider,
        bank: BankTransferPaymentProvider,
        vnpay: VnpayPaymentProvider,
        stripe: StripePaymentProvider,
      ) =>
        new Map<PaymentProviderType, PaymentProvider>([
          [cod.type, cod],
          [bank.type, bank],
          [vnpay.type, vnpay],
          [stripe.type, stripe],
        ]),
      inject: [CodPaymentProvider, BankTransferPaymentProvider, VnpayPaymentProvider, StripePaymentProvider],
    },
    PaymentsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
