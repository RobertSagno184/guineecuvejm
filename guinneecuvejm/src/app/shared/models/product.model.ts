export interface Product {
  id: string;
  name: string;
  description: string;
  category: 'cuve' | 'accessoire' | 'pompe';
  capacity: number; // en litres
  price: number;
  stock: number;
  minStock: number;
  images: string[]; // URLs Firebase Storage
  specifications: {
    height: number; // en cm
    diameter: number; // en cm
    weight: number; // en kg
    color: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}


