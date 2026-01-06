import { Injectable, inject, signal } from '@angular/core';
import { Product } from '../../shared/models/product.model';
import { AuthState } from './auth/auth.state';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from '@angular/fire/firestore';
import { FirebaseService } from './firebase/firebase.service';
import { Observable, from, map, of, firstValueFrom } from 'rxjs';

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authState = inject(AuthState);
  
  private readonly CART_STORAGE_KEY = 'guinee_cuve_cart';
  private readonly CART_COLLECTION = 'carts';
  
  readonly cart = signal<Cart>({
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0
  });
  
  readonly itemCount = signal(0);
  readonly isLoading = signal(false);

  constructor() {
    this.loadCart();
  }

  /**
   * Charger le panier depuis localStorage ou Firestore
   */
  private async loadCart(): Promise<void> {
    const userId = this.authState.user()?.uid;
    
    if (userId) {
      // Charger depuis Firestore si connecté
      await this.loadCartFromFirestore(userId);
    } else {
      // Charger depuis localStorage si non connecté
      this.loadCartFromLocalStorage();
    }
  }

  /**
   * Charger le panier depuis Firestore
   */
  private async loadCartFromFirestore(userId: string): Promise<void> {
    try {
      const cartRef = doc(this.firebaseService.firestore, this.CART_COLLECTION, userId);
      // Utiliser from() pour garantir le contexte d'injection
      const cartSnap = await firstValueFrom(from(getDoc(cartRef)));
      
      if (cartSnap.exists()) {
        const data = cartSnap.data();
        this.cart.set({
          items: data['items'] || [],
          subtotal: data['subtotal'] || 0,
          tax: data['tax'] || 0,
          total: data['total'] || 0
        });
        this.updateItemCount();
      } else {
        // Si pas de panier Firestore, essayer localStorage
        this.loadCartFromLocalStorage();
      }
    } catch (error) {
      console.error('Erreur lors du chargement du panier:', error);
      this.loadCartFromLocalStorage();
    }
  }

  /**
   * Charger le panier depuis localStorage
   */
  private loadCartFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.CART_STORAGE_KEY);
      if (stored) {
        const cartData = JSON.parse(stored);
        this.cart.set(cartData);
        this.updateItemCount();
      }
    } catch (error) {
      console.error('Erreur lors du chargement du panier localStorage:', error);
    }
  }

  /**
   * Sauvegarder le panier dans Firestore et localStorage
   */
  private async saveCart(): Promise<void> {
    const userId = this.authState.user()?.uid;
    const cartData = this.cart();
    
    // Sauvegarder dans localStorage
    try {
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cartData));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde localStorage:', error);
    }
    
    // Sauvegarder dans Firestore si connecté
    if (userId) {
      try {
        const cartRef = doc(this.firebaseService.firestore, this.CART_COLLECTION, userId);
        // Utiliser from() pour garantir le contexte d'injection
        await firstValueFrom(from(setDoc(cartRef, {
          ...cartData,
          userId,
          updatedAt: serverTimestamp()
        }, { merge: true })));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde Firestore:', error);
      }
    }
  }

  /**
   * Ajouter un produit au panier
   */
  async addItem(product: Product, quantity: number = 1): Promise<void> {
    if (quantity <= 0 || product.stock < quantity) {
      throw new Error('Quantité invalide ou stock insuffisant');
    }

    const currentCart = this.cart();
    const existingItemIndex = currentCart.items.findIndex(
      item => item.productId === product.id
    );

    let newItems: CartItem[];

    if (existingItemIndex >= 0) {
      // Mettre à jour la quantité
      const existingItem = currentCart.items[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      
      if (newQuantity > product.stock) {
        throw new Error('Stock insuffisant');
      }

      newItems = [...currentCart.items];
      newItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        totalPrice: newQuantity * existingItem.unitPrice
      };
    } else {
      // Ajouter un nouvel item
      const newItem: CartItem = {
        productId: product.id,
        product,
        quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity
      };
      newItems = [...currentCart.items, newItem];
    }

    this.updateCart(newItems);
    await this.saveCart();
  }

  /**
   * Retirer un produit du panier
   */
  async removeItem(productId: string): Promise<void> {
    const currentCart = this.cart();
    const newItems = currentCart.items.filter(item => item.productId !== productId);
    this.updateCart(newItems);
    await this.saveCart();
  }

  /**
   * Mettre à jour la quantité d'un produit
   */
  async updateQuantity(productId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.removeItem(productId);
      return;
    }

    const currentCart = this.cart();
    const itemIndex = currentCart.items.findIndex(item => item.productId === productId);
    
    if (itemIndex < 0) {
      throw new Error('Produit non trouvé dans le panier');
    }

    const item = currentCart.items[itemIndex];
    
    if (quantity > item.product.stock) {
      throw new Error('Stock insuffisant');
    }

    const newItems = [...currentCart.items];
    newItems[itemIndex] = {
      ...item,
      quantity,
      totalPrice: item.unitPrice * quantity
    };

    this.updateCart(newItems);
    await this.saveCart();
  }

  /**
   * Vider le panier
   */
  async clearCart(): Promise<void> {
    this.cart.set({
      items: [],
      subtotal: 0,
      tax: 0,
      total: 0
    });
    this.itemCount.set(0);
    await this.saveCart();
  }

  /**
   * Mettre à jour les calculs du panier
   */
  private updateCart(items: CartItem[]): void {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = subtotal; // Pas de TVA

    this.cart.set({
      items,
      subtotal,
      tax: 0, // Pas de TVA
      total
    });

    this.updateItemCount();
  }

  /**
   * Mettre à jour le nombre d'items
   */
  private updateItemCount(): void {
    const count = this.cart().items.reduce((sum, item) => sum + item.quantity, 0);
    this.itemCount.set(count);
  }

  /**
   * Obtenir le nombre d'items dans le panier
   */
  getItemCount(): number {
    return this.itemCount();
  }

  /**
   * Vérifier si le panier est vide
   */
  isEmpty(): boolean {
    return this.cart().items.length === 0;
  }

  /**
   * Obtenir un item du panier par productId
   */
  getItem(productId: string): CartItem | undefined {
    return this.cart().items.find(item => item.productId === productId);
  }

  /**
   * Synchroniser le panier localStorage avec Firestore après connexion
   */
  async syncCartAfterLogin(userId: string): Promise<void> {
    // Charger le panier Firestore
    const cartRef = doc(this.firebaseService.firestore, this.CART_COLLECTION, userId);
    // Utiliser from() pour garantir le contexte d'injection
    const cartSnap = await firstValueFrom(from(getDoc(cartRef)));
    
    const localCart = this.cart();
    
    if (cartSnap.exists()) {
      const firestoreCart = cartSnap.data();
      // Fusionner les paniers (priorité au panier Firestore)
      if (firestoreCart['items'] && firestoreCart['items'].length > 0) {
        this.cart.set({
          items: firestoreCart['items'] || [],
          subtotal: firestoreCart['subtotal'] || 0,
          tax: firestoreCart['tax'] || 0,
          total: firestoreCart['total'] || 0
        });
      } else if (localCart.items.length > 0) {
        // Si Firestore est vide mais localStorage a des items, sauvegarder localStorage
        await this.saveCart();
      }
    } else if (localCart.items.length > 0) {
      // Si pas de panier Firestore, sauvegarder le panier localStorage
      await this.saveCart();
    }
    
    this.updateItemCount();
  }
}

