import { ChangeDetectorRef, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../apis/auth.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styles: [
  ],
  imports: [CommonModule,ReactiveFormsModule],
})
export class SignInComponent  {


  constructor(private api : AuthService , private router : Router, private cdr: ChangeDetectorRef){
    if(localStorage.getItem('token')){
      this.router.navigate(['/compte'])
    }
  }

  login = new FormGroup({
    email : new FormControl('' , [Validators.required , Validators.email]),
    password : new FormControl('' , [Validators.required , Validators.minLength(6)]),
  })

  signin(){

    if(this.login.valid){
      this.api.login(this.login.value)
      .subscribe((user : any)=>{



          localStorage.setItem('name' , user.name)
          localStorage.setItem('token' , user.token)
          localStorage.setItem('id' , user.id)
          this.router.navigate(['/compte'])

          Swal.fire({
            icon : 'success' , toast : true , timer : 4000 , showConfirmButton : false , title :'Success ! '
          })


      } , err=>{

        Swal.fire({
          icon : 'error' , toast : true , timer : 4000 , showConfirmButton : false , title : err.error.message
        })
      })
      this.cdr.detectChanges();
    }
  }
  registre =new FormGroup({
    email : new FormControl('' , [Validators.required , Validators.email]),
    name : new FormControl('' , [Validators.required , Validators.minLength(5)]),
    role_id : new FormControl(2 , [Validators.required ]),
    phone : new FormControl('' , [Validators.required , Validators.min(20000001), Validators.max(99999999)]),
    password : new FormControl('' , [Validators.required , Validators.minLength(6)]),

  })
  signUp(){

    if(this.registre.valid){
      this.api.registre(this.registre.value)
      .subscribe((user : any)=>{


          Swal.fire({
            icon : 'success' , toast : true , timer : 4000 , showConfirmButton : false , title :'Votre compte a été bien créé'
          })

          localStorage.setItem('name' , user.name)
          localStorage.setItem('id' , user.id)
          localStorage.setItem('token' , user.token)
          this.router.navigate(['/compte'])

        this.registre.reset();


      } , err=>{


        Swal.fire({
          icon : 'error' , toast : true , timer : 4000 , showConfirmButton : false , title : err.error.message
        })
      })
      this.cdr.detectChanges();
    }
  }



















}

