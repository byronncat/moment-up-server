import {
  IsEmail,
  IsNotEmpty,
  Matches,
  MaxLength,
  MinLength,
  NotContains,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { MAX_NAME_LENGTH, MIN_PASSWORD_LENGTH, MIN_USERNAME_LENGTH } from 'src/common/constants';

@ValidatorConstraint({ name: 'passwordStrength', async: false })
export class PasswordStrengthValidator implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    let conditionsMet = 0;
    if (/[A-Z]/.test(password)) conditionsMet++;
    if (/[a-z]/.test(password)) conditionsMet++;
    if (/[0-9]/.test(password)) conditionsMet++;
    return conditionsMet >= 3;
  }

  defaultMessage(): string {
    return 'Password must include at least three of the following: uppercase letter (A-Z), lowercase letter (a-z), number (0-9)';
  }
}

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @Matches(/^[a-zA-Z0-9._]+$/, {
    message: 'Only letters, numbers, underscores, and dots are allowed',
  })
  @Matches(/^[^.].*$/, { message: 'Username cannot start with a dot' })
  @Matches(/^.*[^.]$/, { message: 'Username cannot end with a dot' })
  @NotContains('..', { message: 'Username cannot contain consecutive dots' })
  @MaxLength(MAX_NAME_LENGTH, {
    message: `Username must be less than ${MAX_NAME_LENGTH} characters`,
  })
  @MinLength(MIN_USERNAME_LENGTH, {
    message: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
  })
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @Validate(PasswordStrengthValidator)
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
  })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
