import { Injectable, inject } from '@angular/core';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { FirebaseService } from '../firebase/firebase.service';
import { ContactRequest } from '../../../shared/models/contact-request.model';
import { Observable, from, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly collectionName = 'contactRequests';

  /**
   * Envoyer une demande de contact
   */
  async submitContactRequest(request: Omit<ContactRequest, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const requestsRef = collection(this.firebaseService.firestore, this.collectionName);
    
    const requestData = {
      ...request,
      status: 'new',
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(requestsRef, requestData);
    return docRef.id;
  }

  /**
   * Envoyer une demande de devis rapide
   */
  async submitQuickQuote(
    productId: string,
    quantity: number,
    contactInfo: {
      name: string;
      email: string;
      phone: string;
      company?: string;
    }
  ): Promise<string> {
    const requestsRef = collection(this.firebaseService.firestore, this.collectionName);
    
    const requestData = {
      name: contactInfo.name,
      email: contactInfo.email,
      phone: contactInfo.phone,
      company: contactInfo.company || '',
      subject: `Demande de devis - Produit ${productId}`,
      message: `Demande de devis pour ${quantity} unité(s) du produit ${productId}`,
      productInterest: productId,
      status: 'new',
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(requestsRef, requestData);
    return docRef.id;
  }
}

