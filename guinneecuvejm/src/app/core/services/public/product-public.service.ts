import { Injectable, inject } from '@angular/core';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp
} from '@angular/fire/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { PublicProduct } from '../../../shared/models/public-product.model';
import { Product } from '../../../shared/models/product.model';
import { Observable, from, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductPublicService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly collectionName = 'products';

  /**
   * Récupérer tous les produits publics (actifs uniquement)
   * Note: On filtre côté client pour éviter les index composites
   */
  getAll(): Observable<PublicProduct[]> {
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(productsRef, where('isActive', '==', true));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const products = snapshot.docs.map(doc => this.convertToPublicProduct(doc.id, doc.data()));
        // Trier côté client
        return products.sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  /**
   * Récupérer les produits phares
   * Note: On filtre et trie côté client pour éviter les index composites
   */
  getFeatured(limitCount: number = 6): Observable<PublicProduct[]> {
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(productsRef, where('isActive', '==', true));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        // Les produits sont déjà filtrés par isActive dans la requête Firestore
        const products = snapshot.docs
          .map(doc => this.convertToPublicProduct(doc.id, doc.data()))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limitCount);
        return products;
      })
    );
  }

  /**
   * Récupérer un produit par ID
   */
  getById(id: string): Observable<PublicProduct | null> {
    const productRef = doc(this.firebaseService.firestore, this.collectionName, id);
    
    return from(getDoc(productRef)).pipe(
      map(docSnap => {
        if (docSnap.exists() && docSnap.data()['isActive']) {
          return this.convertToPublicProduct(docSnap.id, docSnap.data());
        }
        return null;
      })
    );
  }

  /**
   * Filtrer par catégorie
   * Note: On filtre côté client pour éviter les index composites
   */
  getByCategory(category: PublicProduct['category']): Observable<PublicProduct[]> {
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(productsRef, where('isActive', '==', true));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const products = snapshot.docs
          .map(doc => this.convertToPublicProduct(doc.id, doc.data()))
          .filter(p => p.category === category)
          .sort((a, b) => a.name.localeCompare(b.name));
        return products;
      })
    );
  }

  /**
   * Rechercher des produits
   * Note: Recherche côté client pour éviter les index composites
   */
  search(searchTerm: string): Observable<PublicProduct[]> {
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(productsRef, where('isActive', '==', true));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const term = searchTerm.toLowerCase();
        return snapshot.docs
          .map(doc => this.convertToPublicProduct(doc.id, doc.data()))
          .filter(product => 
            product.name.toLowerCase().includes(term) ||
            product.description.toLowerCase().includes(term) ||
            product.category.toLowerCase().includes(term) ||
            product.features.some(f => f.toLowerCase().includes(term))
          )
          .sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  /**
   * Filtrer par capacité (range)
   */
  getByCapacityRange(minCapacity: number, maxCapacity: number): Observable<PublicProduct[]> {
    return this.getAll().pipe(
      map(products => products.filter(p => 
        p.capacity >= minCapacity && p.capacity <= maxCapacity
      ))
    );
  }

  /**
   * Convertir un Product en PublicProduct
   */
  private convertToPublicProduct(id: string, data: any): PublicProduct {
    const images = data.images || [];
    const specs = data.specifications || {};
    
    return {
      id,
      name: data.name,
      description: data.description || '',
      category: data.category,
      capacity: data.capacity || 0,
      mainImage: images[0] || '',
      galleryImages: images.slice(1) || [],
      features: this.generateFeatures(data, specs),
      specifications: {
        dimensions: `${specs.height || 0}cm × ${specs.diameter || 0}cm`,
        weight: `${specs.weight || 0}kg`,
        material: 'Polyéthylène haute densité',
        color: specs.color || 'Bleu',
        warranty: '2 ans'
      },
      isFeatured: data.isFeatured || false,
      isAvailable: (data.stock || 0) > 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }

  /**
   * Générer les caractéristiques du produit
   */
  private generateFeatures(data: any, specs: any): string[] {
    const features: string[] = [];
    
    if (data.capacity) {
      features.push(`Capacité : ${data.capacity}L`);
    }
    if (specs.height && specs.diameter) {
      features.push(`Dimensions : ${specs.height}cm × ${specs.diameter}cm`);
    }
    if (specs.weight) {
      features.push(`Poids : ${specs.weight}kg`);
    }
    features.push('Résistant aux UV');
    features.push('Alimentaire compatible');
    features.push('Garantie 2 ans');
    
    return features;
  }
}

