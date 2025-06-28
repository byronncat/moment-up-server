import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MomentsService } from './moments.service';
import { CreateMomentDto } from './dto/create-moment.dto';
import { UpdateMomentDto } from './dto/update-moment.dto';

@Controller('moments')
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  @Post()
  create(@Body() createMomentDto: CreateMomentDto) {
    return this.momentsService.create(createMomentDto);
  }

  @Get()
  findAll() {
    return this.momentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.momentsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMomentDto: UpdateMomentDto) {
    return this.momentsService.update(+id, updateMomentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.momentsService.remove(+id);
  }
}
