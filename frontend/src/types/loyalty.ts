export interface LoyaltyCard {
  id: number;
  card_number: string;
  qr_token: string;
  status: 'active' | 'suspended' | 'lost';
  issued_at: string | null;
  qr_url: string;
}

export interface LoyaltyCardData {
  card: LoyaltyCard;
  points: number;
  monetary_value: number;
  can_redeem: boolean;
  min_redeem: number;
  rate_info: string;
}

export interface LoyaltyTransaction {
  id: number;
  type: 'earn' | 'redeem' | 'reversal' | 'adjustment';
  type_label: string;
  points: number;
  monetary_value: number | null;
  description: string | null;
  date: string;
  order_number: string | null;
}

export interface LoyaltyTransactionsData {
  transactions: LoyaltyTransaction[];
}

export interface RedemptionValidation {
  valid: boolean;
  message: string;
  points: number;
  discount: number;
}
