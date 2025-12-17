import {
  Component,
  Input,
  Inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule, isPlatformBrowser, NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-slides',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slides.component.html',
  styleUrls: ['./slides.component.css'],
})
export class SlidesComponent {
  @Input({ required: true }) slides: any[] = [];

  private isBrowser!: boolean;

  screenWidth = signal(1200);
  current = signal(0);

  slidesForDevice = computed(() => {
    const type = this.screenWidth() > 700 ? 'web' : 'mobile';
    return this.slides.filter(s => s.type === type);
  });

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser) {
      this.screenWidth.set(window.innerWidth);

      effect(() => {
        const slides = this.slidesForDevice();
        if (!slides.length) return;

        // delay the interval slightly to avoid NG0100
        const timer = setTimeout(() => {
          const interval = setInterval(() => {
            this.current.update(i => (i + 1) % slides.length);
            this.cdr.markForCheck(); // trigger change detection
          }, 3000);

          // cleanup
          return () => clearInterval(interval);
        }, 0);

        return () => clearTimeout(timer);
      });
    }
  }

  onResize() {
    if (!this.isBrowser) return;
    this.screenWidth.set(window.innerWidth);
    this.current.set(0);
    this.cdr.markForCheck(); // ensure CD updates on resize
  }
}
