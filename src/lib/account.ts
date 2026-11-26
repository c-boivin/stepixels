import { PASSWORD_MIN_LENGTH } from '~/lib/rules'

// one @, something on each side, a dot in the domain: Supabase checks the address for real
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A first name with at least one letter or digit: the profiles table refuses an empty or blank one. */
export function isFirstNameValid(firstName: string): boolean {
  return firstName.trim() !== ''
}

/** An e-mail address that looks complete (`camille@exemple.fr`), spaces around it ignored. */
export function isEmailValid(email: string): boolean {
  return EMAIL_FORMAT.test(email.trim())
}

/** A password of at least `PASSWORD_MIN_LENGTH` characters (an emoji counts as one). */
export function isPasswordValid(password: string): boolean {
  return Array.from(password).length >= PASSWORD_MIN_LENGTH
}
