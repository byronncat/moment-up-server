import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginAuthDto {
  @IsString({ message: 'Identity must be a string' })
  @IsNotEmpty({ message: 'Identity is required' })
  identity: string;

  @IsString({ message: 'Password must be a string' })
  @IsOptional()
  password: string;
}
