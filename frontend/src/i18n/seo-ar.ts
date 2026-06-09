type SeoEntry = { title: string; description: string };

const arabicSeo: Record<string, SeoEntry> = {
  '/': {
    title: 'بروتين تونس | واي بروتين، كرياتين ومكملات غذائية',
    description: 'اشتر الواي بروتين والكرياتين والفيتامينات والمكملات الغذائية الأصلية في تونس مع توصيل سريع.',
  },
  '/shop': {
    title: 'متجر البروتين والمكملات الغذائية في تونس',
    description: 'اكتشف مجموعتنا من البروتين والكرياتين والغاينر وBCAA في تونس.',
  },
  '/brands': { title: 'العلامات التجارية', description: 'اكتشف علامات المكملات الغذائية المتوفرة في تونس.' },
  '/packs': { title: 'باقات المكملات الغذائية', description: 'باقات مختارة لمساعدتك على تحقيق أهدافك الرياضية.' },
  '/offres': { title: 'العروض والتخفيضات', description: 'اكتشف أحدث عروض المكملات الغذائية.' },
  '/blog': { title: 'مدونة التغذية والرياضة', description: 'نصائح ومقالات حول التغذية والرياضة والمكملات.' },
  '/faqs': { title: 'الأسئلة الشائعة', description: 'إجابات عن الأسئلة الشائعة حول المنتجات والطلبات والتوصيل.' },
  '/contact': { title: 'اتصل بنا', description: 'تواصل مع فريق بروتين تونس.' },
  '/qui-sommes-nous': { title: 'من نحن', description: 'تعرف على بروتين تونس وخبرتنا في المكملات الغذائية.' },
  '/login': { title: 'تسجيل الدخول', description: 'سجل الدخول إلى حسابك.' },
  '/register': { title: 'إنشاء حساب', description: 'أنشئ حسابك لدى بروتين تونس.' },
  '/forgot-password': { title: 'نسيت كلمة المرور', description: 'استعد الوصول إلى حسابك.' },
  '/account': { title: 'حسابي', description: 'أدر ملفك الشخصي وطلباتك.' },
  '/account/orders': { title: 'طلباتي', description: 'راجع طلباتك السابقة.' },
  '/cart': { title: 'سلة التسوق', description: 'راجع محتويات سلة التسوق.' },
  '/checkout': { title: 'إتمام الطلب', description: 'أكمل طلبك بأمان.' },
  '/favoris': { title: 'المفضلة', description: 'راجع منتجاتك المفضلة.' },
};

export function getArabicSeo(pathname: string): SeoEntry | undefined {
  if (arabicSeo[pathname]) return arabicSeo[pathname];
  const parent = Object.keys(arabicSeo)
    .filter((path) => path !== '/' && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
  return parent ? arabicSeo[parent] : undefined;
}
