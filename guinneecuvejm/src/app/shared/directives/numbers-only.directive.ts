import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appNumbersOnly]',
  standalone: true,
})
export class NumbersOnlyDirective {
  @HostListener('keypress', ['$event'])
  onKeyPress(event: KeyboardEvent): void {
    const charCode = event.which ?? event.keyCode;
    // Autoriser uniquement les chiffres (0-9)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }
}


