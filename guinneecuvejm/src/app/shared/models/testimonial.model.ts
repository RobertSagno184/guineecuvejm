/**
 * Modèle de témoignage client
 */
export interface Testimonial {
  id: string;
  clientName: string;
  company: string;
  rating: number; // 1-5
  comment: string;
  date: Date;
  projectType: string;
  imageUrl?: string;
  sector?: string; // Secteur d'activité
  isPublished: boolean;
}

