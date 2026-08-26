import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { CreateContactLeadDto } from './dto/create-contact-lead.dto';

@ApiTags('crm')
@Controller()
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('contact')
  createContactLead(@Body() dto: CreateContactLeadDto) {
    return this.crmService.createContactLead(dto);
  }
}
