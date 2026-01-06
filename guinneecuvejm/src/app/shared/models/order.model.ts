export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderStatusHistory {
  status: OrderStatus;
  changedAt: Date;
  changedBy?: string;
  reason?: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // Format: GCP-2024-001
  customerId: string;
  customerName?: string; // Pour affichage rapide
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentMethod: 'cash' | 'bank_transfer' | 'check';
  notes: string;
  cancellationReason?: string; // Raison d'annulation
  statusHistory?: OrderStatusHistory[]; // Historique des modifications
  createdAt: Date;
  updatedAt: Date;
}


