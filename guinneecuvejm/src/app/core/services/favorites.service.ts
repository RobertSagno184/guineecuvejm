import { Injectable, inject, signal } from '@angular/core';
import { AuthState } from './auth/auth.state';
import { FirebaseService } from './firebase/firebase.service';
import { ProductsService } from './firebase/products.service';
import { Product } from '../../shared/models/product.model';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, from, map, switchMap, of, firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly authState = inject(AuthState);
  private readonly firebaseService = inject(FirebaseService);
  private readonly productsService = inject(ProductsService);
  private readonly COLLECTION_NAME = 'favorites';

  readonly favorites = signal<string[]>([]); // Array of product IDs
  readonly isLoading = signal(false);

  constructor() {
    this.loadFavorites();
  }

  /**
   * Charger les favoris de l'utilisateur
   */
  private async loadFavorites(): Promise<void> {
    const userId = this.authState.user()?.uid;
    if (!userId) {
      this.favorites.set([]);
      return;
    }

    this.isLoading.set(true);
    try {
      const favoritesRef = doc(this.firebaseService.firestore, this.COLLECTION_NAME, userId);
      const docSnap = await getDoc(favoritesRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        this.favorites.set(data['productIds'] || []);
      } else {
        this.favorites.set([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
      this.favorites.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Ajouter un produit aux favoris
   */
  async addToFavorites(productId: string): Promise<void> {
    const userId = this.authState.user()?.uid;
    if (!userId) {
      throw new Error('Vous devez être connecté pour ajouter aux favoris');
    }

    const currentFavorites = this.favorites();
    if (currentFavorites.includes(productId)) {
      return; // Déjà dans les favoris
    }

    const newFavorites = [...currentFavorites, productId];
    this.favorites.set(newFavorites);

    try {
      const favoritesRef = doc(this.firebaseService.firestore, this.COLLECTION_NAME, userId);
      await setDoc(favoritesRef, {
        productIds: newFavorites,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      // Rollback en cas d'erreur
      this.favorites.set(currentFavorites);
      console.error('Erreur lors de l\'ajout aux favoris:', error);
      throw error;
    }
  }

  /**
   * Retirer un produit des favoris
   */
  async removeFromFavorites(productId: string): Promise<void> {
    const userId = this.authState.user()?.uid;
    if (!userId) {
      throw new Error('Vous devez être connecté pour retirer des favoris');
    }

    const currentFavorites = this.favorites();
    if (!currentFavorites.includes(productId)) {
      return; // Pas dans les favoris
    }

    const newFavorites = currentFavorites.filter(id => id !== productId);
    this.favorites.set(newFavorites);

    try {
      const favoritesRef = doc(this.firebaseService.firestore, this.COLLECTION_NAME, userId);
      await setDoc(favoritesRef, {
        productIds: newFavorites,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      // Rollback en cas d'erreur
      this.favorites.set(currentFavorites);
      console.error('Erreur lors de la suppression des favoris:', error);
      throw error;
    }
  }

  /**
   * Vérifier si un produit est dans les favoris
   */
  isFavorite(productId: string): boolean {
    return this.favorites().includes(productId);
  }

  /**
   * Récupérer tous les produits favoris
   */
  getFavoriteProducts(): Observable<Product[]> {
    const favoriteIds = this.favorites();
    if (favoriteIds.length === 0) {
      return of([]);
    }

    // Récupérer chaque produit par son ID
    return from(Promise.all(
      favoriteIds.map(id => firstValueFrom(this.productsService.getById(id)))
    )).pipe(
      map(products => products.filter((p): p is Product => p !== null))
    );
  }

  /**
   * Récupérer le nombre de favoris
   */
  getFavoriteCount(): number {
    return this.favorites().length;
  }
}

