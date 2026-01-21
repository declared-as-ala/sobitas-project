import { GeneralService } from '../../apis/general.service';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Meta, Title } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
  imports: [BreadcrumbsComponent, ReactiveFormsModule]
})
export class ContactComponent implements OnInit {
  coordonnees: any ;
  map: any;

  contactForm: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    message: new FormControl('', Validators.required),
  });

  constructor(
    private general: GeneralService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private meta: Meta,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.coordonnees = JSON.parse(localStorage.getItem('coordonnees') || '{}');
    // Set SEO meta tags safely
    this.titleService.setTitle('Contactez Proteine Tunisie');
    this.meta.updateTag({
      name: 'description',
      content: 'Contactez Proteine Tunisie pour vos compléments alimentaires, gainer et protéines en Tunisie. Produits de meilleure qualité à bas prix.'
    });

    // Load coordinates
    this.general.coordonnees().subscribe((data: any) => {
      this.coordonnees = data;
      this.map = this.sanitizer.bypassSecurityTrustHtml(this.coordonnees.gelocalisation);
      this.cdr.detectChanges();
    });
  }

  sendEmail() {
    if (this.contactForm.valid) {
      this.general.contact(this.contactForm.value).subscribe((data: any) => {
        Swal.fire({
          title: data.success,
          icon: 'success',
          toast: true,
          timer: 5000,
          showConfirmButton: false,
          position: 'top-end',
        });

        this.contactForm.reset();
        this.cdr.detectChanges();
      });
    }
  }
}
