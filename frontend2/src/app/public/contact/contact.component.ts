import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { GeneralService } from './../../apis/general.service';
import Swal from 'sweetalert2';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
  imports: [BreadcrumbsComponent,ReactiveFormsModule],
})
export class ContactComponent implements OnInit {
  coordonnees: any = JSON.parse(localStorage.getItem('coordonnees') || '{}');

  constructor(private general: GeneralService , private sanitizer: DomSanitizer) {}
  contactForm: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    message: new FormControl('', Validators.required),
  });

  map : any
  ngOnInit(): void {
    this.general
      .coordonnees()
      .subscribe((data: any) =>{
        this.coordonnees = data ;
        this.map = this.sanitizer.bypassSecurityTrustHtml(this.coordonnees.gelocalisation);
      });

      setTimeout(() => {
          document.querySelector('meta[name="description"]')?.setAttribute("content" , "_desc")
      }, 0);
  }

  sendEmail() {
    if (this.contactForm.valid) {

      this.general.contact(this.contactForm.value)
      .subscribe((data : any)=>{

        Swal.fire({
          title: data.success,
          icon: 'success',
          toast: true,
          timer: 5000,
          showConfirmButton: false,
          position: 'top-end',
        });

        this.contactForm.reset()
      })

    }
  }
}
