import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PasswordStrengthValidator } from './register';
import { MIN_PASSWORD_LENGTH } from 'src/common/constants';

@ValidatorConstraint({ name: 'matchFields', async: false })
export class MatchValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${args.property} must match ${relatedPropertyName}.`;
  }
}

export class ChangePasswordDto {
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'OTP must contain only numbers and alphabetic characters.',
  })
  @Length(6, 6, { message: 'OTP must be exactly 6 characters.' })
  @IsNotEmpty({ message: 'OTP is required.' })
  otp: string;

  @Validate(PasswordStrengthValidator)
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  })
  @IsNotEmpty({ message: 'New password is required.' })
  newPassword: string;

  @Validate(MatchValidator, ['newPassword'], { message: 'Confirm password must match password.' })
  @IsString({ message: 'Confirm password must be a string.' })
  @IsNotEmpty({ message: 'Confirm password is required.' })
  confirmPassword: string;
}
