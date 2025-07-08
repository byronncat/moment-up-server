import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { PasswordStrengthValidator } from './register';

@ValidatorConstraint({ name: 'matchFields', async: false })
export class MatchValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must match ${relatedPropertyName}`;
  }
}

export class ChangePasswordDto {
  @Matches(/^[A-Za-z0-9]+$/, { message: 'OTP must contain only numbers and alphabetic characters' })
  @Length(6, 6, { message: 'OTP must be exactly 6 characters' })
  @IsNotEmpty({ message: 'OTP is required' })
  otp: string;

  @Validate(PasswordStrengthValidator)
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;

  @Validate(MatchValidator, ['newPassword'], { message: 'Confirm password must match password' })
  @IsString({ message: 'Confirm password must be a string' })
  @IsNotEmpty({ message: 'Confirm password is required' })
  confirmPassword: string;
}
