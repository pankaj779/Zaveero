import type { ContactConfig } from '../brand/types';
import { brandConfig } from '../brand/brand.config';

export const contactConfig: ContactConfig = {
  email: brandConfig.email,
  phone: brandConfig.phone,
  whatsapp: 'https://wa.me/00000000000',
  address: 'Address placeholder',
  mapUrl: '#',
  businessHours: 'Business hours placeholder',
  social: brandConfig.social,
};
