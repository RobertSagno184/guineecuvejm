import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthState } from '../../../core/services/auth/auth.state';
import { CustomersService } from '../../../core/services/firebase/customers.service';
import { OrdersService } from '../../../core/services/firebase/orders.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { FirebaseService } from '../../../core/services/firebase/firebase.service';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from '@angular/fire/auth';
import { Customer } from '../../../shared/models/customer.model';
import { Order } from '../../../shared/models/order.model';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { firstValueFrom } from 'rxjs';

interface DeliveryAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  country: string;
  postalCode?: string;
  isDefault: boolean;
}

interface ActivityItem {
  id: string;
  type: 'order' | 'account' | 'update';
  title: string;
  description: string;
  date: Date;
  orderId?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    PricePipe
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private readonly authState = inject(AuthState);
  private readonly customersService = inject(CustomersService);
  private readonly ordersService = inject(OrdersService);
  private readonly authService = inject(AuthService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isChangingPassword = signal(false);
  readonly customer = signal<Customer | null>(null);
  readonly activeTab = signal<'info' | 'addresses' | 'password' | 'activity'>('info');
  readonly recentOrders = signal<Order[]>([]);
  readonly activityHistory = signal<ActivityItem[]>([]);

  readonly personalInfoForm = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    contactPerson: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/)]],
    type: [<'particulier' | 'professionnel' | 'revendeur'>'particulier', [Validators.required]]
  } as any);

  readonly passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  readonly addresses = signal<DeliveryAddress[]>([]);
  readonly showAddAddress = signal(false);
  readonly editingAddressId = signal<string | null>(null);
  readonly newAddressForm = this.fb.group({
    label: ['', [Validators.required]],
    street: ['', [Validators.required]],
    city: ['', [Validators.required]],
    country: ['Guinée', [Validators.required]],
    postalCode: ['']
  });

  passwordMatchValidator(group: any) {
    const newPassword = group.get('newPassword');
    const confirmPassword = group.get('confirmPassword');
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    const userId = this.authState.user()?.uid;
    if (!userId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.isLoading.set(true);
    try {
      const customer = await firstValueFrom(this.customersService.getById(userId));
      if (customer) {
        this.customer.set(customer);
        this.personalInfoForm.patchValue({
          companyName: customer.companyName,
          contactPerson: customer.contactPerson,
          email: customer.email,
          phone: customer.phone,
          type: customer.type
        } as any);
        
        // Charger les adresses
        this.loadAddresses(customer);
        
        // Charger les commandes récentes pour l'historique
        const orders = await firstValueFrom(this.ordersService.getByCustomer(userId));
        this.recentOrders.set(orders.slice(0, 10));
        this.buildActivityHistory(customer, orders);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private loadAddresses(customer: Customer): void {
    // Pour l'instant, on utilise l'adresse principale du customer
    // TODO: Implémenter une collection dédiée pour les adresses multiples
    const addresses: DeliveryAddress[] = [];
    if (customer.address && customer.address.street) {
      addresses.push({
        id: 'main',
        label: 'Adresse principale',
        street: customer.address.street,
        city: customer.address.city,
        country: customer.address.country,
        isDefault: true
      });
    }
    this.addresses.set(addresses);
  }

  private buildActivityHistory(customer: Customer, orders: Order[]): void {
    const activities: ActivityItem[] = [];
    
    // Compte créé
    if (customer.createdAt) {
      activities.push({
        id: 'account-created',
        type: 'account',
        title: 'Compte créé',
        description: 'Votre compte a été créé avec succès',
        date: customer.createdAt
      });
    }

    // Commandes récentes
    orders.slice(0, 5).forEach(order => {
      activities.push({
        id: order.id,
        type: 'order',
        title: `Commande ${order.orderNumber}`,
        description: `Commande de ${this.formatCurrency(order.total)} - ${this.getStatusLabel(order.status)}`,
        date: order.createdAt,
        orderId: order.id
      });
    });

    // Trier par date (plus récent en premier)
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());
    this.activityHistory.set(activities);
  }

  async savePersonalInfo(): Promise<void> {
    if (this.personalInfoForm.invalid) {
      this.personalInfoForm.markAllAsTouched();
      return;
    }

    const userId = this.authState.user()?.uid;
    if (!userId) return;

    this.isSaving.set(true);
    try {
      await this.customersService.update(userId, {
        companyName: (this.personalInfoForm.value['companyName'] || '') as string,
        contactPerson: (this.personalInfoForm.value['contactPerson'] || '') as string,
        email: (this.personalInfoForm.value['email'] || '') as string,
        phone: (this.personalInfoForm.value['phone'] || '') as string,
        type: (this.personalInfoForm.value['type'] || 'particulier') as 'particulier' | 'professionnel' | 'revendeur',
        address: {
          street: this.customer()?.address.street || '',
          city: this.customer()?.address.city || '',
          country: this.customer()?.address.country || 'Guinée'
        }
      });
      await this.loadProfile();
      alert('Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour du profil');
    } finally {
      this.isSaving.set(false);
    }
  }

  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const user = this.firebaseService.auth.currentUser;
    if (!user || !user.email) {
      alert('Vous devez être connecté');
      return;
    }

    this.isChangingPassword.set(true);
    try {
      const { currentPassword, newPassword } = this.passwordForm.value;
      
      // Ré-authentifier l'utilisateur
      const credential = EmailAuthProvider.credential(user.email, currentPassword!);
      await reauthenticateWithCredential(user, credential);
      
      // Changer le mot de passe
      await updatePassword(user, newPassword!);
      
      this.passwordForm.reset();
      alert('Mot de passe modifié avec succès');
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      let message = 'Erreur lors du changement de mot de passe';
      if (error.code === 'auth/wrong-password') {
        message = 'Mot de passe actuel incorrect';
      } else if (error.code === 'auth/weak-password') {
        message = 'Le nouveau mot de passe est trop faible';
      }
      alert(message);
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  setActiveTab(tab: 'info' | 'addresses' | 'password' | 'activity'): void {
    this.activeTab.set(tab);
  }

  // Address Management
  toggleAddAddress(): void {
    this.showAddAddress.set(!this.showAddAddress());
    if (!this.showAddAddress()) {
      this.newAddressForm.reset({
        country: 'Guinée'
      });
      this.editingAddressId.set(null);
    }
  }

  editAddress(address: DeliveryAddress): void {
    this.editingAddressId.set(address.id);
    this.showAddAddress.set(true);
    this.newAddressForm.patchValue({
      label: address.label,
      street: address.street,
      city: address.city,
      country: address.country,
      postalCode: address.postalCode || ''
    });
  }

  cancelAddressForm(): void {
    this.showAddAddress.set(false);
    this.editingAddressId.set(null);
    this.newAddressForm.reset({
      country: 'Guinée'
    });
  }

  async saveAddress(): Promise<void> {
    if (this.newAddressForm.invalid) {
      this.newAddressForm.markAllAsTouched();
      return;
    }

    const formValue = this.newAddressForm.value;
    const editingId = this.editingAddressId();
    
    if (editingId) {
      // Modifier l'adresse existante
      const addresses = this.addresses();
      const index = addresses.findIndex(a => a.id === editingId);
      if (index !== -1) {
        addresses[index] = {
          ...addresses[index],
          label: formValue['label'] || '',
          street: formValue['street'] || '',
          city: formValue['city'] || '',
          country: formValue['country'] || 'Guinée',
          postalCode: formValue['postalCode'] || ''
        };
        this.addresses.set([...addresses]);
      }
    } else {
      // Ajouter une nouvelle adresse
      const newAddress: DeliveryAddress = {
        id: Date.now().toString(),
        label: formValue['label'] || '',
        street: formValue['street'] || '',
        city: formValue['city'] || '',
        country: formValue['country'] || 'Guinée',
        postalCode: formValue['postalCode'] || '',
        isDefault: this.addresses().length === 0
      };
      this.addresses.set([...this.addresses(), newAddress]);
    }

    // TODO: Sauvegarder dans Firestore (collection dédiée aux adresses)
    this.cancelAddressForm();
    alert(editingId ? 'Adresse modifiée avec succès' : 'Adresse ajoutée avec succès');
  }

  async deleteAddress(addressId: string): Promise<void> {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette adresse ?')) {
      return;
    }

    const addresses = this.addresses();
    const address = addresses.find(a => a.id === addressId);
    if (address?.isDefault) {
      alert('Vous ne pouvez pas supprimer l\'adresse par défaut');
      return;
    }

    this.addresses.set(addresses.filter(a => a.id !== addressId));
    // TODO: Supprimer de Firestore
    alert('Adresse supprimée avec succès');
  }

  async setDefaultAddress(addressId: string): Promise<void> {
    const addresses = this.addresses();
    addresses.forEach(addr => {
      addr.isDefault = addr.id === addressId;
    });
    this.addresses.set([...addresses]);
    // TODO: Sauvegarder dans Firestore
    alert('Adresse par défaut mise à jour');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'GNF'
    }).format(amount);
  }

  getStatusLabel(status: Order['status']): string {
    const labels: Record<string, string> = {
      'pending': 'En attente',
      'confirmed': 'Confirmée',
      'processing': 'En préparation',
      'shipped': 'Expédiée',
      'delivered': 'Livrée',
      'cancelled': 'Annulée'
    };
    return labels[status] || status;
  }

  getStatusColor(status: Order['status']): string {
    const colors: Record<string, string> = {
      'pending': '#ff9800',
      'confirmed': '#2196f3',
      'processing': '#2196f3',
      'shipped': '#4caf50',
      'delivered': '#4caf50',
      'cancelled': '#f44336'
    };
    return colors[status] || '#999';
  }

  getActivityIcon(type: ActivityItem['type']): string {
    const icons: Record<string, string> = {
      'order': 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0',
      'account': 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
      'update': 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'
    };
    return icons[type] || '';
  }

  getInitials(): string {
    const customer = this.customer();
    if (!customer) return 'U';
    const name = customer.contactPerson || customer.companyName || '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0]?.toUpperCase() || 'U';
  }

  getDaysSinceCreation(): number {
    const customer = this.customer();
    if (!customer || !customer.createdAt) return 0;
    const now = new Date();
    const created = customer.createdAt;
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}
