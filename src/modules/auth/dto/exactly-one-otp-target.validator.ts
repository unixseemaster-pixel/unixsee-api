import {
  registerDecorator,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidationOptions,
  type ValidatorConstraintInterface,
} from 'class-validator';

/** The two fields an OTP body may name a delivery/verification target with. */
interface OtpTargetShape {
  phoneNumber?: unknown;
  email?: unknown;
}

/**
 * A field counts as supplied only when it carries something a target could be
 * resolved from. Blank and whitespace-only strings are treated as absent so
 * this matches `RateLimitGuard`'s own presence test (`typeof value === 'string'
 * && value.trim()`); if the DTO and the guard disagreed about which field is
 * "present", they could bucket and verify different targets again.
 */
function isSupplied(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

@ValidatorConstraint({ name: 'exactlyOneOtpTarget', async: false })
class ExactlyOneOtpTargetConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const body = args.object as OtpTargetShape;

    // Exclusive or: exactly one of the two targets, never both, never neither.
    return isSupplied(body.phoneNumber) !== isSupplied(body.email);
  }

  defaultMessage(): string {
    return 'Provide exactly one of phoneNumber or email.';
  }
}

/**
 * Rejects an OTP body that names both a phone number and an email, or neither.
 *
 * Why this exists: the OTP services branch on `email` first and fall back to
 * `phoneNumber`, while the per-target rate-limit rule buckets on whichever
 * field the guard finds first. A body carrying both fields therefore had two
 * different targets in play at once — an attacker could pin the counter to a
 * throwaway phone number while the service verified codes against a victim's
 * email, so the per-target verify ceiling never tripped. Allowing only one
 * target collapses that gap: the bucket and the verified target are the same
 * value by construction.
 *
 * Attach this to a property that carries no `@IsOptional()`/`@ValidateIf()` of
 * its own (`context` on both OTP DTOs). class-validator skips *every*
 * constraint on a conditionally-validated property when the condition is
 * false, so hanging this off `phoneNumber` or `email` would silently disable it
 * for exactly the case it has to catch: a body with neither target. It also
 * declares no property of its own, so the global `ValidationPipe`'s
 * `forbidNonWhitelisted` has nothing extra to reject.
 */
export function ExactlyOneOtpTarget(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'exactlyOneOtpTarget',
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: ExactlyOneOtpTargetConstraint,
    });
  };
}
