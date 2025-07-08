import { IsNotEmpty } from 'class-validator';

export class IdentityDto {
  @IsNotEmpty({ message: 'Identity is required' })
  identity: string;
}
