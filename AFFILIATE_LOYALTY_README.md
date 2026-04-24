# Affiliate & Loyalty System — protein.tn
## Guide d'utilisation complet

---

## Table des matières

1. [Installation](#1-installation)
2. [Module Partenaires (Coachs & Salles)](#2-module-partenaires)
3. [Tableau de bord partenaire](#3-tableau-de-bord-partenaire)
4. [Module Fidélité clients](#4-module-fidélité-clients)
5. [Intégration checkout (frontend)](#5-intégration-checkout)
6. [Configuration avancée](#6-configuration-avancée)
7. [Scénarios de test manuels](#7-scénarios-de-test-manuels)
8. [Référence des routes API](#8-référence-des-routes-api)

---

## 1. Installation

### 1.1 Migrations (obligatoire)

```bash
cd filament
php artisan migrate
```

Cela crée les 7 nouvelles tables :
- `partners`
- `partner_commission_transactions`
- `partner_payouts`
- `loyalty_cards`
- `loyalty_point_transactions`
- Et ajoute les colonnes `partner_id`, `commission_rate` sur `coupons`
- Et ajoute les colonnes `partner_id`, `loyalty_points_*` sur `commandes`

### 1.2 QR Code (optionnel mais recommandé)

```bash
composer require chillerlan/php-qrcode
```

Sans ce package, les QR codes sont générés via l'API externe `api.qrserver.com` (fonctionne sans installation mais nécessite internet côté serveur).

### 1.3 Variables d'environnement (optionnel)

Ajoutez dans `.env` pour personnaliser les règles fidélité :

```env
LOYALTY_POINTS_PER_CURRENCY=1      # 1 DT = 1 point
LOYALTY_POINTS_PER_DT=10           # 10 points = 1 DT de réduction
LOYALTY_MIN_REDEEM=100             # Minimum 100 points pour utiliser
LOYALTY_MAX_DISCOUNT_PCT=0.50      # Max 50% de réduction par commande
LOYALTY_EARN_ON_DISCOUNTED=true    # Gagner des points même avec coupon
LOYALTY_EARN_ON_DELIVERY=false     # Ne pas compter les frais de livraison
```

---

## 2. Module Partenaires

### 2.1 Créer un partenaire (Coach ou Salle de sport)

1. Aller dans **Admin** → groupe **Partenaires** → **Partenaires**
2. Cliquer **Nouveau partenaire**
3. Remplir :
   - **Type** : `Coach` ou `Salle de sport`
   - **Nom complet** : ex. `Ali Ben Salah`
   - **Nom du club** (si salle) : ex. `FitPro Gym Tunis`
   - **Email / Téléphone**
   - **Taux de commission** : par défaut `10%` (modifiable par partenaire)
   - **Statut** : mettre `Actif` pour activer immédiatement
4. Section **Compte utilisateur** : associer un compte User existant (role_id = 4) pour que le partenaire puisse se connecter à son tableau de bord
5. Section **Informations de paiement** : banque, RIB/IBAN pour les virements
6. Sauvegarder

> **Important** : Le partenaire ne génère des commissions **que si son statut est `Actif`**. Un partenaire en statut `En attente` ou `Suspendu` n'accumule pas de commissions.

---

### 2.2 Créer un compte utilisateur pour un partenaire

Pour qu'un partenaire puisse se connecter à `/partner` :

1. Aller dans **Admin** → **Utilisateurs** → créer un User
2. Mettre `role_id = 4` dans la base (ou via le formulaire si le champ est visible)
3. Retourner sur la fiche du partenaire → section **Compte utilisateur** → sélectionner ce User

Le partenaire peut alors se connecter sur :
```
https://admin.protein.tn/partner/login
```

---

### 2.3 Assigner un code promo à un partenaire

1. Aller dans **Admin** → **Codes Promo** → créer ou modifier un coupon
2. Faire défiler jusqu'à la section **Partenaire affilié**
3. Sélectionner le partenaire dans la liste déroulante
4. Optionnel : saisir un **Taux commission spécifique** pour ce code (sinon le taux du partenaire s'applique)
5. Sauvegarder

> Le partenaire reçoit sa commission uniquement quand une commande utilisant **son code promo** passe au statut **Expédiée**.

---

### 2.4 Consulter les commissions dans l'admin

**Admin** → **Partenaires** → **Commissions**

Colonnes disponibles :
- Date, Partenaire, Type (commission / paiement / annulation), Montant, Solde après, Statut, N° commande

Filtres :
- Par partenaire
- Par type de transaction
- Par statut
- Par plage de dates

---

### 2.5 Effectuer un paiement partenaire

1. Aller dans **Admin** → **Partenaires** → **Paiements partenaires**
2. Cliquer **Nouveau paiement**
3. Sélectionner le partenaire → le **Solde disponible** s'affiche automatiquement
4. Saisir le montant à payer
5. Ajouter une référence de virement (facultatif)
6. Sauvegarder → le paiement est en statut **En attente**
7. Dans la liste, cliquer **Marquer payé** sur la ligne → le solde du partenaire est débité

> **Système de ledger** : le solde n'est jamais modifié directement. Chaque transaction est enregistrée et le solde est calculé dynamiquement : `commissions confirmées − paiements effectués − annulations`.

---

## 3. Tableau de bord partenaire

### 3.1 Connexion

URL : `https://admin.protein.tn/partner/login`

Le partenaire se connecte avec son email et mot de passe (compte User associé).

### 3.2 Ce que le partenaire voit

**Tableau de bord** — 4 KPI cards :
- **Total des gains** : toutes les commissions confirmées
- **Solde disponible** : montant qu'il peut percevoir
- **En attente** : commissions en cours de validation
- **Total payé** : historique des paiements reçus

Plus la liste de ses codes promo avec leur statut.

**Menu latéral** :
| Page | Description |
|---|---|
| Tableau de bord | KPIs et codes promo |
| Mes commandes | Commandes générées par ses codes |
| Mes gains | Historique de toutes ses transactions |
| Historique des paiements | Tous les virements reçus |

### 3.3 Ce que le partenaire NE peut PAS voir

- Les commandes des autres clients (sauf celles liées à ses codes)
- Les autres partenaires
- La gestion des produits, stocks, factures
- Les paramètres admin
- Les données des autres clients

---

## 4. Module Fidélité clients

### 4.1 Comment les points sont gagnés

**Automatiquement**, lors du passage d'une commande au statut **Expédiée** :
- `1 DT dépensé = 1 point` (configurable)
- Calculé sur le sous-total HT après remise coupon, **hors frais de livraison**
- La partie payée avec des points de fidélité ne génère pas de nouveaux points

### 4.2 Gérer les cartes fidélité dans l'admin

**Admin** → **Fidélité** → **Cartes fidélité**

#### Émettre une carte manuellement
1. Cliquer **Émettre une carte**
2. Sélectionner le client
3. La carte est créée avec un numéro unique (`PROT-XXXX-XXXX-XXXX`) et un QR token sécurisé

> Les cartes sont aussi créées **automatiquement** à la première connexion du client sur son compte ou lors de son premier achat en ligne.

#### Actions disponibles par carte
- **Imprimer** : ouvre la vue d'impression de la carte (design premium avec QR code)
- **Ajouter points** : ajout manuel de points avec description (ajustement admin, achat boutique, etc.)
- **Modifier** : changer le statut (active / suspendue / perdue)

---

### 4.3 Imprimer une carte fidélité

1. Aller sur la fiche du client → **Cartes fidélité**
2. Cliquer **Imprimer** sur la ligne de sa carte
3. Une page s'ouvre avec :
   - Logo protein.tn
   - Nom du client
   - Numéro de carte
   - QR code scannable
   - Points actuels
   - Règles du programme
4. La fenêtre d'impression du navigateur s'ouvre automatiquement

---

### 4.4 Scanner une carte en boutique (admin)

Pour identifier un client qui présente sa carte en boutique, utiliser l'API :

```bash
POST /api/loyalty/scan
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "qr_token": "le_token_scanné_depuis_le_qr"
}
```

Réponse :
```json
{
  "card": { "card_number": "PROT-XXXX-XXXX-XXXX", "status": "active" },
  "client": { "id": 42, "name": "Ahmed Ben Ali", "phone": "22123456", "email": "..." },
  "points": 350,
  "monetary_value": 35.000
}
```

---

### 4.5 Ajouter des points manuellement (boutique)

```bash
POST /api/loyalty/admin/add-points
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "client_id": 42,
  "points": 150,
  "description": "Achat en boutique - reçu #1234"
}
```

---

### 4.6 Consulter les transactions points

**Admin** → **Fidélité** → **Transactions points**

Affiche l'historique complet de tous les clients avec :
- Type (gain / utilisation / annulation / ajustement)
- Points (positif ou négatif)
- Valeur en DT
- Commande associée
- Date

---

## 5. Intégration checkout

### 5.1 Ce que voit le client sur le site

**Page Mon Compte** → onglet **Ma Carte Fidélité** :
- Carte visuelle avec son numéro et son solde de points
- QR code à présenter en boutique
- Valeur équivalente en DT
- Règles du programme
- Historique de toutes les transactions

**Page Checkout** (si client connecté avec assez de points) :
- Section **Utiliser vos points fidélité** apparaît automatiquement
- Le client saisit le nombre de points à utiliser
- Clic **Vérifier** → valide et affiche le montant de réduction
- Clic **Appliquer** → la réduction est appliquée sur le total
- Le total final et la ligne de réduction se mettent à jour en temps réel

> La section n'apparaît que si le client a au moins `100 points` (configurable).

### 5.2 Règles de validation côté serveur

Même si le client contourne le frontend, le serveur re-valide :
- Solde suffisant
- Points dans la limite du maximum autorisé (50% du sous-total par défaut)
- Idempotence : une seule transaction de remboursement par commande

---

### 5.3 Flux complet d'une commande avec code partenaire

```
1. Client entre COACHALI10 au checkout
   └─ Frontend appelle POST /api/coupons/apply → réduction -10% calculée

2. Client valide la commande
   └─ POST /api/add_commande { coupon_code: "COACHALI10", loyalty_points_redeem: 0 }
   └─ Serveur : revalide le coupon, attache partner_id au Commande
   └─ commission_base = prix_ht - discount_ht
   └─ estimated_commission = commission_base × 10%

3. Admin passe la commande en statut "Expédiée"
   └─ CommandeObserver::updated() déclenche handleCommissionAndLoyalty()
   └─ PartnerCommissionService::createCommission() → enregistre +50 DT confirmé
   └─ LoyaltyService::earnPointsForOrder() → enregistre +XXX points client

4. Admin crée un paiement de 50 DT pour le coach
   └─ Bouton "Marquer payé" → PartnerCommissionService::recordPayout()
   └─ Transaction ledger -50 DT → solde partenaire = 0
```

---

### 5.4 Flux d'annulation

```
1. Admin passe la commande en "Annulée"
   └─ CommandeObserver déclenche les reversals
   └─ PartnerCommissionService::reverseCommission() → -50 DT sur le ledger
   └─ LoyaltyService::reverseOrderTransactions() → annule les points gagnés
                                                  → restaure les points utilisés
```

---

## 6. Configuration avancée

### 6.1 Fichier de configuration fidélité

`filament/config/loyalty.php`

```php
return [
    'points_per_currency'       => 1,      // 1 DT = 1 point
    'points_per_dt'             => 10,     // 10 points = 1 DT
    'min_points_to_redeem'      => 100,    // seuil minimum
    'max_discount_percent'      => 0.50,   // max 50% payable en points
    'earn_on_discounted_orders' => true,   // gagner des points même avec coupon
    'earn_on_delivery_fee'      => false,  // ne pas compter la livraison
    'earn_trigger_statuses'     => ['expidee'],  // statut déclencheur
    'reversal_trigger_statuses' => ['annuler'],  // statut annulation
];
```

### 6.2 Statuts de commande utilisés

| Statut DB | Label | Action déclenchée |
|---|---|---|
| `expidee` | Expédiée | Crée commission partenaire + points client |
| `annuler` | Annulée | Annule commission + annule/restaure points |

---

### 6.3 Idempotence (protection double-exécution)

Chaque opération vérifie l'existence d'une transaction précédente avant d'en créer une nouvelle :
- Une seule commission `earn` par commande
- Un seul `redeem` de points par commande
- Un seul `reversal` par commande annulée
- Si le même statut est appliqué deux fois → aucune duplication

---

## 7. Scénarios de test manuels

### Test 1 — Commission coach basique

```
1. Créer partenaire : Ali Coach, type=coach, commission=10%, statut=actif
2. Créer coupon : COACHALI10, type=percent, value=10, partner=Ali Coach
3. Passer une commande de 500 DT avec le code COACHALI10
4. Dans l'admin, passer la commande en "Expédiée"

Résultat attendu :
- Admin → Partenaires → Commissions → nouvelle ligne +45 DT (500 × 10% - 10% remise)
  (ou +50 DT selon que la base est HT brut ou après remise)
- Partenaire connecté sur /partner → Solde disponible = 45-50 DT
```

### Test 2 — Paiement partenaire

```
1. Après Test 1, aller dans Admin → Paiements partenaires → Nouveau paiement
2. Sélectionner Ali Coach, montant = 45 DT, référence = "VIR-001"
3. Sauvegarder → statut "En attente"
4. Cliquer "Marquer payé"

Résultat attendu :
- Solde partenaire = 0
- Historique conservé : +45 DT commission, -45 DT paiement
- Partenaire voit dans "Historique des paiements" : 45 DT payé
```

### Test 3 — Annulation avec reversal

```
1. Après Test 1, passer la commande en "Annulée"

Résultat attendu :
- Nouvelle transaction -45 DT "Annulation commission" dans le ledger
- Solde partenaire revient à 0
- L'historique garde toutes les transactions (commission + reversal)
```

### Test 4 — Points fidélité client

```
1. Client authentifié passe une commande de 300 DT (sans coupon, sans points)
2. Passer la commande en "Expédiée"

Résultat attendu :
- Client connecté → Mon Compte → Ma Carte Fidélité
- Affiche 300 points
- Affiche valeur : 30.000 DT
- Historique : +300 pts "Points gagnés — commande #XXX"
```

### Test 5 — Utilisation de points au checkout

```
1. Client a 300 points (=30 DT)
2. Passer une commande de 200 DT
3. Au checkout, saisir 200 dans le champ points → Vérifier
   (max 50% × 200 DT = 100 DT max → 1000 points max)
4. Saisir 100 → Vérifier → affiche "-10.000 DT"
5. Cliquer Appliquer → total passe à 190 DT

Résultat attendu après livraison :
- -100 pts pour la remise (transaction redeem)
- +190 pts gagnés (base = 200-10=190, sans livraison)
- Solde net : 300 - 100 + 190 = 390 points
```

### Test 6 — Idempotence (double déclenchement)

```
1. Passer commande en "Expédiée"
2. Sauvegarder à nouveau le même statut

Résultat attendu :
- Aucune commission supplémentaire créée
- Aucun doublon de points
- Les logs montrent "commission already exists"
```

### Test 7 — Partenaire isolé (sécurité)

```
1. Connecter un partenaire sur /partner
2. Essayer d'accéder à /admin → redirection vers /partner/login
3. Essayer d'accéder aux données d'un autre partenaire → 0 résultats (scoped query)
```

---

## 8. Référence des routes API

### Routes publiques (frontend)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/loyalty/qr/{token}` | Image QR code (sécurisée par token) |

### Routes authentifiées client (Sanctum)

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/loyalty/card` | Carte fidélité + solde points |
| `GET` | `/api/loyalty/transactions` | Historique des transactions |
| `POST` | `/api/loyalty/validate-redemption` | Valider un nombre de points à utiliser |

**Body validate-redemption :**
```json
{ "points": 100, "subtotal": 300.000 }
```

### Routes admin uniquement (Sanctum + permission admin)

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/loyalty/scan` | Identifier un client via QR token |
| `POST` | `/api/loyalty/admin/add-points` | Ajouter/déduire des points manuellement |

**Body scan :**
```json
{ "qr_token": "abc123..." }
```

**Body add-points :**
```json
{ "client_id": 42, "points": 50, "description": "Achat boutique" }
```

### Paramètre de commande (checkout)

Le payload `POST /api/add_commande` accepte maintenant :
```json
{
  "commande": { ... },
  "panier": [ ... ],
  "coupon_code": "COACHALI10",
  "loyalty_points_redeem": 100
}
```

---

## Architecture résumée

```
filament/
├── database/migrations/
│   ├── 2026_04_25_100001_create_partners_table.php
│   ├── 2026_04_25_100002_add_partner_fields_to_coupons_table.php
│   ├── 2026_04_25_100003_add_partner_loyalty_fields_to_commandes_table.php
│   ├── 2026_04_25_100004_create_partner_commission_transactions_table.php
│   ├── 2026_04_25_100005_create_partner_payouts_table.php
│   ├── 2026_04_25_100006_create_loyalty_cards_table.php
│   └── 2026_04_25_100007_create_loyalty_point_transactions_table.php
│
├── app/
│   ├── Enums/             PartnerType, PartnerStatus, CommissionTransaction*, LoyaltyCard*, LoyaltyTransaction*
│   ├── Models/            Partner, PartnerCommissionTransaction, PartnerPayout, LoyaltyCard, LoyaltyPointTransaction
│   ├── Services/          PartnerCommissionService.php, LoyaltyService.php
│   ├── Observers/         CommandeObserver.php  ← hooks ajoutés ici
│   ├── Http/Controllers/Api/  LoyaltyController.php
│   └── Filament/
│       ├── Resources/     PartnerResource, PartnerCommissionTransactionResource,
│       │                  PartnerPayoutResource, LoyaltyCardResource, LoyaltyPointTransactionResource
│       └── Partner/       Panel partenaire isolé (Dashboard + 4 Resources scopées)
│
├── Providers/Filament/
│   └── PartnerPanelProvider.php    ← /partner panel
│
├── config/loyalty.php
└── resources/views/print/loyalty-card.blade.php

frontend/
├── src/
│   ├── types/loyalty.ts
│   ├── services/api.ts              ← getLoyaltyCard, getLoyaltyTransactions, validateLoyaltyRedemption
│   ├── lib/orderPayload.ts          ← loyalty_points_redeem ajouté
│   └── app/
│       ├── account/
│       │   ├── AccountPage.tsx      ← onglet "Ma Carte Fidélité" ajouté
│       │   └── LoyaltySection.tsx   ← composant complet
│       └── checkout/
│           ├── CheckoutPage.tsx     ← LoyaltyRedemption intégré
│           └── LoyaltyRedemption.tsx
```

---

## Notes importantes

- **Ne jamais supprimer** les enregistrements dans `partner_commission_transactions` ou `loyalty_point_transactions` — ce sont des ledgers append-only. Utilisez des annulations (reversal) à la place.
- **Le solde partenaire** est calculé dynamiquement depuis le ledger — il n'y a pas de colonne `balance` sur le modèle `Partner`.
- **Les points client** sont calculés dynamiquement avec `SUM(points)` sur `loyalty_point_transactions`.
- **Sécurité QR** : le `qr_token` ne contient jamais l'ID client — c'est une chaîne aléatoire de 48 caractères.
- **Compatibilité** : aucune modification aux routes/logiques existantes (checkout, coupons, BL, factures). Tout est additif.
