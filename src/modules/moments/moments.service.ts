import { Injectable } from '@nestjs/common';
import { CreateMomentDto } from './dto/create-moment.dto';
import { UpdateMomentDto } from './dto/update-moment.dto';

@Injectable()
export class MomentsService {
  create(createMomentDto: CreateMomentDto) {
    return 'This action adds a new moment';
  }

  findAll() {
    return `This action returns all moments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} moment`;
  }

  update(id: number, updateMomentDto: UpdateMomentDto) {
    return `This action updates a #${id} moment`;
  }

  remove(id: number) {
    return `This action removes a #${id} moment`;
  }
}
