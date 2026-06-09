type SeoEntry = { title: string; description: string };

const englishSeo: Record<string, SeoEntry> = {
  '/': {
    title: 'Protein Tunisia | Whey, Creatine & Supplements',
    description: 'Shop authentic whey protein, creatine, vitamins, and supplements in Tunisia with fast delivery.',
  },
  '/shop': { title: 'Protein & Supplements Shop Tunisia', description: 'Browse protein, creatine, gainers, BCAA, and sports supplements.' },
  '/brands': { title: 'Supplement Brands', description: 'Discover supplement brands available in Tunisia.' },
  '/packs': { title: 'Supplement Packs', description: 'Save with supplement packs designed for your fitness goals.' },
  '/offres': { title: 'Offers & Discounts', description: 'Discover the latest supplement offers and discounts.' },
  '/blog': { title: 'Nutrition & Fitness Blog', description: 'Advice and articles about nutrition, fitness, and supplements.' },
  '/faqs': { title: 'Frequently Asked Questions', description: 'Answers about our products, orders, payments, and delivery.' },
  '/contact': { title: 'Contact Us', description: 'Contact the Protein Tunisia team.' },
  '/qui-sommes-nous': { title: 'About Us', description: 'Learn about Protein Tunisia and our supplement expertise.' },
  '/login': { title: 'Log In', description: 'Log in to your Protein Tunisia account.' },
  '/register': { title: 'Create an Account', description: 'Create your Protein Tunisia account.' },
  '/forgot-password': { title: 'Forgot Password', description: 'Recover access to your account.' },
  '/account': { title: 'My Account', description: 'Manage your profile and orders.' },
  '/account/orders': { title: 'My Orders', description: 'Review your previous orders.' },
  '/cart': { title: 'Shopping Cart', description: 'Review your shopping cart.' },
  '/checkout': { title: 'Checkout', description: 'Complete your order securely.' },
  '/favoris': { title: 'Favorites', description: 'Review your favorite products.' },
};

export function getEnglishSeo(pathname: string): SeoEntry | undefined {
  if (englishSeo[pathname]) return englishSeo[pathname];
  const parent = Object.keys(englishSeo)
    .filter((path) => path !== '/' && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
  return parent ? englishSeo[parent] : undefined;
}
