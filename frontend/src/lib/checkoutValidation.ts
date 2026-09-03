export const checkoutFieldOrder = ['livraison_nom', 'livraison_phone', 'livraison_email', 'gouvernorat', 'delegation', 'localite', 'livraison_adresse1'] as const;
export type CheckoutFieldName = typeof checkoutFieldOrder[number];
export type CheckoutErrors = Partial<Record<CheckoutFieldName, string>>;
export type CheckoutValues = Record<CheckoutFieldName, string>;

// Accept pasted local/international numbers and Arabic digits; submit one backend-compatible format.
export function normalizeCheckoutPhone(value: string): string {
  return value.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\s().-]/g, '');
}

export function validateCheckout(values: CheckoutValues): CheckoutErrors {
  const errors: CheckoutErrors = {};
  if (!values.livraison_nom.trim()) errors.livraison_nom = 'Indiquez votre prénom et votre nom.';
  else if (values.livraison_nom.trim().length > 255) errors.livraison_nom = 'Utilisez moins de 256 caractères.';
  if (!values.livraison_phone.trim()) errors.livraison_phone = 'Indiquez le numéro où le livreur peut vous joindre.';
  else if (!/^(?:(?:\+|00)216)?[2-9]\d{7}$/.test(normalizeCheckoutPhone(values.livraison_phone))) {
    errors.livraison_phone = 'Saisissez un numéro tunisien à 8 chiffres, par exemple 20 123 456.';
  }
  const email = values.livraison_email.trim();
  if (email && (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    errors.livraison_email = 'Vérifiez l’adresse email ou laissez ce champ vide.';
  }
  // Only flag the next visible address choice, never hidden dependent fields.
  if (!values.gouvernorat) errors.gouvernorat = 'Choisissez votre gouvernorat.';
  else if (!values.delegation) errors.delegation = 'Choisissez votre délégation.';
  else if (!values.localite) errors.localite = 'Choisissez votre localité.';
  if (!values.livraison_adresse1.trim()) errors.livraison_adresse1 = 'Indiquez la rue, le numéro et le bâtiment.';
  return errors;
}

export function checkoutServerErrors(errors: unknown): CheckoutErrors {
  if (!errors || typeof errors !== 'object') return {};
  const aliases: Record<string, CheckoutFieldName> = {
    nom: 'livraison_nom', livraison_nom: 'livraison_nom', phone: 'livraison_phone', livraison_phone: 'livraison_phone',
    email: 'livraison_email', livraison_email: 'livraison_email', region: 'gouvernorat', livraison_region: 'gouvernorat',
    ville: 'localite', livraison_ville: 'localite', adresse1: 'livraison_adresse1', livraison_adresse1: 'livraison_adresse1',
  };
  const messages: Record<CheckoutFieldName, string> = {
    livraison_nom: 'Vérifiez votre prénom et votre nom.', livraison_phone: 'Vérifiez ce numéro tunisien à 8 chiffres.',
    livraison_email: 'Vérifiez l’adresse email ou laissez ce champ vide.', gouvernorat: 'Choisissez votre gouvernorat.',
    delegation: 'Choisissez votre délégation.', localite: 'Choisissez votre localité.', livraison_adresse1: 'Vérifiez votre adresse de livraison.',
  };
  return Object.fromEntries(Object.keys(errors).flatMap(key => {
    const field = aliases[key.replace(/^commande\./, '')];
    return field ? [[field, messages[field]]] : [];
  }));
}
