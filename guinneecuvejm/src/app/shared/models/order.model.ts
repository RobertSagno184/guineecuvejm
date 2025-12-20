export interface Order {
  id: string;
  customerId: string;
  productIds: string[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}


