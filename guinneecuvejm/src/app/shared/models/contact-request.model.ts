/**
 * Modèle de demande de contact
 */
export interface ContactRequest {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  subject: string;
  message: string;
  productInterest?: string; // ID du produit d'intérêt
  createdAt: Date;
  status?: 'new' | 'read' | 'replied' | 'archived';
}

