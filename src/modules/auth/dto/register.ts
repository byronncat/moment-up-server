import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  MaxLength,
} from 'class-validator';

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

  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Only letters, numbers, dots, underscores, and hyphens are allowed',
  })
  @MaxLength(50, { message: 'Username must be less than 50 characters' })
  @MinLength(2, { message: 'Username must be at least 2 characters' })
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @Validate(PasswordStrengthValidator)
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
