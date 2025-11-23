import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { host } from './config';

@Injectable({
  providedIn: 'root'
})
export class CommandeService {

  constructor(private http:HttpClient) { }


  passer_commande(commande: any, panier: any) {

    let body = {
      commande: commande,
      panier: panier
    }
    return this.http.post(host + 'add_commande', body)
  }

  historique_client() {
    return this.http.get(host + '/historique_client/' + localStorage.getItem('id'))

  }
  details_commande(commande_id: any) {
    return this.http.get(host + 'commande/' + commande_id)

  }


  annuler_commande(id: number) {

    return this.http.put(host + '/annuler_commande/' + id, {})

  }
}
