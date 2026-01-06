export interface CustomerCommunication {
  type: 'email' | 'phone' | 'note';
  subject?: string;
  content: string;
  sentAt: Date;
  sentBy?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    country: string;
  };
  type: 'particulier' | 'professionnel' | 'revendeur';
  totalOrders: number;
  totalSpent: number;
  communicationHistory?: CustomerCommunication[];
  createdAt?: Date;
  updatedAt?: Date;
}


