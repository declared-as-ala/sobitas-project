export interface Product {
  id: number;
  name: string;
  price: number | null;
  priceText: string | null;
  image: string | null;
  link: string | null;
  category: string | null;
  description: string | null;
}

export const productsData: Product[] = [
  {
    id: 16,
    name: "MASS GAINER ZERO 7KG - ERIC FAVRE",
    price: 300,
    priceText: "300 DT279 DT",
    image: "https://admin.protein.tn/storage/produits/September2023/mass_gainer_zero_7kg_-_eric_favre.webp",
    link: "https://protein.tn/shop/mass-gainer-zero-7kg-eric-favre",
    category: "Prise de Masse",
    description: null
  },
  {
    id: 26,
    name: "SERIOUS MASS 5,45 KG - OPTIMUM NUTRITION",
    price: 400,
    priceText: "400 DT380 DT",
    image: "https://admin.protein.tn/storage/produits/January2026/NqjHvc3rQVXZyLwEuNiJ.webp",
    link: "https://protein.tn/shop/serious-mass-5-45-kg-optimum-nutrition",
    category: "Prise de Masse",
    description: null
  },
  {
    id: 36,
    name: "LEVRO LEGENDARY MASS 6.8KG - KEVIN LEVRONE",
    price: 300,
    priceText: "300 DT279 DT",
    image: "https://admin.protein.tn/storage/produits/September2023/levro_legendary_mass_68kg_-_kevin_levrone.webp",
    link: "https://protein.tn/shop/levro-legendary-mass-6-8kg-kevin-levrone",
    category: "Prise de Masse",
    description: null
  },
  {
    id: 46,
    name: "BIG MONSTER 7 KG - HX NUTRITION",
    price: 280,
    priceText: "280 DT259 DT",
    image: "https://admin.protein.tn/storage/produits/September2023/big_monster_7_kg_-_hx_nutrition.webp",
    link: "https://protein.tn/shop/big-monster-7-kg-hx-nutrition",
    category: "Prise de Masse",
    description: null
  },
  {
    id: 57,
    name: "100% PURE WHEY 2.27KG - BIOTECH USA",
    price: 330,
    priceText: "330 DT289 DT",
    image: "https://admin.protein.tn/storage/produits/January2026/100_pure_whey_227kg_-_biotech_usa.webp",
    link: "https://protein.tn/shop/100-pure-whey-2-27kg-biotech-usa",
    category: "Protéines",
    description: null
  },
  {
    id: 67,
    name: "ISO SENSATION 93 – 2.27KG",
    price: 400,
    priceText: "400 DT359 DT",
    image: "https://admin.protein.tn/storage/produits/May2024/iso_sensation_93_227kg.webp",
    link: "https://protein.tn/shop/iso-sensation-93-2-27kg",
    category: "Protéines",
    description: null
  },
  {
    id: 77,
    name: "ISO HD 2.2KG - BPI SPORTS",
    price: 400,
    priceText: "400 DT359 DT",
    image: "https://admin.protein.tn/storage/produits/July2025/iso_hd_22kg_-_bpi_sports.webp",
    link: "https://protein.tn/shop/iso-hd-2-2kg-bpi-sports",
    category: "Protéines",
    description: null
  },
  {
    id: 87,
    name: "GOLD ISO 2 KG - KEVIN LEVRONE",
    price: 350,
    priceText: "350 DT299 DT",
    image: "https://admin.protein.tn/storage/produits/September2023/gold_iso_2_kg_-_kevin_levrone.webp",
    link: "https://protein.tn/shop/gold-iso-2-kg-kevin-levrone",
    category: "Protéines",
    description: null
  },
  {
    id: 98,
    name: "PACK SECHE EXTREME",
    price: 450,
    priceText: "450 DT399 DT",
    image: "https://admin.protein.tn/storage/produits/April2024/pack_seche_extreme.webp",
    link: "https://protein.tn/shop/pack-seche-extreme",
    category: "Packs",
    description: null
  },
  {
    id: 107,
    name: "PACK PRISE DE MASSE-2",
    price: 450,
    priceText: "450 DT399 DT",
    image: "https://admin.protein.tn/storage/produits/April2024/pack_prise_de_masse-2.webp",
    link: "https://protein.tn/shop/pack-prise-de-masse-2",
    category: "Packs",
    description: null
  },
  {
    id: 116,
    name: "PACK MUSCLE SEC",
    price: 400,
    priceText: "400 DT349 DT",
    image: "https://admin.protein.tn/storage/produits/April2024/pack_muscle_sec.webp",
    link: "https://protein.tn/shop/pack-muscle-sec",
    category: "Packs",
    description: null
  },
  {
    id: 125,
    name: "PACK PRISE DE MASSE",
    price: 400,
    priceText: "400 DT349 DT",
    image: "https://admin.protein.tn/storage/produits/April2024/pack_prise_de_masse.webp",
    link: "https://protein.tn/shop/pack-prise-de-masse",
    category: "Packs",
    description: null
  }
];

export interface Category {
  id: number;
  name: string;
  image: string;
  link: string;
}

export const categoriesData: Category[] = [
  {
    id: 1,
    name: "COMPLÉMENTS ALIMENTAIRES",
    image: "https://protein.tn/assets/img/categories/AcidesAmines.webp",
    link: "https://protein.tn/categorie/complements-alimentaires"
  },
  {
    id: 2,
    name: "PERTE DE POIDS",
    image: "https://protein.tn/assets/img/categories/PerteDuPoids.webp",
    link: "https://protein.tn/categorie/perte-de-poids"
  },
  {
    id: 3,
    name: "PRISE DE MASSE",
    image: "https://protein.tn/assets/img/categories/PriseMasses.webp",
    link: "https://protein.tn/categorie/prise-de-masse"
  },
  {
    id: 4,
    name: "PROTEINES",
    image: "https://protein.tn/assets/img/categories/Proteines.webp",
    link: "https://protein.tn/categorie/proteines"
  },
  {
    id: 5,
    name: "PRE, INTRA & POST WORKOUT",
    image: "https://protein.tn/assets/img/categories/PostWorkout.webp",
    link: "https://protein.tn/categorie/complements-d-entrainement"
  },
  {
    id: 6,
    name: "VETEMENTS ET ACCESSOIRES",
    image: "https://protein.tn/assets/img/categories/VetAccess.webp",
    link: "https://protein.tn/categorie/equipements-et-accessoires-sportifs"
  }
];

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  link: string;
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "Guide Complet de la Nutrition Sportive",
    excerpt: "Découvrez les bases essentielles de la nutrition pour optimiser vos performances.",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    link: "#"
  },
  {
    id: 2,
    title: "Comment Choisir sa Protéine Whey",
    excerpt: "Nos conseils pour sélectionner la meilleure whey selon vos objectifs.",
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&h=600&fit=crop",
    link: "#"
  },
  {
    id: 3,
    title: "Programme Prise de Masse Musculaire",
    excerpt: "Un plan complet pour gagner du muscle de façon efficace et durable.",
    image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop",
    link: "#"
  },
  {
    id: 4,
    title: "Les Meilleurs Compléments Alimentaires",
    excerpt: "Notre sélection des suppléments essentiels pour votre entraînement.",
    image: "https://images.unsplash.com/photo-1556817411-31ae72fa3ea0?w=800&h=600&fit=crop",
    link: "#"
  }
];
