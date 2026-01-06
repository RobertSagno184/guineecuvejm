import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsersService } from '../../../../core/services/firebase/users.service';
import { User, RoleChange } from '../../../../shared/models/user.model';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersService);

  readonly user = signal<User | null>(null);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUser(id);
    } else {
      this.router.navigate(['/admin/users']);
    }
  }

  private async loadUser(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const user = await firstValueFrom(this.usersService.getById(id));
      if (user) {
        this.user.set(user);
      } else {
        Swal.fire('Erreur', 'Utilisateur non trouvé', 'error');
        this.router.navigate(['/admin/users']);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Swal.fire('Erreur', 'Impossible de charger l\'utilisateur', 'error');
      this.router.navigate(['/admin/users']);
    } finally {
      this.isLoading.set(false);
    }
  }

  editUser(): void {
    const user = this.user();
    if (user) {
      this.router.navigate(['/admin/users/edit', user.id]);
    }
  }

  async toggleActive(): Promise<void> {
    const user = this.user();
    if (!user) return;

    const isActive = user.isActive !== false;
    const newStatus = !isActive;

    try {
      await this.usersService.toggleActive(user.id, newStatus);
      Swal.fire('Succès', `Utilisateur ${newStatus ? 'activé' : 'désactivé'}`, 'success');
      this.loadUser(user.id);
    } catch (error) {
      console.error('Erreur:', error);
      Swal.fire('Erreur', 'Impossible de modifier le statut', 'error');
    }
  }

  async sendPasswordReset(): Promise<void> {
    const user = this.user();
    if (!user) return;

    try {
      await this.usersService.sendPasswordResetEmail(user.email);
      Swal.fire('Succès', 'Email de réinitialisation envoyé', 'success');
    } catch (error) {
      console.error('Erreur:', error);
      Swal.fire('Erreur', 'Impossible d\'envoyer l\'email', 'error');
    }
  }

  async deleteUser(): Promise<void> {
    const user = this.user();
    if (!user) return;

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
        await this.usersService.delete(user.id);
        Swal.fire('Supprimé!', 'L\'utilisateur a été supprimé', 'success');
        this.router.navigate(['/admin/users']);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      Swal.fire('Erreur', 'Impossible de supprimer l\'utilisateur', 'error');
    }
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

