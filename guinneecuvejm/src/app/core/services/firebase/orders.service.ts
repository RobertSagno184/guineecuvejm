import { Injectable, inject } from '@angular/core';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp
} from '@angular/fire/firestore';
import { FirebaseService } from './firebase.service';
import { ProductsService } from './products.service';
import { Order, OrderItem, OrderStatusHistory, OrderStatus } from '../../../shared/models/order.model';
import { Observable, from, map, firstValueFrom } from 'rxjs';
import { AuthState } from '../../services/auth/auth.state';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly productsService = inject(ProductsService);
  private readonly authState = inject(AuthState);
  private readonly collectionName = 'orders';

  /**
   * Récupérer toutes les commandes
   */
  getAll(): Observable<Order[]> {
    const ordersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreData(doc.data())
      } as Order)))
    );
  }

  /**
   * Récupérer une commande par ID
   */
  getById(id: string): Observable<Order | null> {
    const orderRef = doc(this.firebaseService.firestore, this.collectionName, id);
    
    return from(getDoc(orderRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...this.convertFirestoreData(docSnap.data())
          } as Order;
        }
        return null;
      })
    );
  }

  /**
   * Récupérer les commandes par statut
   */
  getByStatus(status: OrderStatus): Observable<Order[]> {
    const ordersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(
      ordersRef,
      where('status', '==', status)
      // orderBy retiré pour éviter l'index composite - tri côté client
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertFirestoreData(doc.data())
        } as Order));
        // Trier par date de création (plus récent en premier)
        return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      })
    );
  }

  /**
   * Récupérer les commandes d'un client
   */
  getByCustomer(customerId: string): Observable<Order[]> {
    const ordersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(
      ordersRef,
      where('customerId', '==', customerId)
      // orderBy retiré pour éviter l'index composite - tri côté client
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertFirestoreData(doc.data())
        } as Order));
        // Trier par date de création (plus récent en premier)
        return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      })
    );
  }

  /**
   * Récupérer les commandes du jour
   */
  getTodayOrders(): Observable<Order[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const ordersRef = collection(this.firebaseService.firestore, this.collectionName);
    // Utiliser seulement un where pour éviter l'index composite
    // Filtrer la deuxième condition côté client
    const q = query(
      ordersRef,
      where('createdAt', '>=', today)
      // orderBy retiré pour éviter l'index composite - tri côté client
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const orders = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...this.convertFirestoreData(doc.data())
          } as Order))
          // Filtrer les commandes d'aujourd'hui et trier
          .filter(order => {
            const orderDate = order.createdAt;
            return orderDate >= today && orderDate < tomorrow;
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return orders;
      })
    );
  }

  /**
   * Récupérer les dernières commandes
   */
  getRecent(limitCount: number = 10): Observable<Order[]> {
    const ordersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(limitCount));
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreData(doc.data())
      } as Order)))
    );
  }

  /**
   * Créer une nouvelle commande
   */
  async create(order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ordersRef = collection(this.firebaseService.firestore, this.collectionName);
    
    // Générer le numéro de commande
    const orderNumber = await this.generateOrderNumber();
    
    // Récupérer l'utilisateur actuel pour l'historique initial
    const currentUser = this.authState.user();
    const changedBy = currentUser?.uid || currentUser?.email || 'system';
    
    // Créer l'entrée d'historique initiale avec le statut "pending"
    const initialStatus = order.status || 'pending';
    const initialHistoryEntry: OrderStatusHistory = {
      status: initialStatus,
      changedAt: new Date(),
      changedBy,
      notes: 'Commande créée'
    };
    
    // Initialiser l'historique avec l'entrée initiale
    const initialHistory = [initialHistoryEntry];
    
    const orderData = {
      ...order,
      orderNumber,
      status: initialStatus,
      statusHistory: initialHistory, // Toujours initialiser l'historique
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(ordersRef, orderData);
    return docRef.id;
  }

  /**
   * Mettre à jour une commande
   * Préserve toujours l'historique existant
   */
  async update(id: string, order: Partial<Omit<Order, 'id' | 'orderNumber' | 'createdAt'>>): Promise<void> {
    const orderRef = doc(this.firebaseService.firestore, this.collectionName, id);
    
    // Récupérer la commande actuelle pour préserver l'historique
    const currentOrder = await firstValueFrom(this.getById(id));
    
    const updateData: any = {
      ...order
    };
    
    // Si l'historique n'est pas fourni dans les données de mise à jour, préserver l'existant
    if (!order.statusHistory && currentOrder?.statusHistory) {
      updateData.statusHistory = currentOrder.statusHistory;
    }
    // Si l'historique n'existe pas du tout, créer un historique initial
    else if (!order.statusHistory && !currentOrder?.statusHistory) {
      const initialHistory: OrderStatusHistory = {
        status: currentOrder?.status || 'pending',
        changedAt: currentOrder?.createdAt || new Date(),
        changedBy: 'system',
        notes: 'Statut initial'
      };
      updateData.statusHistory = [initialHistory];
    }
    
    // Nettoyer updateData pour supprimer les valeurs undefined
    const cleanUpdateData: any = {};
    for (const key in updateData) {
      if (updateData[key] !== undefined) {
        cleanUpdateData[key] = updateData[key];
      }
    }
    
    await updateDoc(orderRef, {
      ...cleanUpdateData,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Mettre à jour le statut d'une commande
   * Si le statut passe à "delivered", soustrait automatiquement le stock des produits
   * @param id - ID de la commande
   * @param status - Nouveau statut
   * @param reason - Raison du changement (optionnel, requis pour annulation)
   * @param notes - Notes additionnelles (optionnel)
   */
  async updateStatus(
    id: string, 
    status: OrderStatus, 
    reason?: string, 
    notes?: string
  ): Promise<void> {
    // Récupérer la commande actuelle pour vérifier l'ancien statut
    const currentOrder = await firstValueFrom(this.getById(id));
    
    if (!currentOrder) {
      throw new Error('Commande non trouvée');
    }

    // Si le statut passe à "delivered", soustraire le stock
    if (status === 'delivered' && currentOrder.status !== 'delivered') {
      await this.deductStockFromOrder(currentOrder);
    }
    // Si on annule une commande déjà livrée, restaurer le stock
    else if (status === 'cancelled' && currentOrder.status === 'delivered') {
      await this.restoreStockFromOrder(currentOrder);
    }

    // Récupérer l'utilisateur actuel pour l'historique
    const currentUser = this.authState.user();
    const changedBy = currentUser?.uid || currentUser?.email || 'system';

    // Créer l'entrée d'historique (sans inclure les propriétés undefined)
    const historyEntry: OrderStatusHistory = {
      status,
      changedAt: new Date(),
      changedBy
    };
    
    // Ajouter reason seulement s'il est défini
    if (reason) {
      historyEntry.reason = reason;
    }
    
    // Ajouter notes seulement s'il est défini
    if (notes) {
      historyEntry.notes = notes;
    }

    // Récupérer l'historique existant ou créer un nouveau tableau
    const existingHistory = currentOrder.statusHistory || [];
    const updatedHistory = [...existingHistory, historyEntry];

    // Préparer les données de mise à jour (sans valeurs undefined)
    const updateData: any = {
      status,
      statusHistory: updatedHistory
    };

    // Si c'est une annulation, sauvegarder la raison seulement si elle existe
    if (status === 'cancelled' && reason) {
      updateData.cancellationReason = reason;
    }
    // Si on change d'un statut annulé vers un autre statut, supprimer la raison d'annulation
    else if (currentOrder.status === 'cancelled' && status !== 'cancelled') {
      updateData.cancellationReason = null; // Utiliser null au lieu de undefined pour supprimer le champ
    }

    // Mettre à jour la commande en préservant toujours l'historique
    const orderRef = doc(this.firebaseService.firestore, this.collectionName, id);
    
    // S'assurer que l'historique est toujours présent et préservé
    if (!updateData.statusHistory || updateData.statusHistory.length === 0) {
      // Si pour une raison quelconque l'historique est vide, recréer l'entrée initiale
      const initialHistory: OrderStatusHistory = {
        status: currentOrder.status,
        changedAt: currentOrder.createdAt,
        changedBy: 'system',
        notes: 'Statut initial'
      };
      updateData.statusHistory = [initialHistory, historyEntry];
    }
    
    // Nettoyer updateData pour supprimer les valeurs undefined
    // Utiliser une fonction récursive pour nettoyer les objets imbriqués
    const cleanUpdateData: any = {};
    for (const key in updateData) {
      const value = updateData[key];
      // Inclure null (pour supprimer des champs) mais exclure undefined
      if (value !== undefined) {
        // Si c'est un tableau, nettoyer chaque élément
        if (Array.isArray(value)) {
          cleanUpdateData[key] = value.map(item => {
            if (typeof item === 'object' && item !== null) {
              const cleanedItem: any = {};
              for (const itemKey in item) {
                if (item[itemKey] !== undefined) {
                  cleanedItem[itemKey] = item[itemKey];
                }
              }
              return cleanedItem;
            }
            return item;
          });
        } else {
          cleanUpdateData[key] = value;
        }
      }
    }
    
    await updateDoc(orderRef, {
      ...cleanUpdateData,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Soustraire le stock des produits d'une commande
   */
  private async deductStockFromOrder(order: Order): Promise<void> {
    for (const item of order.items) {
      try {
        // Récupérer le produit actuel
        const product = await firstValueFrom(this.productsService.getById(item.productId));
        
        if (!product) {
          console.warn(`Produit ${item.productId} non trouvé pour la commande ${order.id}`);
          continue;
        }

        // Calculer le nouveau stock
        const oldStock = product.stock;
        const newStock = Math.max(0, oldStock - item.quantity);

        // Mettre à jour le stock
        await this.productsService.updateStock(item.productId, newStock);
        
        // Si le stock atteint 0, désactiver le produit
        if (newStock === 0 && product.isActive) {
          await this.productsService.toggleActive(item.productId, false);
          console.log(`Produit ${product.name} désactivé car le stock est épuisé`);
        }
        
        console.log(`Stock mis à jour pour ${product.name}: ${oldStock} -> ${newStock} (quantité soustraite: ${item.quantity})`);
      } catch (error) {
        console.error(`Erreur lors de la mise à jour du stock pour le produit ${item.productId}:`, error);
        // On continue avec les autres produits même en cas d'erreur
      }
    }
  }

  /**
   * Restaurer le stock des produits d'une commande annulée
   */
  private async restoreStockFromOrder(order: Order): Promise<void> {
    for (const item of order.items) {
      try {
        // Récupérer le produit actuel
        const product = await firstValueFrom(this.productsService.getById(item.productId));
        
        if (!product) {
          console.warn(`Produit ${item.productId} non trouvé pour la commande ${order.id}`);
          continue;
        }

        // Restaurer le stock
        const oldStock = product.stock;
        const newStock = oldStock + item.quantity;

        // Mettre à jour le stock
        await this.productsService.updateStock(item.productId, newStock);
        
        // Si le stock était à 0 et qu'on restaure du stock, réactiver le produit
        if (oldStock === 0 && newStock > 0 && !product.isActive) {
          await this.productsService.toggleActive(item.productId, true);
          console.log(`Produit ${product.name} réactivé car le stock a été restauré`);
        }
        
        console.log(`Stock restauré pour ${product.name}: ${oldStock} -> ${newStock} (quantité restaurée: ${item.quantity})`);
      } catch (error) {
        console.error(`Erreur lors de la restauration du stock pour le produit ${item.productId}:`, error);
        // On continue avec les autres produits même en cas d'erreur
      }
    }
  }

  /**
   * Supprimer une commande
   */
  async delete(id: string): Promise<void> {
    const orderRef = doc(this.firebaseService.firestore, this.collectionName, id);
    await deleteDoc(orderRef);
  }

  /**
   * Générer un numéro de commande unique (Format: GCP-2024-001)
   */
  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const ordersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(
      ordersRef,
      where('orderNumber', '>=', `GCP-${year}-000`),
      where('orderNumber', '<=', `GCP-${year}-999`),
      orderBy('orderNumber', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return `GCP-${year}-001`;
    }
    
    const lastOrderNumber = snapshot.docs[0].data()['orderNumber'];
    const lastNumber = parseInt(lastOrderNumber.split('-')[2]);
    const nextNumber = String(lastNumber + 1).padStart(3, '0');
    
    return `GCP-${year}-${nextNumber}`;
  }

  /**
   * Convertir les données Firestore en Order
   */
  private convertFirestoreData(data: any): Omit<Order, 'id'> {
    // Convertir l'historique des statuts et le trier par date (plus ancien en premier)
    const statusHistory: OrderStatusHistory[] = (data.statusHistory || [])
      .map((entry: any) => ({
        status: entry.status,
        changedAt: entry.changedAt?.toDate() || new Date(),
        changedBy: entry.changedBy,
        reason: entry.reason,
        notes: entry.notes
      }))
      .sort((a: OrderStatusHistory, b: OrderStatusHistory) => 
        a.changedAt.getTime() - b.changedAt.getTime()
      );

    return {
      orderNumber: data.orderNumber || '',
      customerId: data.customerId,
      customerName: data.customerName || '',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      tax: data.tax || 0,
      total: data.total || 0,
      status: data.status || 'pending',
      paymentMethod: data.paymentMethod || 'cash',
      notes: data.notes || '',
      cancellationReason: data.cancellationReason || undefined,
      statusHistory: statusHistory.length > 0 ? statusHistory : undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }
}


