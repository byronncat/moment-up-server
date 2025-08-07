import { IsNotEmpty } from 'class-validator';

export class IdParamDto {
  @IsNotEmpty({ message: 'ID is required' })
  id: string;
}
