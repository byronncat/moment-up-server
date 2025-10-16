import { IsNotEmpty } from 'class-validator';

export class SwitchAccountDto {
  @IsNotEmpty({ message: 'Account ID is required.' })
  accountId: string;
}
