import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Testimonial } from '../../../../shared/models/testimonial.model';

@Component({
  selector: 'app-testimonial-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonial-card.component.html',
  styleUrl: './testimonial-card.component.scss'
})
export class TestimonialCardComponent {
  testimonial = input.required<Testimonial>();

  getStars(): boolean[] {
    const rating = this.testimonial().rating;
    return Array(5).fill(false).map((_, i) => i < rating);
  }
}

