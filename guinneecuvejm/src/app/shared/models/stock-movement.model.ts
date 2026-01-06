export type StockMovementType = 
  | 'reception'      // Réception de stock
  | 'sale'           // Vente (déduction automatique)
  | 'adjustment'     // Ajustement manuel
  | 'loss'           // Perte
  | 'return'         // Retour
  | 'correction';    // Correction d'erreur

export type AdjustmentType = 
  | 'positive'       // Ajout de stock
  | 'negative'       // Retrait de stock
  | 'correction';    // Correction d'erreur

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  adjustmentType?: AdjustmentType; // Pour les ajustements
  quantity: number; // Quantité ajoutée ou retirée (peut être négative)
  previousStock: number; // Stock avant le mouvement
  newStock: number; // Stock après le mouvement
  reason: string; // Motif obligatoire
  notes?: string; // Notes optionnelles
  receiptNumber?: string; // Numéro de bon de réception (pour les réceptions)
  supplier?: string; // Fournisseur (pour les réceptions)
  receiptDate?: Date; // Date de réception
  createdBy: string; // ID de l'utilisateur
  createdByName?: string; // Nom de l'utilisateur (pour affichage)
  createdAt: Date;
}

