import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('hello')
  getHelloWorld(): string {
    return 'Hello from NestJS!';
  }

  @Get('user')
  async getUser(@Query('id') id: string): Promise<{ id: string; name: string }> {
    const user = await this.appService.findUser(id);
    return { id: user.id, name: user.name };
  }
}
