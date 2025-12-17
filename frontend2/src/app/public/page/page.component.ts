import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, Inject, PLATFORM_ID } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { GeneralService } from '../../apis/general.service';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.css'],
  imports: [BreadcrumbsComponent, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageComponent implements OnInit {
  page: any;
  faqs: any = [];
  slug: string = '';
  map: SafeHtml = '';
  coordonnees: any = {};

  constructor(
    private route: ActivatedRoute,
    private general: GeneralService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];

    // Access localStorage only on the browser
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('coordonnees');
      this.coordonnees = stored ? JSON.parse(stored) : {};
    }

    // Initialize map only on browser
    if (isPlatformBrowser(this.platformId) && this.slug === 'qui-sommes-nous') {
      this.map = this.sanitizer.bypassSecurityTrustHtml(this.coordonnees.gelocalisation || '');
      this.cdr.markForCheck();
    }

    // Fetch page data
    this.general.page(this.slug).subscribe((data) => {
      this.page = data;
      if (isPlatformBrowser(this.platformId)) this.cdr.markForCheck();
    });

    // Fetch FAQs
    this.general.faqs().subscribe((data) => {
      this.faqs = data;
      if (isPlatformBrowser(this.platformId)) this.cdr.markForCheck();
    });
  }
}
