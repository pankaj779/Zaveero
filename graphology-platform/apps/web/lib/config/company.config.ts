import type { CompanySettings } from '../brand/types';
import { brandConfig } from '../brand/brand.config';

export const companySettings: CompanySettings = {
  languages: ['en'],
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  locale: 'en_US',
  country: 'IN',
  supportEmail: brandConfig.support.email,
  legalEmail: 'legal@example.com',
};
