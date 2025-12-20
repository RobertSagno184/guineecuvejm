import { AbstractControl, ValidationErrors } from '@angular/forms';

export function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string | null;
  if (!value) {
    return null;
  }
  const regex = /^[0-9]{8,15}$/;
  return regex.test(value) ? null : { phoneNumber: true };
}


