import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './auth/decorators/public.decorator.js';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { API_TAGS } from './swagger/swagger.config.js';

@ApiTags(API_TAGS.estado)
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Estado de la API (público)', description: 'Endpoint público de comprobación.' })
  @ApiProduces('text/plain')
  @ApiOkResponse({
    description: 'La API está en funcionamiento.',
    content: { 'text/plain': { schema: { type: 'string', example: 'PetCare API funcionando!' } } },
  })
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
