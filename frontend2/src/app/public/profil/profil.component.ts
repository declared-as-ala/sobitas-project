import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../apis/auth.service';
import { storage } from '../../apis/config';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css'],
  imports: [CommonModule]
})
export class ProfilComponent implements OnInit {


  constructor(private auth : AuthService , private route : ActivatedRoute, private cdr: ChangeDetectorRef){

  }

  id :any;

  profil : any
  storage = storage
  ngOnInit(): void {
    this.id = this.route.snapshot.params['user_id']
    this.auth.profil()
    .subscribe((data :any)=>{
      this.profil = data
    })
    this.cdr.detectChanges();
  }
}
