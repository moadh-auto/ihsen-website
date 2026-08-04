/**
 * Admin panel language utility
 * Reads from localStorage (fast) with Supabase fallback.
 * Usage in any admin page:
 *   const { lang, t } = useAdminLang();
 */

export type AdminLang = 'ar' | 'fr';

/** All translatable strings for the admin panel */
export const ADMIN_T = {
  ar: {
    // Navigation
    dashboard:    'الرئيسية',
    orders:       'الطلبات',
    products:     'المنتجات',
    delivery:     'التوصيل',
    promos:       'أكواد الخصم',
    messages:     'الرسائل',
    settings:     'الإعدادات',
    viewSite:     'عرض الموقع',
    logout:       'تسجيل الخروج',
    adminPanel:   'لوحة التحكم',

    // Common actions
    save:         'حفظ التغييرات',
    saving:       'جاري الحفظ...',
    add:          'إضافة',
    delete:       'حذف',
    edit:         'تعديل',
    cancel:       'إلغاء',
    confirm:      'تأكيد',
    search:       'بحث...',
    loading:      'جاري التحميل...',
    noData:       'لا توجد بيانات',

    // Settings page
    settingsTitle:    'الإعدادات',
    settingsDesc:     'إدارة الموقع وإعداداته',
    passwordSection:  'كلمة المرور',
    categoriesSection:'فئات المنتجات',
    socialSection:    'مواقع التواصل',
    contactSection:   'قسم التواصل',
    languageSection:  'لغة الموقع',
    adminLangTitle:   'لغة لوحة التحكم',
    adminLangDesc:    'اختر اللغة التي تعمل بها لوحة التحكم',
    adminLangNote:    'تؤثر هذه الإعدادات على واجهة لوحة التحكم فقط، وليس على موقع المتجر.',
    saveLang:         'حفظ اللغة',
    langAr:           'العربية',
    langFr:           'Français',
    currentLang:      'اللغة الحالية',

    // Products
    productsTitle:    'المنتجات',
    addProduct:       'إضافة منتج',
    productName:      'اسم المنتج',
    productPrice:     'السعر',
    productStock:     'المخزون',
    inStock:          'متوفر',
    outOfStock:       'نفذ من المخزون',
    visible:          'مرئي',
    hidden:           'مخفي',
    featured:         'مثبت في الرئيسية',
  },
  fr: {
    // Navigation
    dashboard:    'Tableau de bord',
    orders:       'Commandes',
    products:     'Produits',
    delivery:     'Livraison',
    promos:       'Codes promo',
    messages:     'Messages',
    settings:     'Paramètres',
    viewSite:     'Voir le site',
    logout:       'Déconnexion',
    adminPanel:   'Admin',

    // Common actions
    save:         'Enregistrer',
    saving:       'Enregistrement...',
    add:          'Ajouter',
    delete:       'Supprimer',
    edit:         'Modifier',
    cancel:       'Annuler',
    confirm:      'Confirmer',
    search:       'Rechercher...',
    loading:      'Chargement...',
    noData:       'Aucune donnée',

    // Settings page
    settingsTitle:    'Paramètres',
    settingsDesc:     'Gérer le site et ses configurations',
    passwordSection:  'Mot de passe',
    categoriesSection:'Catégories',
    socialSection:    'Réseaux sociaux',
    contactSection:   'Contact',
    languageSection:  'Langue',
    adminLangTitle:   'Langue du tableau de bord',
    adminLangDesc:    'Choisissez la langue de l\'interface d\'administration',
    adminLangNote:    'Ce paramètre affecte uniquement le tableau de bord, pas le site public.',
    saveLang:         'Enregistrer la langue',
    langAr:           'العربية',
    langFr:           'Français',
    currentLang:      'Langue actuelle',

    // Products
    productsTitle:    'Produits',
    addProduct:       'Ajouter un produit',
    productName:      'Nom du produit',
    productPrice:     'Prix',
    productStock:     'Stock',
    inStock:          'En stock',
    outOfStock:       'Rupture de stock',
    visible:          'Visible',
    hidden:           'Masqué',
    featured:         'Épinglé en accueil',
  },
} as const;

export type TKey = keyof typeof ADMIN_T.ar;

/** Get current admin language synchronously (from localStorage) */
export function getAdminLang(): AdminLang {
  if (typeof window === 'undefined') return 'ar';
  return (localStorage.getItem('ihsen_admin_lang') as AdminLang | null) ?? 'ar';
}

/** Translate a key based on current admin language */
export function tAdmin(key: TKey, lang?: AdminLang): string {
  const l = lang ?? getAdminLang();
  return ADMIN_T[l][key] ?? ADMIN_T.ar[key] ?? key;
}
