# Règles du Chiffre d'affaires (CA)

## Politique en vigueur (Policy 1)

Le CA augmente **une seule fois par vente** pour éviter tout double comptage.

### Ce qui compte dans le CA

| Source | Condition | Champ utilisé (HT / TTC) |
|--------|-----------|---------------------------|
| **Ticket de caisse** | `tickets.type = 'ticket_caisse'` | prix_ht / prix_ttc |
| **Commande livrée** | `commandes.etat = 'expidee'` | prix_ht / prix_ttc |
| **Facture TVA standalone** | `facture_tvas.source_ticket_id IS NULL AND facture_tvas.commande_id IS NULL` | prix_ht / prix_ttc |

**Date utilisée pour la période :** `created_at`.

### Ce qui ne compte PAS dans le CA

- **Bon de livraison (BL)** : les tickets avec `type = 'bon_livraison'` ne contribuent pas au CA (le CA livraison vient de la commande expédiée).
- **Facture TVA « sur demande »** : une facture TVA liée à un ticket (`source_ticket_id`) ou à une commande (`commande_id`) ne contribue pas au CA (déjà compté côté ticket ou commande).

### Exemples

1. **Vente en boutique**  
   Création d’un ticket type « Ticket de caisse » → le CA augmente (HT et TTC) à la création du ticket.

2. **Commande livrée**  
   La commande passe à « Expédiée » → le CA augmente (HT et TTC) pour cette commande (période = `created_at` de la commande).  
   Si vous créez ensuite un BL (Ticket ou Facture) ou une Facture TVA pour cette commande, cela n’ajoute rien au CA.

3. **Facture TVA pour un ticket de caisse**  
   Depuis un ticket de caisse, action « Créer Facture TVA pour ce ticket » → la facture est créée avec `source_ticket_id` renseigné → elle ne contribue pas au CA (déjà compté avec le ticket).

4. **Facture TVA créée manuellement sans lien**  
   Une facture TVA créée sans `source_ticket_id` ni `commande_id` est dite « standalone » et contribue au CA.

## KPI affichés

- **CA HT** : indicateur principal (tableau de bord, graphique).
- **CA TTC** : indiqué à titre secondaire (ex. dans la description du bloc CA du dashboard).

## Liens entre documents

- **Ticket (BL)** : `type = 'bon_livraison'` et `commande_id` obligatoire.
- **Ticket (caisse)** : `type = 'ticket_caisse'` et `commande_id = null`.
- **Facture TVA** : soit `source_ticket_id` (liée à un ticket), soit `commande_id` (liée à une commande), soit les deux à null (standalone). Une seule des deux liaisons peut être renseignée.

## Scénarios de test (QA)

1. **Boutique**  
   Créer un ticket « Ticket de caisse » avec des lignes → vérifier que le CA du jour (HT) augmente du montant HT du ticket.

2. **Livraison**  
   Créer une commande, la passer en « Expédiée » → vérifier que le CA augmente du montant de la commande. Créer un BL (Ticket ou Facture) pour cette commande → vérifier que le CA ne change pas.

3. **Facture sur demande (ticket)**  
   Créer un ticket de caisse, puis « Créer Facture TVA pour ce ticket » → vérifier que la facture a `source_ticket_id` renseigné et que le CA ne double pas.

4. **Facture sur demande (commande)**  
   Depuis une commande expédiée, « Créer Facture TVA pour cette commande » → vérifier que la facture a `commande_id` renseigné et que le CA ne double pas.

5. **Standalone**  
   Créer une facture TVA sans lien ticket/commande → vérifier que le CA augmente du montant de cette facture.
