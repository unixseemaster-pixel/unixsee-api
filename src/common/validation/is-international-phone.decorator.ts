import { Transform } from 'class-transformer';
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import type { CountryCode } from 'libphonenumber-js';

import { isValidInternationalPhone, toE164Phone } from './phone.js';

type InternationalPhoneOptions = ValidationOptions & {
  /** Default region when the user omits `+` / country calling code. */
  defaultCountry?: CountryCode;
};

/**
 * Transform raw phone input to E.164 when valid; leave original value otherwise
 * so {@link IsInternationalPhone} can reject it.
 *
 * Persian / Arabic-Indic digits are accepted (normalized inside {@link toE164Phone}).
 */
export function TransformToE164Phone(
  defaultCountry?: CountryCode,
): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    if (!value.trim()) return value;
    return toE164Phone(value, defaultCountry) ?? value.trim();
  });
}

/**
 * Accepts international phones; leading `+` is not required.
 * Persian / Arabic-Indic digits are valid (normalized before parse).
 */
export function IsInternationalPhone(options: InternationalPhoneOptions = {}) {
  const { defaultCountry, ...validationOptions } = options;

  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isInternationalPhone',
      target: object.constructor,
      propertyName,
      options: {
        message: 'Invalid phone number.',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          if (!value.trim()) return false;
          return isValidInternationalPhone(value, defaultCountry);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid international phone number`;
        },
      },
    });
  };
}
