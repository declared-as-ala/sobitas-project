import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  Inject,
  Input,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { storage } from '../../apis/config';
import { GeneralService } from './../../apis/general.service';
import Swal from 'sweetalert2';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styles: [],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  imports: [
    CommonModule,
    RouterModule,                              // ← Enables [routerLink]
    ReactiveFormsModule,                       // ← Enables [formGroup]
    DatePipe                                   // ← Enables {{ today | date }}
  ],
})
export class FooterComponent implements OnInit, AfterViewInit {
  @Input() coordonnees: any = {};

  // Fixed: was causing TS error
  services: any = [];
  pages: any = [];

  @ViewChild('swiperBrands') swiperBrands?: ElementRef<HTMLElement>;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private general: GeneralService,
    private sanitizer: DomSanitizer
  ) {}

  form: FormGroup = new FormGroup({
    email: new FormControl('', Validators.required),
  });

  today = new Date();
  storage = storage;
  show_map = false;
  map: any;
  brands1: any[] = [];
  show_brands = false;

  ngOnInit(): void {
    this.map = this.sanitizer.bypassSecurityTrustHtml(
      this.coordonnees.gelocalisation
    );

    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.general.services().subscribe((data) => {
          this.services = data;
        });

        this.general.brands().subscribe((data: any) => {
          this.brands1 = data;

          setTimeout(() => {
            // Removed customOptions — now using swiper-container attributes
            this.show_brands = true;

            // Initialize Swiper exactly like your working SlidesComponent
            setTimeout(() => {
              const el = this.swiperBrands?.nativeElement as any;
              if (el?.initialize) {
                el.initialize();
              }
            }, 50);

          }, 10);
        });

        this.general.pages().subscribe((data) => {
          this.pages = data;
        });
      }, 5000);
    }
  }

  ngAfterViewInit(): void {}

  sendNewsletter() {
    if (this.form.valid) {
      this.general.newsletter(this.form.value).subscribe(
        (data: any) => {
          Swal.fire({
            title: data.success,
            icon: 'success',
            toast: true,
            timer: 5000,
            showConfirmButton: false,
            position: 'top-end',
          });
          this.form.reset();
        },
        (err: any) => {
          Swal.fire({
            title: err.error.error,
            icon: 'info',
            toast: true,
            timer: 5000,
            showConfirmButton: false,
            position: 'top-end',
          });
          this.form.reset();
        }
      );
    }
  }
}