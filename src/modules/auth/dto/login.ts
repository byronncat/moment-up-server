import { IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Identity is required.' })
  identity: string;

  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}
