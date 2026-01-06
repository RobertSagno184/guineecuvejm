/**
 * Modèle de produit pour le site vitrine public
 */
export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  category: 'cuve' | 'pompe' | 'accessoire';
  capacity: number; // en litres
  mainImage: string;
  galleryImages: string[];
  features: string[];
  specifications: {
    dimensions: string;
    weight: string;
    material: string;
    color: string;
    warranty: string;
  };
  isFeatured: boolean;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

