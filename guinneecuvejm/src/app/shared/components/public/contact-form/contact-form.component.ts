import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ContactService } from '../../../../core/services/public/contact.service';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss'
})
export class ContactFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contactService = inject(ContactService);

  readonly isSubmitting = signal(false);
  readonly isSuccess = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    company: [''],
    subject: ['', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10)]],
    productInterest: ['']
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      const formValue = this.form.value;
      await this.contactService.submitContactRequest({
        name: formValue.name!,
        email: formValue.email!,
        phone: formValue.phone!,
        company: formValue.company || undefined,
        subject: formValue.subject!,
        message: formValue.message!,
        productInterest: formValue.productInterest || undefined
      });

      this.isSuccess.set(true);
      this.form.reset();
      
      // Réinitialiser le message de succès après 5 secondes
      setTimeout(() => {
        this.isSuccess.set(false);
      }, 5000);
    } catch (err: any) {
      this.error.set(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field || !field.errors || !field.touched) {
      return '';
    }

    if (field.errors['required']) {
      return 'Ce champ est requis';
    }
    if (field.errors['email']) {
      return 'Email invalide';
    }
    if (field.errors['minlength']) {
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    }

    return '';
  }
}

