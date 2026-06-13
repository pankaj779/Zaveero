export type ProjectRecord = {
  id: string;
  name: string;
  clientName: string;
  location: string;
  description: string;
  category: string;
  photos: string[];
  videos: string[];
  featured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type PricingItemRecord = {
  id: string;
  materialType: string;
  category: string;
  itemName: string;
  unit: string;
  rate: number;
  sortOrder: number;
};

export type TestimonialRecord = {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  status: string;
  sortOrder: number;
  createdAt: Date;
};

export type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
};

export type QuotationItemInput = {
  itemName: string;
  unit: string;
  quantity: number;
  rate: number;
  notes?: string;
};

export type QuotationFormData = {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  projectTitle: string;
  location: string;
  serviceType: string;
  description: string;
  items: QuotationItemInput[];
};
