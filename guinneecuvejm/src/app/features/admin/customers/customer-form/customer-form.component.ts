import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CustomersService } from '../../../../core/services/firebase/customers.service';
import { Customer } from '../../../../shared/models/customer.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss',
})
export class CustomerFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly customersService = inject(CustomersService);

  readonly isEditMode = signal(false);
  readonly customerId = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  customerForm: FormGroup = this.fb.group({
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    contactPerson: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]+$/)]],
    type: ['particulier' as Customer['type'], [Validators.required]],
    address: this.fb.group({
      street: ['', [Validators.required]],
      city: ['', [Validators.required]],
      country: ['Guinée', [Validators.required]]
    })
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.customerId.set(id);
      this.loadCustomer(id);
    }
  }

  private loadCustomer(id: string): void {
    this.isLoading.set(true);
    this.customersService.getById(id).subscribe({
      next: (customer) => {
        if (customer) {
          this.customerForm.patchValue({
            companyName: customer.companyName,
            contactPerson: customer.contactPerson,
            email: customer.email,
            phone: customer.phone,
            type: customer.type,
            address: {
              street: customer.address.street,
              city: customer.address.city,
              country: customer.address.country
            }
          });
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement du client:', error);
        this.isLoading.set(false);
        Swal.fire({
          title: 'Erreur !',
          text: 'Impossible de charger les informations du client.',
          icon: 'error',
          confirmButtonColor: '#ff9800'
        });
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      await Swal.fire({
        title: 'Formulaire invalide',
        text: 'Veuillez remplir tous les champs requis correctement.',
        icon: 'warning',
        confirmButtonColor: '#ff9800'
      });
      return;
    }

    this.isSaving.set(true);
    try {
      const formValue = this.customerForm.value;

      if (this.isEditMode() && this.customerId()) {
        // Mode édition
        await this.customersService.update(this.customerId()!, {
          companyName: formValue.companyName,
          contactPerson: formValue.contactPerson,
          email: formValue.email,
          phone: formValue.phone,
          type: formValue.type,
          address: {
            street: formValue.address.street,
            city: formValue.address.city,
            country: formValue.address.country
          }
        });

        await Swal.fire({
          title: 'Modifié !',
          text: 'Le client a été mis à jour avec succès.',
          icon: 'success',
          confirmButtonColor: '#ff9800',
          timer: 2000
        });
      } else {
        // Mode création
        await this.customersService.create({
          companyName: formValue.companyName,
          contactPerson: formValue.contactPerson,
          email: formValue.email,
          phone: formValue.phone,
          type: formValue.type,
          address: {
            street: formValue.address.street,
            city: formValue.address.city,
            country: formValue.address.country
          }
        });

        await Swal.fire({
          title: 'Créé !',
          text: 'Le client a été créé avec succès.',
          icon: 'success',
          confirmButtonColor: '#ff9800',
          timer: 2000
        });
      }

      this.router.navigate(['/admin/customers']);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      await Swal.fire({
        title: 'Erreur !',
        text: 'Une erreur est survenue lors de la sauvegarde.',
        icon: 'error',
        confirmButtonColor: '#ff9800'
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  async cancel(): Promise<void> {
    if (this.customerForm.dirty) {
      const result = await Swal.fire({
        title: 'Annuler ?',
        text: 'Les modifications non enregistrées seront perdues.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff9800',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Oui, annuler',
        cancelButtonText: 'Non, continuer',
        reverseButtons: true
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    this.router.navigate(['/admin/customers']);
  }
}

