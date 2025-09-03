import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { DevelopmentService } from './development.service';

@Controller('dev')
export class DevelopmentController {
  constructor(private readonly developmentService: DevelopmentService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUsersFromDb() {
    return await this.developmentService.getUsersFromDb();
  }

  @Post('create-user')
  @HttpCode(HttpStatus.CREATED)
  async createUserInDb() {
    return await this.developmentService.createUserInDb();
  }
}
