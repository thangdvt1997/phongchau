import { Global, Module } from '@nestjs/common';
import { LocalStorageService } from './services/local-storage.service';
import { STORAGE_SERVICE } from './interfaces/storage.interface';

@Global()
@Module({
  providers: [{ provide: STORAGE_SERVICE, useClass: LocalStorageService }],
  exports: [STORAGE_SERVICE],
})
export class CommonModule {}
