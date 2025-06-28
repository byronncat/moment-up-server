import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignupAuthDto {
  @MinLength(2, { message: 'Username must be at least 2 characters' })
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
