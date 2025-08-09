import type { JwtPayload } from 'library';

import { Controller, HttpCode, HttpStatus, Get, UseGuards, Param, Delete } from '@nestjs/common';
import { StoryService } from './story.service';
import { AccessTokenGuard } from 'src/common/guards';
import { AccessToken } from 'src/common/decorators';
import { IdParamDto, UsernameParamDto } from 'src/common/validators';

@Controller({
  path: 'stories',
  version: '1',
})
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getStories(@AccessToken() { sub: userId }: JwtPayload) {
    return {
      stories: await this.storyService.getStories(userId),
    };
  }

  @Get('user/:username')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getStory(@Param() { username }: UsernameParamDto) {
    return {
      story: await this.storyService.getStoryByUsername(username),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async deleteStory(@Param() { id }: IdParamDto, @AccessToken() { sub: userId }: JwtPayload) {
    await this.storyService.deleteStory(id, userId);
  }
}
