import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UsersService } from '../../../../core/services/firebase/users.service';
import { User } from '../../../../shared/models/user.model';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersService);

  readonly userForm: FormGroup;
  readonly isLoading = signal(false);
  readonly isEditMode = signal(false);
  readonly userId = signal<string | null>(null);
  readonly isSaving = signal(false);

  constructor() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      role: ['client', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      isActive: [true]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.userId.set(id);
      this.loadUser(id);
      // En mode édition, le mot de passe n'est pas requis
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('confirmPassword')?.clearValidators();
      this.userForm.get('password')?.updateValueAndValidity();
      this.userForm.get('confirmPassword')?.updateValueAndValidity();
    }
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (!password || !confirmPassword) return null;
    
    if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  private async loadUser(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const user = await firstValueFrom(this.usersService.getById(id));
      if (user) {
        this.userForm.patchValue({
          email: user.email,
          displayName: user.displayName || '',
          role: user.role,
          isActive: user.isActive !== undefined ? user.isActive : true
        });
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

  async onSubmit(): Promise<void> {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      Swal.fire('Erreur', 'Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    this.isSaving.set(true);
    try {
      const formValue = this.userForm.value;

      if (this.isEditMode()) {
        // Mise à jour
        const userId = this.userId();
        if (!userId) return;

        // Si le rôle a changé, utiliser updateRoleWithHistory
        const currentUser = await firstValueFrom(this.usersService.getById(userId));
        if (currentUser && currentUser.role !== formValue.role) {
          await this.usersService.updateRoleWithHistory(userId, formValue.role);
        }

        await this.usersService.update(userId, {
          email: formValue.email,
          displayName: formValue.displayName,
          isActive: formValue.isActive
        });

        Swal.fire('Succès', 'Utilisateur mis à jour avec succès', 'success');
      } else {
        // Création
        await this.usersService.create(
          formValue.email,
          formValue.password,
          formValue.displayName,
          formValue.role
        );

        Swal.fire('Succès', 'Utilisateur créé avec succès', 'success');
      }

      this.router.navigate(['/admin/users']);
    } catch (error: any) {
      console.error('Erreur:', error);
      let message = 'Une erreur est survenue';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Cet email est déjà utilisé';
      } else if (error.code === 'auth/weak-password') {
        message = 'Le mot de passe est trop faible';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Email invalide';
      }
      Swal.fire('Erreur', message, 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  cancel(): void {
    if (this.userForm.dirty) {
      Swal.fire({
        title: 'Annuler?',
        text: 'Les modifications non enregistrées seront perdues',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Oui, annuler',
        cancelButtonText: 'Non'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/admin/users']);
        }
      });
    } else {
      this.router.navigate(['/admin/users']);
    }
  }
}

