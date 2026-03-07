/**
 * Shared structure for POST /api/add_commande (backend).
 * Used by both normal checkout and quick order (commande rapide).
 * @see backend/docs/API_ADD_COMMANDE_STRUCTURE.md
 */

export interface BackendCommandeFields {
  /** Billing/client (optional if livraison is used) */
  nom?: string;
  prenom?: string;
  email?: string;
  phone?: string;
  pays?: string;
  region?: string;
  ville?: string;
  code_postale?: string | number | null;
  adresse1?: string;
  adresse2?: string;
  /** Livraison (delivery) – primary for backend */
  livraison_nom: string;
  livraison_prenom: string;
  livraison_email: string;
  livraison_phone: string;
  livraison_region: string;
  livraison_ville: string;
  livraison_code_postale?: string | number | null;
  livraison_adresse1: string;
  livraison_adresse2?: string;
  livraison?: number;
  frais_livraison: number;
  note?: string;
  user_id?: number;
}

export interface BackendPanierItem {
  produit_id: number;
  quantite: number;
  prix_unitaire: number;
}

/** Exact body for POST /api/add_commande */
export interface BackendOrderPayload {
  commande: BackendCommandeFields;
  panier: BackendPanierItem[];
  m_remise?: number;
  /** Code promo (validé côté client via /coupons/apply); re-validé côté serveur */
  coupon_code?: string;
}

/**
 * Build the payload expected by the backend add_commande API.
 * Use this for both normal checkout and quick order so the structure is always the same.
 */
export function buildBackendOrderPayload(params: {
  livraison: {
    livraison_nom: string;
    livraison_prenom: string;
    livraison_email: string;
    livraison_phone: string;
    livraison_region: string;
    livraison_ville: string;
    livraison_adresse1: string;
    livraison_code_postale?: string | number | null;
    livraison_adresse2?: string;
    note?: string;
    livraison?: number;
    frais_livraison: number;
  };
  panier: Array<{ produit_id: number; quantite: number; prix_unitaire: number }>;
  user_id?: number;
  m_remise?: number;
  /** Code promo appliqué côté client (optionnel). */
  coupon_code?: string;
}): BackendOrderPayload {
  const { livraison, panier, user_id, m_remise, coupon_code } = params;
  const commande: BackendCommandeFields = {
    livraison_nom: livraison.livraison_nom,
    livraison_prenom: livraison.livraison_prenom,
    livraison_email: livraison.livraison_email,
    livraison_phone: livraison.livraison_phone,
    livraison_region: livraison.livraison_region,
    livraison_ville: livraison.livraison_ville,
    livraison_adresse1: livraison.livraison_adresse1,
    livraison_code_postale: livraison.livraison_code_postale ?? undefined,
    livraison_adresse2: livraison.livraison_adresse2,
    livraison: livraison.livraison ?? 1,
    frais_livraison: livraison.frais_livraison,
    note: livraison.note,
    user_id,
    // Mirror livraison into client fields so backend has both (same as backend doc)
    nom: livraison.livraison_nom,
    prenom: livraison.livraison_prenom,
    email: livraison.livraison_email,
    phone: livraison.livraison_phone,
    pays: 'Tunisie',
    region: livraison.livraison_region,
    ville: livraison.livraison_ville,
    code_postale: livraison.livraison_code_postale ?? undefined,
    adresse1: livraison.livraison_adresse1,
    adresse2: livraison.livraison_adresse2,
  };
  const payload: BackendOrderPayload = {
    commande,
    panier: panier.map((item) => ({
      produit_id: item.produit_id,
      quantite: item.quantite,
      prix_unitaire: item.prix_unitaire,
    })),
  };
  if (m_remise != null && m_remise > 0) {
    payload.m_remise = m_remise;
  }
  if (coupon_code != null && coupon_code.trim() !== '') {
    payload.coupon_code = coupon_code.trim();
  }
  return payload;
}
