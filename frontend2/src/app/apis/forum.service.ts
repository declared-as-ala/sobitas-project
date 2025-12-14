import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { host } from './config';

@Injectable({
  providedIn: 'root'
})
export class ForumService {

  constructor(private http : HttpClient) { }

  url = 'https://localhost/bestlife-admin/public/api'

  liste_publications(){
    return this.http.get(host+'/liste_publications')
  }
  details_publications(id : any){
    return this.http.get(host+'/details_publications/'+id)
  }

  ajouter_publication(body : any){
    return this.http.post(host+'/ajouter_publication' , body)
  }

  ajouter_commentaire(body : any){
    return this.http.post(host+'/ajouter_commentaire' , body)
  }

  modifier_publication(body : any , id:any){
    return this.http.put(host+'/modifier_publication/'+id , body)
  }

  modifier_commentaire(body : any , id:any){
    return this.http.put(host+'/modifier_commentaires/'+id , body)
  }
  supprimer_publications(id : any){
    return this.http.delete(host+'/supprimer_publications/'+id)
  }
  supprimer_commentaire(id : any){
    return this.http.delete(host+'/supprimer_commentaire/'+id)
  }

  update_image(formdata : FormData){
    return this.http.post(this.url+'/update_image' , formdata)

  }

  liste_derniers_publications(){
    return this.http.get(host+'/articles_accueil')
  }
  
}
