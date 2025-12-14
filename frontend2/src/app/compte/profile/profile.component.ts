import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../apis/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  imports: [ReactiveFormsModule],
})
export class ProfileComponent implements OnInit{

  profil =new FormGroup({
    email : new FormControl('' , [Validators.required , Validators.email]),
    name : new FormControl('' , [Validators.required ]),

    phone :  new FormControl('' ),


  })




  constructor(private auth : AuthService){

  }

  ngOnInit(): void {
    this.auth.profil()
    .subscribe((data:any)=>{

      this.profil.patchValue(data)
    })
  }
/*   upload(event : any){
    let files = event.target.files

    if(files && files.length >0){
      let file = files[0];
      let formData = new FormData()
      formData.append('image' , file , file.name)
      this.auth.update_image(formData)
      .subscribe((path : any)=>{
        let p : string = path.path
        p=p.slice(7,p.length)
        this.profil.get('avatar')?.setValue(p)

      })
    }
  } */
  save(){
    this.auth.modifier_profil(this.profil.value)
    .subscribe(()=>{


      Swal.fire({
        icon : 'success' , toast : true , timer : 4000 , showConfirmButton : false , title :'Votre profil a été bien modifié'
      })
    })
  }
}
