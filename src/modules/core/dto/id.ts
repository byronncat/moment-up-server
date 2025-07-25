import { IsUUID } from 'class-validator';

export class IdParamDto {
  @IsUUID(4, { message: 'Invalid UUID format' })
  id: string;
}
