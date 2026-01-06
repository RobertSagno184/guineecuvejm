import { Injectable, inject } from '@angular/core';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { from, firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly collectionName = 'newsletterSubscriptions';

  /**
   * S'abonner à la newsletter
   */
  async subscribe(email: string, name?: string): Promise<string> {
    // Vérifier si l'email existe déjà
    const subscriptionsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(subscriptionsRef, where('email', '==', email));
    
    // Utiliser from() pour garantir le contexte d'injection
    const snapshot = await firstValueFrom(from(getDocs(q)));
    
    if (!snapshot.empty) {
      throw new Error('Cet email est déjà inscrit à la newsletter');
    }

    const subscriptionData = {
      email,
      name: name || '',
      subscribedAt: serverTimestamp(),
      isActive: true
    };

    const docRef = await firstValueFrom(from(addDoc(subscriptionsRef, subscriptionData)));
    return docRef.id;
  }

  /**
   * Se désabonner de la newsletter
   */
  async unsubscribe(email: string): Promise<void> {
    const subscriptionsRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(subscriptionsRef, where('email', '==', email));
    
    // Utiliser from() pour garantir le contexte d'injection
    const snapshot = await firstValueFrom(from(getDocs(q)));
    
    if (snapshot.empty) {
      throw new Error('Email non trouvé');
    }

    // Note: Pour désabonner, il faudrait mettre à jour le document
    // Pour l'instant, on retourne juste une confirmation
    // TODO: Implémenter la mise à jour du document
  }
}

