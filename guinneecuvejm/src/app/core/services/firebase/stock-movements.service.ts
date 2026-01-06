import { Injectable, inject } from '@angular/core';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { FirebaseService } from './firebase.service';
import { StockMovement, StockMovementType } from '../../../shared/models/stock-movement.model';
import { Observable, from, map } from 'rxjs';
import { AuthState } from '../auth/auth.state';

@Injectable({ providedIn: 'root' })
export class StockMovementsService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authState = inject(AuthState);
  private readonly collectionName = 'stockMovements';

  /**
   * Créer un mouvement de stock
   */
  async create(movement: Omit<StockMovement, 'id' | 'createdAt'>): Promise<string> {
    const movementsRef = collection(this.firebaseService.firestore, this.collectionName);
    
    const movementData = {
      ...movement,
      createdAt: serverTimestamp()
    };

    // Nettoyer les valeurs undefined avant d'envoyer à Firestore
    const cleanedData = this.cleanObject(movementData);

    const docRef = await addDoc(movementsRef, cleanedData);
    return docRef.id;
  }

  /**
   * Nettoyer un objet en supprimant récursivement toutes les propriétés undefined
   */
  private cleanObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObject(item)).filter(item => item !== undefined);
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          // Inclure null (pour supprimer des champs) mais exclure undefined
          if (value !== undefined) {
            if (value !== null && typeof value === 'object' && !(value instanceof Date) && !(value.constructor?.name === 'Timestamp')) {
              cleaned[key] = this.cleanObject(value);
            } else {
              cleaned[key] = value;
            }
          }
        }
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Récupérer tous les mouvements de stock
   */
  getAll(): Observable<StockMovement[]> {
    const movementsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(movementsRef, orderBy('createdAt', 'desc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const movements = snapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertFirestoreData(doc.data())
        } as StockMovement));
        return movements;
      })
    );
  }

  /**
   * Récupérer les mouvements pour un produit spécifique
   * Note: Filtre côté client pour éviter les index composites Firestore
   */
  getByProduct(productId: string): Observable<StockMovement[]> {
    const movementsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(movementsRef, orderBy('createdAt', 'desc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const movements = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...this.convertFirestoreData(doc.data())
          } as StockMovement))
          .filter(movement => movement.productId === productId);
        return movements;
      })
    );
  }

  /**
   * Récupérer les mouvements par type
   * Note: Filtre côté client pour éviter les index composites Firestore
   */
  getByType(type: StockMovementType): Observable<StockMovement[]> {
    const movementsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(movementsRef, orderBy('createdAt', 'desc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const movements = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...this.convertFirestoreData(doc.data())
          } as StockMovement))
          .filter(movement => movement.type === type);
        return movements;
      })
    );
  }

  /**
   * Récupérer les réceptions récentes
   * Note: Filtre côté client pour éviter les index composites Firestore
   */
  getRecentReceptions(limitCount: number = 10): Observable<StockMovement[]> {
    const movementsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(movementsRef, orderBy('createdAt', 'desc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const movements = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...this.convertFirestoreData(doc.data())
          } as StockMovement))
          .filter(movement => movement.type === 'reception')
          .slice(0, limitCount);
        return movements;
      })
    );
  }

  /**
   * Convertir les données Firestore en StockMovement
   */
  private convertFirestoreData(data: any): Omit<StockMovement, 'id'> {
    return {
      productId: data.productId,
      productName: data.productName || '',
      type: data.type,
      adjustmentType: data.adjustmentType,
      quantity: data.quantity || 0,
      previousStock: data.previousStock || 0,
      newStock: data.newStock || 0,
      reason: data.reason || '',
      notes: data.notes,
      receiptNumber: data.receiptNumber,
      supplier: data.supplier,
      receiptDate: data.receiptDate?.toDate() || undefined,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: data.createdAt?.toDate() || new Date()
    };
  }
}

