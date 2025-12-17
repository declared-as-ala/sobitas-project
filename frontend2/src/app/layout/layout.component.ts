import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';  // ← Add this import
import { GeneralService } from '../apis/general.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../sections/header/header.component';
import { FooterComponent } from '../sections/footer/footer.component';

@Component({
  selector: 'app-layout',
  standalone: true,  // ← Don't forget this! (you had it earlier)
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
  imports: [CommonModule, RouterModule, HeaderComponent, FooterComponent],
})
export class LayoutComponent implements OnInit {
  coordonnees: any = {};  // safe default for SSR

  constructor(
    private general: GeneralService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load cached data only in browser
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('coordonnees');
      if (stored) {
        try {
          this.coordonnees = JSON.parse(stored);
        } catch (e) {
          console.warn('Failed to parse coordonnees from localStorage', e);
        }
      }
    }

    // Fetch fresh data from API
    this.general.coordonnees().subscribe({
      next: (data: any) => {
        this.coordonnees = data;

        // Save to localStorage only in browser
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('coordonnees', JSON.stringify(data));
        }
      },
      error: (err) => {
        console.error('Failed to load coordonnees', err);
      }
    });
    this.cdr.detectChanges();
  }
}