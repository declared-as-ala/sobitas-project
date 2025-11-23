import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { host } from './config';
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private https: HttpClient) { }


  registre(form: any) {
    return this.http.post(host + 'register', form)
  }

  login(form: any) {
    return this.http.post(host + 'login', form)
  }

  profil() {
    let options = {
      headers: new HttpHeaders({ 'Authorization': 'Bearer ' + localStorage.getItem('token') })
    }
    return this.http.get(host + 'profil', options)
  }
  modifier_profil(body: any) {
    let options = {
      headers: new HttpHeaders({ 'Authorization': 'Bearer ' + localStorage.getItem('token') })
    }
    return this.http.post(host + 'update_profile', body, options)
  }

  update_image(formdata: FormData) {
    return this.http.post('update_image', formdata)
  }


  commandes() {
    let options = {
      headers: new HttpHeaders({ 'Authorization': 'Bearer ' + localStorage.getItem('token') })
    }
    return this.http.get(host + 'client_commandes', options)
  }
  sendReview(body:any){
    let options = {
      headers: new HttpHeaders({ 'Authorization': 'Bearer ' + localStorage.getItem('token') })
    }
    return this.http.post(host + 'add_review', body, options)
  }
}
