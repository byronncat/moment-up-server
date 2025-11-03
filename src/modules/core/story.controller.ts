import type { JwtPayload } from 'jwt-library';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StoryService } from './story.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import { CreateStoryDto } from './dto/create-story';
import { ReportStoryDto } from './dto/report-story';

@Controller({
  path: 'stories',
  version: '1',
})
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getStoryNotifications(@AccessToken() token: JwtPayload) {
    const userId = token.sub;
    return {
      stories: await this.storyService.getNotifications(userId!),
    };
  }

  @Get('user/:username')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getStory(@Param('username') username: string) {
    return {
      story: await this.storyService.getStoryByUsername(username),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async createStory(@Body() body: CreateStoryDto, @AccessToken() token: JwtPayload) {
    const userId = token.sub;
    return {
      story: await this.storyService.create(body, userId!),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async deleteStory(@Param('id') id: any, @AccessToken() token: JwtPayload) {
    const userId = token.sub ?? '';
    await this.storyService.deleteStory(id, userId);
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AccessTokenGuard)
  async reportStory(
    @Param('id') id: string,
    @Body() reportStoryDto: ReportStoryDto,
    @AccessToken() token: JwtPayload
  ) {
    const userId = token.sub;
    return {
      report: await this.storyService.report({ storyId: id, userId: userId! }, reportStoryDto),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshStoryStats() {
    await this.storyService.refreshStats();
    return {
      message: 'Story stats refreshed successfully.',
    };
  }
}
