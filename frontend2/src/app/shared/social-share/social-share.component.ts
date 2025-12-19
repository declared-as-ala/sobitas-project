import { Component, Inject, PLATFORM_ID, Input } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ShareButtons } from 'ngx-sharebuttons/buttons';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { safeHtmlToText } from '../../public/products-details/products-details.component';

@Component({
  selector: 'app-social-share',
  standalone: true,
  imports: [ShareButtons],
  templateUrl: './social-share.component.html',
  styleUrls: ['./social-share.component.css']
})
export class SocialShareComponent {
  @Input() description: string | undefined;

  url: string | undefined;
  isBrowser: boolean;
  safeDescription: string | undefined; // For display only

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private sanitizer: DomSanitizer) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.url = window.location.href;
    }
  }

  ngOnChanges() {
    if (this.description) {
      // Sanitize HTML for safe display (tooltip, preview, etc.)
      this.safeDescription = safeHtmlToText(this.sanitizer.bypassSecurityTrustHtml(this.description));
    }
  }

  // Plain text version for ShareButtons
  get plainDescription(): string {
    // Strip HTML tags for social sharing
    return this.description?.replace(/<[^>]*>/g, '') || 'Check this out!';
  }
}


