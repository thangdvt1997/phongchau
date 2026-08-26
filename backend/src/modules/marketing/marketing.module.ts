import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module';
import { MarketingAutomationService } from './marketing-automation.service';

// This is the first (and, at time of writing, only) place ScheduleModule.forRoot()
// is registered in the app — confirmed via `grep -rn "ScheduleModule" src` before
// adding this. If another module ever needs @Cron()/@Interval(), it should just
// import MarketingAutomationModule (or, if that creates an unwanted dependency,
// this registration should move up to AppModule) rather than calling forRoot() again.
@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  providers: [MarketingAutomationService],
  exports: [MarketingAutomationService],
})
export class MarketingAutomationModule {}
