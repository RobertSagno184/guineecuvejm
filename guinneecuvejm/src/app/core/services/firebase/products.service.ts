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
  serverTimestamp,
  Timestamp,
  QueryConstraint
} from '@angular/fire/firestore';
import { FirebaseService } from './firebase.service';
import { Product } from '../../../shared/models/product.model';
import { Observable, from, map, firstValueFrom } from 'rxjs';
import { AuthState } from '../auth/auth.state';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authState = inject(AuthState);
  private readonly cloudinaryService = inject(CloudinaryService);
  private readonly collectionName = 'products';

  /**
   * Récupérer tous les produits
   */
  getAll(): Observable<Product[]> {
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    // Note: Si vous utilisez orderBy avec where, vous devrez créer un index composite dans Firestore
    // Pour l'instant, on récupère tous les produits et on les trie côté client
    return from(getDocs(productsRef)).pipe(
      map(snapshot => {
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertFirestoreData(doc.data())
        } as Product));
        // Trier par date de création (plus récent en premier)
        return products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      })
    );
  }

  /**
   * Récupérer un produit par ID
   */
  getById(id: string): Observable<Product | null> {
    const productRef = doc(this.firebaseService.firestore, this.collectionName, id);
    
    return from(getDoc(productRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...this.convertFirestoreData(docSnap.data())
          } as Product;
        }
        return null;
      })
    );
  }

  /**
   * Récupérer les produits actifs uniquement
   */
  getActive(): Observable<Product[]> {
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    // On filtre seulement par isActive pour éviter d'avoir besoin d'un index composite
    // Le tri sera fait côté client
    const q = query(
      productsRef, 
      where('isActive', '==', true)
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertFirestoreData(doc.data())
        } as Product));
        // Trier côté client par nom
        return products.sort((a, b) => a.name.localeCompare(b.name));
      })
    );
  }

  /**
   * Récupérer les produits avec stock faible
   * Note: Filtre côté client pour éviter les index composites Firestore
   */
  getLowStock(): Observable<Product[]> {
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(
      productsRef,
      where('isActive', '==', true)
      // Pas d'orderBy pour éviter l'index composite
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...this.convertFirestoreData(doc.data())
        } as Product))
        .filter(product => product.stock <= product.minStock)
        .sort((a, b) => a.stock - b.stock) // Trier côté client
      )
    );
  }

  /**
   * Rechercher des produits
   */
  search(searchTerm: string): Observable<Product[]> {
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(productsRef, orderBy('name', 'asc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const term = searchTerm.toLowerCase();
        return snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...this.convertFirestoreData(doc.data())
          } as Product))
          .filter(product => 
            product.name.toLowerCase().includes(term) ||
            product.description.toLowerCase().includes(term) ||
            product.category.toLowerCase().includes(term)
          );
      })
    );
  }

  /**
   * Filtrer par catégorie
   */
  getByCategory(category: Product['category']): Observable<Product[]> {
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(
      productsRef,
      where('category', '==', category),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreData(doc.data())
      } as Product)))
    );
  }

  /**
   * Créer un nouveau produit
   */
  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    
    const productData = {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(productsRef, productData);
    return docRef.id;
  }

  /**
   * Mettre à jour un produit
   */
  async update(id: string, product: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<void> {
    const productRef = doc(this.firebaseService.firestore, this.collectionName, id);
    
    await updateDoc(productRef, {
      ...product,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Supprimer un produit
   */
  async delete(id: string): Promise<void> {
    const productRef = doc(this.firebaseService.firestore, this.collectionName, id);
    await deleteDoc(productRef);
  }

  /**
   * Désactiver/Activer un produit
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive });
  }

  /**
   * Mettre à jour le stock (méthode simple, sans mouvement)
   * Pour les ajustements avec historique, utiliser adjustStock dans le composant
   */
  async updateStock(id: string, newStock: number): Promise<void> {
    await this.update(id, { stock: newStock });
  }

  /**
   * Upload une image de produit vers Cloudinary
   */
  async uploadImage(file: File, productId: string, imageIndex: number): Promise<string> {
    try {
      // Avec un preset unsigned, les transformations doivent être configurées dans l'Upload Preset
      // ou appliquées lors de l'affichage via getOptimizedUrl
      const response = await firstValueFrom(
        this.cloudinaryService.uploadImage(file, {
          folder: `products/${productId}`
        })
      );
      
      // Stocker les métadonnées dans Firestore
      await this.saveImageMetadata(productId, response);
      
      return response.secure_url;
    } catch (error: any) {
      console.error('Erreur lors de l\'upload de l\'image:', error);
      throw new Error(error.message || 'Erreur lors de l\'upload de l\'image. Veuillez réessayer.');
    }
  }

  /**
   * Upload plusieurs images
   */
  async uploadImages(files: File[], productId: string): Promise<string[]> {
    const uploadPromises = files.map((file, index) => 
      this.uploadImage(file, productId, index)
    );
    
    try {
      return await Promise.all(uploadPromises);
    } catch (error: any) {
      console.error('Erreur lors de l\'upload des images:', error);
      throw error;
    }
  }

  /**
   * Stocker les métadonnées d'image dans Firestore
   */
  private async saveImageMetadata(productId: string, cloudinaryResponse: any): Promise<void> {
    const userId = this.authState.user()?.uid;
    if (!userId) return;

    const metadataRef = collection(this.firebaseService.firestore, 'imageMetadata');
    await addDoc(metadataRef, {
      productId,
      userId,
      publicId: cloudinaryResponse.public_id,
      url: cloudinaryResponse.secure_url,
      format: cloudinaryResponse.format,
      width: cloudinaryResponse.width,
      height: cloudinaryResponse.height,
      bytes: cloudinaryResponse.bytes,
      createdAt: serverTimestamp(),
      folder: cloudinaryResponse.folder
    });
  }

  /**
   * Récupérer l'historique des uploads pour un produit
   */
  getImageHistory(productId: string): Observable<any[]> {
    const metadataRef = collection(this.firebaseService.firestore, 'imageMetadata');
    const q = query(
      metadataRef,
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })))
    );
  }

  /**
   * Supprimer une image (note: nécessite une API backend pour supprimer de Cloudinary)
   */
  async deleteImage(imageUrl: string): Promise<void> {
    // Pour supprimer de Cloudinary, il faut utiliser une API backend
    // car cela nécessite la clé API secrète
    console.warn('La suppression d\'images Cloudinary doit être effectuée via une API backend sécurisée.');
    // On peut supprimer les métadonnées de Firestore
    const metadataRef = collection(this.firebaseService.firestore, 'imageMetadata');
    const q = query(metadataRef, where('url', '==', imageUrl));
    const snapshot = await getDocs(q);
    
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
  }

  /**
   * Générer un numéro de référence unique pour un produit
   */
  async generateProductReference(category: Product['category']): Promise<string> {
    const prefix = category === 'cuve' ? 'CUV' : category === 'pompe' ? 'PMP' : 'ACC';
    const productsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(productsRef, where('category', '==', category), orderBy('createdAt', 'desc'), limit(1));
    
    const snapshot = await getDocs(q);
    const year = new Date().getFullYear();
    
    if (snapshot.empty) {
      return `${prefix}-${year}-001`;
    }
    
    // Logique pour incrémenter le numéro (simplifié)
    return `${prefix}-${year}-${String(snapshot.size + 1).padStart(3, '0')}`;
  }

  /**
   * Convertir les données Firestore en Product
   */
  private convertFirestoreData(data: any): Omit<Product, 'id'> {
    return {
      name: data.name,
      description: data.description || '',
      category: data.category,
      capacity: data.capacity || 0,
      price: data.price,
      stock: data.stock || 0,
      minStock: data.minStock || 0,
      images: data.images || [],
      specifications: data.specifications || {
        height: 0,
        diameter: 0,
        weight: 0,
        color: ''
      },
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }
}


