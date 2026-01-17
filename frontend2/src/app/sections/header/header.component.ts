import {
  Component,
  Input,
  OnInit,
  Inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { storage } from '../../apis/config';
import { GeneralService } from './../../apis/general.service';
import { SearchComponent } from '../search/search.component';

declare var $: any;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SearchComponent, RouterModule, CommonModule],
  templateUrl: './header.component.html',
  styles: [],
  styleUrls: ['./header.css'],
})
export class HeaderComponent implements OnInit {
  menu = signal<any[]>([]);
  panier = signal<any[]>([]);
  somme_panier = signal<number>(0);

  storage = storage;
  @Input() coordonnees: any;
  id: string | null = null;
  search2 = '';

  private isBrowser: boolean;

  constructor(
    private general: GeneralService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) this.loadLocalStorage();

    // Fetch menu
    this.general.categories().subscribe({
      next: (data: any) => {
        this.menu.set(data || []);
        if (this.isBrowser) localStorage.setItem('menu', JSON.stringify(data));
      },
      error: () => {
        this.menu.set(this.menu() || []);
      },
    });

    if (this.isBrowser) this.general.loadScript();
  }

  private loadLocalStorage() {
    try {
      const panierStr = localStorage.getItem('panier');
      if (panierStr) {
        const items = JSON.parse(panierStr);
        this.panier.set(items);
        this.somme_panier.set(
          items.reduce((acc: number, item: any) => acc + (item.prix_totale || 0), 0)
        );
      }

      const menuStr = localStorage.getItem('menu');
      if (menuStr) this.menu.set(JSON.parse(menuStr));

      this.id = localStorage.getItem('id');
    } catch (e) {
      console.warn('Failed to parse localStorage', e);
    }
  }

  closeMinicart() {
    if (this.isBrowser) setTimeout(() => $('#mini_cart').removeClass('active'), 0);
  }

  search2Action() {
    if (this.search2?.trim()) this.router.navigate(['/produits-search', this.search2.trim()]);
  }

  prevent(e: Event) {
    e.preventDefault();
  }

  expand(index: number) {
    if (!this.isBrowser) return;
    const id = '#categ' + index;
    const sub = '#sub' + index;

    setTimeout(() => {
      if ($(id).hasClass('menu-open')) {
        $(id).removeClass('menu-open');
        $(sub).removeClass('displayblock');
      } else {
        $(id).addClass('menu-open');
        $(sub).addClass('displayblock');
      }
    }, 0);
  }

  account() {
    if (this.isBrowser && localStorage.getItem('token')) this.router.navigate(['/compte']);
    else this.router.navigate(['/login']);
  }
}
