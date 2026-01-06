import { Component, input, signal, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface HeroSlide {
  image: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
}

@Component({
  selector: 'app-hero-slider',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './hero-slider.component.html',
  styleUrl: './hero-slider.component.scss'
})
export class HeroSliderComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  
  slides = input<HeroSlide[]>([]);
  currentSlide = signal(0);
  private intervalId?: number;

  ngOnInit(): void {
    // Vérifier qu'on est dans le navigateur avant d'utiliser window
    if (isPlatformBrowser(this.platformId) && this.slides().length > 1) {
      this.startAutoSlide();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    this.resetAutoSlide();
  }

  nextSlide(): void {
    const next = (this.currentSlide() + 1) % this.slides().length;
    this.currentSlide.set(next);
    this.resetAutoSlide();
  }

  prevSlide(): void {
    const prev = (this.currentSlide() - 1 + this.slides().length) % this.slides().length;
    this.currentSlide.set(prev);
    this.resetAutoSlide();
  }

  private startAutoSlide(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.intervalId = window.setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  private resetAutoSlide(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.slides().length > 1) {
      this.startAutoSlide();
    }
  }
}

