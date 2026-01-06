import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-call-to-action',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './call-to-action.component.html',
  styleUrl: './call-to-action.component.scss'
})
export class CallToActionComponent {
  title = input<string>('Prêt à commencer ?');
  description = input<string>('Contactez-nous dès aujourd\'hui pour discuter de vos besoins.');
  primaryText = input<string>('Nous contacter');
  primaryLink = input<string>('/public/contact');
  secondaryText = input<string | undefined>(undefined);
  secondaryLink = input<string | undefined>(undefined);
  variant = input<'default' | 'primary' | 'secondary'>('default');
}

