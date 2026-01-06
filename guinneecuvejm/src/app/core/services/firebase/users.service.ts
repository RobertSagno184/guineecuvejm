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
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { sendPasswordResetEmail, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { FirebaseService } from './firebase.service';
import { User, RoleChange } from '../../../shared/models/user.model';
import { Observable, from, map, firstValueFrom } from 'rxjs';
import { AuthState } from '../auth/auth.state';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authState = inject(AuthState);
  private readonly collectionName = 'users';

  /**
   * Récupérer tous les utilisateurs
   */
  getAll(): Observable<User[]> {
    const usersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(usersRef, orderBy('email', 'asc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreData(doc.data())
      } as User)))
    );
  }

  /**
   * Récupérer un utilisateur par ID
   */
  getById(id: string): Observable<User | null> {
    const userRef = doc(this.firebaseService.firestore, this.collectionName, id);
    
    return from(getDoc(userRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...this.convertFirestoreData(docSnap.data())
          } as User;
        }
        return null;
      })
    );
  }

  /**
   * Rechercher des utilisateurs
   */
  search(searchTerm: string): Observable<User[]> {
    const usersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(usersRef, orderBy('email', 'asc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const term = searchTerm.toLowerCase();
        return snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...this.convertFirestoreData(doc.data())
          } as User))
          .filter(user => 
            user.email.toLowerCase().includes(term) ||
            (user.displayName && user.displayName.toLowerCase().includes(term))
          );
      })
    );
  }

  /**
   * Filtrer par rôle
   */
  getByRole(role: User['role']): Observable<User[]> {
    const usersRef = collection(this.firebaseService.firestore, this.collectionName);
    const q = query(
      usersRef,
      where('role', '==', role),
      orderBy('email', 'asc')
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...this.convertFirestoreData(doc.data())
      } as User)))
    );
  }

  /**
   * Mettre à jour un utilisateur
   */
  async update(id: string, user: Partial<Omit<User, 'id'>>): Promise<void> {
    const userRef = doc(this.firebaseService.firestore, this.collectionName, id);
    
    await updateDoc(userRef, {
      ...user,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Mettre à jour le rôle d'un utilisateur
   */
  async updateRole(id: string, role: User['role']): Promise<void> {
    await this.update(id, { role });
  }

  /**
   * Créer un nouvel utilisateur
   */
  async create(
    email: string,
    password: string,
    displayName: string,
    role: User['role'],
    createdBy?: string
  ): Promise<string> {
    try {
      // Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.firebaseService.auth,
        email,
        password
      );

      // Créer le document dans Firestore
      const usersRef = collection(this.firebaseService.firestore, this.collectionName);
      const currentUser = this.authState.user();
      const docRef = await addDoc(usersRef, {
        email,
        displayName,
        role,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: createdBy || currentUser?.uid || 'system',
        roleHistory: [{
          previousRole: role,
          newRole: role,
          changedAt: new Date(),
          changedBy: createdBy || currentUser?.uid || 'system'
        }]
      });

      return docRef.id;
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      throw error;
    }
  }

  /**
   * Supprimer un utilisateur
   */
  async delete(userId: string, firebaseAuthUid?: string): Promise<void> {
    try {
      // Supprimer de Firestore
      const userRef = doc(this.firebaseService.firestore, this.collectionName, userId);
      await deleteDoc(userRef);

      // Supprimer de Firebase Auth si l'UID est fourni
      if (firebaseAuthUid) {
        // Note: La suppression depuis Firebase Auth nécessite des privilèges admin
        // On peut seulement désactiver le compte ici
        // Pour une vraie suppression, il faudrait utiliser les Cloud Functions
      }
    } catch (error: any) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      throw error;
    }
  }

  /**
   * Désactiver/Activer un utilisateur
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive });
  }

  /**
   * Mettre à jour le rôle avec historique
   */
  async updateRoleWithHistory(
    id: string,
    newRole: User['role'],
    reason?: string
  ): Promise<void> {
    const user = await firstValueFrom(this.getById(id));
    if (!user) throw new Error('Utilisateur non trouvé');

    const currentUser = this.authState.user();
    const roleChange: RoleChange = {
      previousRole: user.role,
      newRole,
      changedAt: new Date(),
      changedBy: currentUser?.uid || 'system',
      reason
    };

    const roleHistory = user.roleHistory || [];
    roleHistory.push(roleChange);

    await this.update(id, {
      role: newRole,
      roleHistory: roleHistory.slice(-10) // Garder seulement les 10 derniers changements
    });
  }

  /**
   * Réinitialiser le mot de passe (envoie un email de réinitialisation)
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    await sendPasswordResetEmail(this.firebaseService.auth, email);
  }

  /**
   * Compter les utilisateurs par rôle
   */
  async getCountByRole(): Promise<Record<User['role'], number>> {
    const users = await firstValueFrom(this.getAll());
    const counts: Record<User['role'], number> = {
      admin: 0,
      client: 0,
      'gérant': 0
    };
    
    users.forEach(user => {
      counts[user.role] = (counts[user.role] || 0) + 1;
    });
    
    return counts;
  }

  /**
   * Convertir les données Firestore en User
   */
  private convertFirestoreData(data: any): Omit<User, 'id'> {
    return {
      email: data.email || '',
      displayName: data.displayName || '',
      role: data.role || 'client',
      isActive: data.isActive !== undefined ? data.isActive : true,
      photoURL: data.photoURL || undefined,
      createdAt: data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate() 
        : data.createdAt?.toDate?.() || undefined,
      updatedAt: data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate() 
        : data.updatedAt?.toDate?.() || undefined,
      lastLoginAt: data.lastLoginAt instanceof Timestamp 
        ? data.lastLoginAt.toDate() 
        : data.lastLoginAt?.toDate?.() || undefined,
      createdBy: data.createdBy || undefined,
      roleHistory: data.roleHistory?.map((change: any) => ({
        previousRole: change.previousRole,
        newRole: change.newRole,
        changedAt: change.changedAt instanceof Timestamp 
          ? change.changedAt.toDate() 
          : change.changedAt?.toDate?.() || new Date(change.changedAt),
        changedBy: change.changedBy,
        reason: change.reason
      })) || undefined
    };
  }
}

