import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './modules/health/health.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { RfqModule } from './modules/rfq/rfq.module';
import { OemModule } from './modules/oem/oem.module';
import { B2bModule } from './modules/b2b/b2b.module';
import { CmsModule } from './modules/cms/cms.module';
import { SeoModule } from './modules/seo/seo.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { CrmModule } from './modules/crm/crm.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    CommonModule,
    HealthModule,
    UploadsModule,
    AuthModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    CurrencyModule,
    RfqModule,
    OemModule,
    B2bModule,
    CmsModule,
    SeoModule,
    EngagementModule,
    NotificationsModule,
    AdminModule,
    CrmModule,
  ],
})
export class AppModule {}
