import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyDto {
  @IsNotEmpty({ message: 'Token is required.' })
  @IsString()
  token: string;
}
