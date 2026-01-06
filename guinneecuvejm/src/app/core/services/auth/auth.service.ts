import { Injectable, inject } from '@angular/core';
import { AuthState, AuthUser } from './auth.state';
import { FirebaseService } from '../firebase/firebase.service';
import { CustomersService } from '../firebase/customers.service';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  User as FirebaseUser,
  onAuthStateChanged
} from '@angular/fire/auth';
import { doc, setDoc, getDoc, serverTimestamp } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authState = inject(AuthState);
  private readonly firebaseService = inject(FirebaseService);
  private readonly customersService = inject(CustomersService);
  private readonly router = inject(Router);

  constructor() {
    // Écouter les changements d'état d'authentification
    onAuthStateChanged(this.firebaseService.auth, async (user) => {
      const currentUrl = this.router.url;
      
      if (user) {
        await this.loadUserRole(user);
        // Rediriger automatiquement selon le rôle après chargement
        // Seulement si on n'est pas déjà sur une route protégée
        if (!currentUrl.startsWith('/admin') && !currentUrl.startsWith('/client')) {
          // Petit délai pour s'assurer que la navigation est prête
          setTimeout(() => {
            this.redirectByRole();
          }, 100);
        }
      } else {
        this.authState.setUser(null);
        // Rediriger vers l'espace public lors de la déconnexion
        // Seulement si on n'est pas déjà sur la page publique ou auth
        if (!currentUrl.startsWith('/public') && !currentUrl.startsWith('/auth')) {
          this.router.navigate(['/public']);
        }
      }
    });
  }

  /**
   * Inscription d'un nouvel utilisateur avec rôle 'client'
   */
  async register(
    email: string, 
    password: string, 
    displayName: string,
    phone: string,
    company?: string
  ): Promise<void> {
    try {
      // Créer le compte Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.firebaseService.auth,
        email,
        password
      );

      // Créer le document utilisateur dans Firestore avec le rôle 'client'
      await setDoc(doc(this.firebaseService.firestore, 'users', userCredential.user.uid), {
        email: email,
        displayName: displayName,
        phone: phone,
        company: company || null,
        role: 'client',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Créer également un document Customer dans la collection customers
      await this.customersService.create({
        companyName: company || displayName,
        contactPerson: displayName,
        email: email,
        phone: phone,
        address: {
          street: '',
          city: '',
          country: 'Guinée'
        },
        type: company ? 'professionnel' : 'particulier'
      });

      // Charger le rôle de l'utilisateur
      await this.loadUserRole(userCredential.user);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Connexion d'un utilisateur existant
   */
  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(
        this.firebaseService.auth,
        email,
        password
      );
      // Le rôle sera chargé automatiquement via onAuthStateChanged
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.firebaseService.auth);
      // La redirection vers /public sera gérée automatiquement par onAuthStateChanged
      // Pas besoin de rediriger manuellement ici
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Charger le rôle de l'utilisateur depuis Firestore
   */
  private async loadUserRole(firebaseUser: FirebaseUser): Promise<void> {
    try {
      const userDoc = await getDoc(doc(this.firebaseService.firestore, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: userData['role'] || 'client'
        };
        this.authState.setUser(authUser);
      } else {
        // Si le document n'existe pas, créer un document par défaut avec rôle 'client'
        await setDoc(doc(this.firebaseService.firestore, 'users', firebaseUser.uid), {
          email: firebaseUser.email,
          role: 'client',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        this.authState.setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          role: 'client'
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du rôle:', error);
      // En cas d'erreur, définir un rôle par défaut
      this.authState.setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        role: 'client'
      });
    }
  }

  /**
   * Gérer les erreurs d'authentification
   */
  private handleAuthError(error: any): Error {
    let message = 'Une erreur est survenue';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Cet email est déjà utilisé';
        break;
      case 'auth/invalid-email':
        message = 'Email invalide';
        break;
      case 'auth/operation-not-allowed':
        message = 'Opération non autorisée';
        break;
      case 'auth/weak-password':
        message = 'Le mot de passe est trop faible';
        break;
      case 'auth/user-disabled':
        message = 'Ce compte a été désactivé';
        break;
      case 'auth/user-not-found':
        message = 'Aucun compte trouvé avec cet email';
        break;
      case 'auth/wrong-password':
        message = 'Mot de passe incorrect';
        break;
      case 'auth/invalid-credential':
        message = 'Identifiants incorrects';
        break;
      case 'auth/too-many-requests':
        message = 'Trop de tentatives. Veuillez réessayer plus tard';
        break;
      default:
        message = error.message || 'Une erreur est survenue';
    }
    
    return new Error(message);
  }

  /**
   * Rediriger l'utilisateur selon son rôle
   */
  redirectByRole(): void {
    const role = this.authState.role();
    switch (role) {
      case 'admin':
      case 'gérant':
        this.router.navigate(['/admin']);
        break;
      case 'client':
        this.router.navigate(['/client']);
        break;
      default:
        this.router.navigate(['/public']);
    }
  }
}


