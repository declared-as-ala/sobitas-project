import { Component, Input, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { storage } from '../../apis/config';
import { GeneralService } from '../../apis/general.service';

@Component({
  selector: 'app-brands',
  standalone: true,
  templateUrl: './brands.component.html',
  styleUrls: ['./brands.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Required for <swiper-container> and <swiper-slide>
})
export class BrandsComponent implements AfterViewInit {
  @Input() brands: any[] = [];
  storage = storage;

  @ViewChild('swiperRef', { static: false }) swiperRef!: ElementRef;

  constructor(private general: GeneralService, private sanitizer: DomSanitizer) {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.swiperRef?.nativeElement?.swiper) {
        const swiperInstance = this.swiperRef.nativeElement.swiper;
        console.log('Swiper initialized. Active index:', swiperInstance.activeIndex);
      }
    }, 500);
  }

  nextSlide() {
    this.swiperRef.nativeElement.swiper.slideNext();
  }

  prevSlide() {
    this.swiperRef.nativeElement.swiper.slidePrev();
  }
}
