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
  serverTimestamp
} from '@angular/fire/firestore';
import { FirebaseService } from './firebase.service';
import { Customer, CustomerCommunication } from '../../../shared/models/customer.model';
import { Observable, from, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly collectionName = 'customers';

  /**
   * Récupérer tous les clients
   */
  getAll(): Observable<Customer[]> {
    const customersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(customersRef, orderBy('companyName', 'asc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreData(doc.data())
      } as Customer)))
    );
  }

  /**
   * Récupérer un client par ID
   */
  getById(id: string): Observable<Customer | null> {
    const customerRef = doc(this.firebaseService.firestore, this.collectionName, id);
    
    return from(getDoc(customerRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...this.convertFirestoreData(docSnap.data())
          } as Customer;
        }
        return null;
      })
    );
  }

  /**
   * Rechercher des clients
   */
  search(searchTerm: string): Observable<Customer[]> {
    const customersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(customersRef, orderBy('companyName', 'asc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const term = searchTerm.toLowerCase();
        return snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...this.convertFirestoreData(doc.data())
          } as Customer))
          .filter(customer => 
            customer.companyName.toLowerCase().includes(term) ||
            customer.contactPerson.toLowerCase().includes(term) ||
            customer.email.toLowerCase().includes(term) ||
            customer.phone.includes(term)
          );
      })
    );
  }

  /**
   * Filtrer par type
   */
  getByType(type: Customer['type']): Observable<Customer[]> {
    const customersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(
      customersRef,
      where('type', '==', type),
      orderBy('companyName', 'asc')
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreData(doc.data())
      } as Customer)))
    );
  }

  /**
   * Créer un nouveau client
   */
  async create(customer: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const customersRef = collection(this.firebaseService.firestore, this.collectionName);
    
    const customerData = {
      ...customer,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(customersRef, customerData);
    return docRef.id;
  }

  /**
   * Mettre à jour un client
   */
  async update(id: string, customer: Partial<Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt'>>): Promise<void> {
    const customerRef = doc(this.firebaseService.firestore, this.collectionName, id);
    
    await updateDoc(customerRef, {
      ...customer,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Supprimer un client
   */
  async delete(id: string): Promise<void> {
    const customerRef = doc(this.firebaseService.firestore, this.collectionName, id);
    await deleteDoc(customerRef);
  }

  /**
   * Mettre à jour les statistiques d'un client
   */
  async updateStats(id: string, totalOrders: number, totalSpent: number): Promise<void> {
    const customerRef = doc(this.firebaseService.firestore, this.collectionName, id);
    await updateDoc(customerRef, {
      totalOrders,
      totalSpent,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Convertir les données Firestore en Customer
   */
  private convertFirestoreData(data: any): Omit<Customer, 'id'> {
    const communicationHistory: CustomerCommunication[] = (data.communicationHistory || []).map((comm: any) => ({
      type: comm.type,
      subject: comm.subject,
      content: comm.content,
      sentAt: comm.sentAt?.toDate() || new Date(),
      sentBy: comm.sentBy,
      notes: comm.notes
    }));

    return {
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone || '',
      address: data.address || {
        street: '',
        city: '',
        country: ''
      },
      type: data.type || 'particulier',
      totalOrders: data.totalOrders || 0,
      totalSpent: data.totalSpent || 0,
      communicationHistory: communicationHistory.length > 0 ? communicationHistory : undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  }
}


