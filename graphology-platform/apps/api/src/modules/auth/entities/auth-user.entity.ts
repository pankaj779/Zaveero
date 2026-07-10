/**
 * Domain entity placeholder for authenticated identity.
 * Persistence mapping will be completed in later authentication tasks.
 */
export class AuthUserEntity {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  emailVerified!: boolean;
  isActive!: boolean;
}
