import { IsNotEmpty, IsString } from 'class-validator';

export class UsernameParamDto {
  @IsNotEmpty({ message: 'Username is required' })
  @IsString({ message: 'Username must be a string' })
  username: string;
}
