// slides.component.ts
import { Component, Input, OnInit, Inject, PLATFORM_ID, HostListener, AfterViewInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { register as registerSwiperElements } from 'swiper/element/bundle';
import { storage } from '../../apis/config';

// Register once (you can also do it in main.ts)
registerSwiperElements();

@Component({
  selector: 'app-slides',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],   // ← THIS IS THE FIX
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.css']
})
export class SlidesComponent implements OnInit, AfterViewInit {
  @Input() slides: any[] = [];
  data: any[] = [];
  screenwidth = 1000;
  storage = storage;

  @ViewChild('swiperEl') swiperEl!: ElementRef<HTMLElement>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.screenwidth = window.innerWidth;
    }
    this.applyResponsiveSlides();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && this.swiperEl?.nativeElement) {
      (this.swiperEl.nativeElement as any).initialize?.();
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.screenwidth = window.innerWidth;
      this.applyResponsiveSlides();

      // Re-init Swiper after data change
      setTimeout(() => {
        if (this.swiperEl?.nativeElement) {
          (this.swiperEl.nativeElement as any).initialize?.();
        }
      }, 50);
    }
  }

  applyResponsiveSlides() {
    if (!this.slides?.length) {
      this.data = [];
      return;
    }
    this.data = this.screenwidth > 700
      ? this.slides.filter(s => s.type === 'web')
      : this.slides.filter(s => s.type === 'mobile');
  }
}