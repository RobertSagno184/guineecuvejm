import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UsersService } from '../../../../core/services/firebase/users.service';
import { User } from '../../../../shared/models/user.model';
import { FormsModule } from '@angular/forms';
import { AuthState } from '../../../../core/services/auth/auth.state';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

type SortField = 'email' | 'displayName' | 'role' | 'createdAt' | 'lastLoginAt';
type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly authState = inject(AuthState);

  readonly users = signal<User[]>([]);
  readonly isLoading = signal(true);
  readonly searchTerm = signal('');
  readonly selectedRole = signal<'all' | User['role']>('all');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly sortBy = signal<SortField>('email');
  readonly sortOrder = signal<SortOrder>('asc');
  readonly currentPage = signal<number>(1);
  readonly itemsPerPage = signal<number>(25);
  readonly selectedUsers = signal<Set<string>>(new Set());
  readonly selectAll = signal<boolean>(false);

  readonly filteredAndSortedUsers = computed(() => {
    let filtered = [...this.users()];

    // Filtre par recherche
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(search) ||
        (user.displayName && user.displayName.toLowerCase().includes(search))
      );
    }

    // Filtre par rôle
    if (this.selectedRole() !== 'all') {
      filtered = filtered.filter(user => user.role === this.selectedRole());
    }

    // Filtre par statut
    if (this.statusFilter() !== 'all') {
      const isActive = this.statusFilter() === 'active';
      filtered = filtered.filter(user => (user.isActive !== false) === isActive);
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy()) {
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'displayName':
          const nameA = a.displayName || '';
          const nameB = b.displayName || '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'createdAt':
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          comparison = dateA - dateB;
          break;
        case 'lastLoginAt':
          const loginA = a.lastLoginAt?.getTime() || 0;
          const loginB = b.lastLoginAt?.getTime() || 0;
          comparison = loginA - loginB;
          break;
      }

      return this.sortOrder() === 'asc' ? comparison : -comparison;
    });

    return filtered;
  });

  readonly paginatedUsers = computed(() => {
    const filtered = this.filteredAndSortedUsers();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return filtered.slice(start, end);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredAndSortedUsers().length / this.itemsPerPage());
  });

  readonly stats = computed(() => {
    const users = this.users();
    const total = users.length;
    const active = users.filter(u => u.isActive !== false).length;
    const inactive = total - active;
    const byRole = {
      admin: users.filter(u => u.role === 'admin').length,
      gérant: users.filter(u => u.role === 'gérant').length,
      client: users.filter(u => u.role === 'client').length
    };
    return { total, active, inactive, byRole };
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.isLoading.set(true);
    this.usersService.getAll().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement:', error);
        Swal.fire('Erreur', 'Impossible de charger les utilisateurs', 'error');
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  onRoleChange(role: 'all' | User['role']): void {
    this.selectedRole.set(role);
    this.currentPage.set(1);
  }

  onStatusFilterChange(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  onSort(field: SortField): void {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedRole.set('all');
    this.statusFilter.set('all');
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onItemsPerPageChange(items: number): void {
    this.itemsPerPage.set(items);
    this.currentPage.set(1);
  }

  toggleSelectAll(): void {
    if (this.selectAll()) {
      this.selectedUsers.set(new Set());
      this.selectAll.set(false);
    } else {
      const allIds = new Set(this.paginatedUsers().map(u => u.id));
      this.selectedUsers.set(allIds);
      this.selectAll.set(true);
    }
  }

  toggleUserSelection(userId: string): void {
    const selected = new Set(this.selectedUsers());
    if (selected.has(userId)) {
      selected.delete(userId);
    } else {
      selected.add(userId);
    }
    this.selectedUsers.set(selected);
    this.selectAll.set(selected.size === this.paginatedUsers().length);
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUsers().has(userId);
  }

  async updateRole(userId: string, newRole: User['role']): Promise<void> {
    try {
      const result = await Swal.fire({
        title: 'Modifier le rôle?',
        text: 'Cette action sera enregistrée dans l\'historique',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Oui, modifier',
        cancelButtonText: 'Annuler'
      });

      if (result.isConfirmed) {
        await this.usersService.updateRoleWithHistory(userId, newRole);
        Swal.fire('Succès', 'Rôle modifié avec succès', 'success');
        this.loadUsers();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rôle:', error);
      Swal.fire('Erreur', 'Impossible de modifier le rôle', 'error');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const user = this.users().find(u => u.id === userId);
    if (!user) return;

    const currentUser = this.authState.user();
    if (currentUser?.uid === userId) {
      Swal.fire('Erreur', 'Vous ne pouvez pas supprimer votre propre compte', 'error');
      return;
    }

    // Vérifier si c'est le dernier admin
    if (user.role === 'admin') {
      const adminCount = this.users().filter(u => u.role === 'admin' && u.id !== userId).length;
      if (adminCount === 0) {
        Swal.fire('Erreur', 'Impossible de supprimer le dernier administrateur', 'error');
        return;
      }
    }

    try {
      const result = await Swal.fire({
        title: 'Supprimer l\'utilisateur?',
        text: `Êtes-vous sûr de vouloir supprimer ${user.email}? Cette action est irréversible.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler'
      });

      if (result.isConfirmed) {
        await this.usersService.delete(userId);
        Swal.fire('Supprimé!', 'L\'utilisateur a été supprimé', 'success');
        this.loadUsers();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      Swal.fire('Erreur', 'Impossible de supprimer l\'utilisateur', 'error');
    }
  }

  async deleteSelectedUsers(): Promise<void> {
    const selected = Array.from(this.selectedUsers());
    if (selected.length === 0) return;

    const currentUser = this.authState.user();
    const usersToDelete = this.users().filter(u => selected.includes(u.id));

    // Vérifications
    if (currentUser && selected.includes(currentUser.uid)) {
      Swal.fire('Erreur', 'Vous ne pouvez pas supprimer votre propre compte', 'error');
      return;
    }

    const adminUsers = usersToDelete.filter(u => u.role === 'admin');
    const remainingAdmins = this.users().filter(
      u => u.role === 'admin' && !selected.includes(u.id)
    );
    if (adminUsers.length > 0 && remainingAdmins.length === 0) {
      Swal.fire('Erreur', 'Impossible de supprimer tous les administrateurs', 'error');
      return;
    }

    try {
      const result = await Swal.fire({
        title: 'Supprimer les utilisateurs sélectionnés?',
        text: `${selected.length} utilisateur(s) seront supprimés. Cette action est irréversible.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler'
      });

      if (result.isConfirmed) {
        await Promise.all(selected.map(id => this.usersService.delete(id)));
        Swal.fire('Supprimé!', `${selected.length} utilisateur(s) supprimé(s)`, 'success');
        this.selectedUsers.set(new Set());
        this.selectAll.set(false);
        this.loadUsers();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      Swal.fire('Erreur', 'Impossible de supprimer les utilisateurs', 'error');
    }
  }

  async updateSelectedUsersRole(newRole: User['role']): Promise<void> {
    const selected = Array.from(this.selectedUsers());
    if (selected.length === 0) return;

    try {
      const result = await Swal.fire({
        title: 'Modifier le rôle?',
        text: `Le rôle de ${selected.length} utilisateur(s) sera modifié en "${this.getRoleLabel(newRole)}"`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Oui, modifier',
        cancelButtonText: 'Annuler'
      });

      if (result.isConfirmed) {
        await Promise.all(
          selected.map(id => this.usersService.updateRoleWithHistory(id, newRole))
        );
        Swal.fire('Succès', 'Rôles modifiés avec succès', 'success');
        this.selectedUsers.set(new Set());
        this.selectAll.set(false);
        this.loadUsers();
      }
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      Swal.fire('Erreur', 'Impossible de modifier les rôles', 'error');
    }
  }

  async toggleUserActive(userId: string): Promise<void> {
    const user = this.users().find(u => u.id === userId);
    if (!user) return;

    const isActive = user.isActive !== false;
    const newStatus = !isActive;

    try {
      await this.usersService.toggleActive(userId, newStatus);
      Swal.fire('Succès', `Utilisateur ${newStatus ? 'activé' : 'désactivé'}`, 'success');
      this.loadUsers();
    } catch (error) {
      console.error('Erreur:', error);
      Swal.fire('Erreur', 'Impossible de modifier le statut', 'error');
    }
  }

  async sendPasswordReset(userId: string): Promise<void> {
    const user = this.users().find(u => u.id === userId);
    if (!user) return;

    try {
      await this.usersService.sendPasswordResetEmail(user.email);
      Swal.fire('Succès', 'Email de réinitialisation envoyé', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      Swal.fire('Erreur', 'Impossible d\'envoyer l\'email', 'error');
    }
  }

  createUser(): void {
    this.router.navigate(['/admin/users/new']);
  }

  editUser(userId: string): void {
    this.router.navigate(['/admin/users/edit', userId]);
  }

  viewUser(userId: string): void {
    this.router.navigate(['/admin/users', userId]);
  }

  getRoleLabel(role: User['role']): string {
    const labels: Record<User['role'], string> = {
      'admin': 'Administrateur',
      'gérant': 'Gérant',
      'client': 'Client'
    };
    return labels[role] || role;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getSortIcon(field: SortField): string {
    if (this.sortBy() !== field) return 'fa-sort';
    return this.sortOrder() === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }
}
