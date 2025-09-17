import type { JwtPayload } from 'jwt-library';

import { Controller, HttpCode, HttpStatus, Get, UseGuards, Param, Delete } from '@nestjs/common';
import { StoryService } from './story.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';

@Controller({
  path: 'stories',
  version: '1',
})
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getStories(@AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    return {
      stories: await this.storyService.getStories(userId),
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async deleteStory(@Param('id') id: string, @AccessToken() token: JwtPayload) {
    const userId = token?.sub || '';
    await this.storyService.deleteStory(id, userId);
  }
}
