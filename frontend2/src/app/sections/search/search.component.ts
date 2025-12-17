import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { storage } from '../../apis/config';
import { GeneralService } from './../../apis/general.service';

declare var $: any;

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit {
  searchForm = new FormGroup({
    slug: new FormControl('0'),
    text: new FormControl(''),
  });

  menu: any[] = [];                    // Safe SSR default
  storage = storage;
  searchedProducts: any[] = [];

  private isBrowser: boolean;

  constructor(
    private general: GeneralService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Load cached menu in browser only
    if (this.isBrowser) {
      const storedMenu = localStorage.getItem('menu');
      if (storedMenu) {
        try {
          this.menu = JSON.parse(storedMenu);
        } catch (e) {
          console.warn('Failed to parse menu from localStorage', e);
        }
      }
    }

    // Fetch fresh categories from API
    this.general.categories().subscribe((data: any) => {
      this.menu = data || [];

      // Save to localStorage in browser only
      if (this.isBrowser) {
        localStorage.setItem('menu', JSON.stringify(this.menu));
      }

      // Notify OnPush to update
      this.cdr.markForCheck();
    });
  }

  search(e?: any) {
    const form = this.searchForm.value;
    this.searchedProducts = [];

    if (form.text && form.text.length > 2) {
      if (form.slug && form.slug !== '0') {
        this.general
          .searchProductBySubCategoryText(form.slug, form.text)
          .subscribe((data: any) => {
            this.searchedProducts = data.products || [];
            this.cdr.markForCheck(); // OnPush update
          });
      } else {
        this.general.searchProduct(form.text).subscribe((data: any) => {
          this.searchedProducts = data.products || [];
          this.cdr.markForCheck();
        });
      }
    } else {
      this.searchedProducts = [];
      this.cdr.markForCheck();
    }
  }

  doSearch() {
    const form = this.searchForm.value;

    if (form.slug && form.slug !== '0' && form.text) {
      this.router.navigate(['/produits', form.slug, form.text]);
    } else if (form.text) {
      this.router.navigate(['/produits-search', form.text]);
    } else if (form.slug && form.slug !== '0') {
      this.router.navigate(['/category', form.slug]);
    }

    this.cdr.markForCheck();
  }

  loadDorpDown() {
    if (this.isBrowser) {
      setTimeout(() => {}, 0);
    }
  }

  navigate(slug: any) {
    this.searchedProducts = [];
    this.router.navigate(['/shop', slug]);
    this.cdr.markForCheck();
  }

  closeSearch(event: any) {
    if (!this.isBrowser) return;

    setTimeout(() => {
      const ctx = this;
      $(document).on('click', function (e: any) {
        if (!$(e.target).closest('#so').length && !$(e.target).closest('#ss').length) {
          $('#so').hide();
          ctx.searchedProducts = [];
          ctx.searchForm.get('text')?.setValue('');
          ctx.cdr.markForCheck(); // Update OnPush
        }
      });
    }, 0);
  }
}
