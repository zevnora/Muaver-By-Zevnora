import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  updateProfile 
} from 'firebase/auth';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { 
  SiteSettings, 
  Product, 
  Order, 
  CustomerInquiry, 
  BannerSlide, 
  ProductCategory,
  WhyFeature,
  TestimonialItem,
  SectionVisibility,
  DeliverySettings,
  PoliciesConfig,
  PolicySection,
  AdminRole,
  AdminUser,
  ShippingType,
  CustomerProfile,
  CustomerMessage,
  MessageStatus,
  ProductReview,
  PaymentSettings,
  PaymentAccount,
  PaymentStatus
} from '../types/store';
import { 
  ADMIN_SETUP, 
  PERMANENT_ADMIN_EMAILS, 
  isPermanentAdminEmail, 
  isPermanentOwnerEmail, 
  isTechnicalSupportEmail,
  SITE_URL,
  generateSlug
} from '../config/constants';
import royalGoldFront from '../assets/images/royal_gold_front_1791271735003.jpg';
import heroPerfumeBanner from '../assets/images/hero_perfume_banner_1791271723971.jpg';
import perfumeBottleAngle from '../assets/images/perfume_bottle_angle_1791271746230.jpg';
import perfumeIngredientsOud from '../assets/images/perfume_ingredients_oud_1791271758503.jpg';
import bannerEditorial from '../assets/images/banner_editorial_perfume_1791271769326.jpg';

/**
 * Remove undefined values recursively from payload before writing to Firestore
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? removeUndefined(item) : item)) as any;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !(value instanceof Date) && typeof (value as any).toMillis !== 'function') {
      result[key] = removeUndefined(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Delete an image asset from Firebase Storage
 */
export async function deleteStorageImage(imageUrl?: string | null): Promise<void> {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  const isFirebaseStorage =
    imageUrl.includes('firebasestorage.googleapis.com') ||
    imageUrl.includes('.appspot.com') ||
    imageUrl.includes('.firebasestorage.app');

  if (!isFirebaseStorage) return;

  try {
    let storageRef;
    try {
      storageRef = ref(storage, imageUrl);
    } catch {
      const matches = imageUrl.match(/\/o\/([^?]+)/);
      if (matches && matches[1]) {
        storageRef = ref(storage, decodeURIComponent(matches[1]));
      }
    }
    if (storageRef) {
      await deleteObject(storageRef);
    }

    try {
      if (!imageUrl.includes('/thumbs/')) {
        const thumbUrl = imageUrl.replace(/%2F([^%]+)\.([^?]+)/, '%2Fthumbs%2F$1_thumb.$2');
        if (thumbUrl !== imageUrl) {
          let thumbRef;
          try {
            thumbRef = ref(storage, thumbUrl);
          } catch {
            const m = thumbUrl.match(/\/o\/([^?]+)/);
            if (m && m[1]) thumbRef = ref(storage, decodeURIComponent(m[1]));
          }
          if (thumbRef) {
            await deleteObject(thumbRef);
          }
        }
      }
    } catch {
      // Best-effort thumbnail deletion
    }
  } catch (err: any) {
    if (err?.code !== 'storage/object-not-found') {
      console.warn('Storage asset cleanup notice:', err?.message || err);
    }
  }
}

/**
 * Delete multiple image assets from Firebase Storage
 */
export async function deleteStorageImages(imageUrls: string[]): Promise<void> {
  if (!imageUrls || imageUrls.length === 0) return;
  await Promise.allSettled(imageUrls.map((url) => deleteStorageImage(url)));
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  deliveryTimeText: '2 to 5 working days',
  deliveryCharges: 250,
  freeDeliveryAbove: 5000,
  handlingCharges: 100,
  shippingType: 'free_above',
  flatRateAmount: 250,
  freeAboveAmount: 5000,
  isEnabled: true,
};

export const DEFAULT_POLICIES: PoliciesConfig = {
  'delivery-info': {
    title: 'Delivery & Shipping Information',
    content: `All MUAVER fragrance orders are prepared with utmost care and dispatched directly from our Karachi central distribution with inspection seals.\n\n• Standard Delivery Time: 2 to 5 working days nationwide across Karachi, Lahore, Islamabad, Rawalpindi, Peshawar, Quetta, Multan, Faisalabad, and all provincial cities.\n• Express Courier Partners: TCS, Leopards, and PostEx Express with real-time SMS & WhatsApp tracking.\n• Safe Packaging: Every luxury perfume bottle is packed in custom protective boxes to guarantee safe transit.\n• Doorstep Inspection: Parcels carry tamper-evident security seals allowing you to inspect the package before receiving.`,
    isEnabled: true,
    lastUpdated: 'October 2026',
  },
  'returns': {
    title: 'Return and Exchange Policy',
    content: `At MUAVER, we stand behind the quality of our perfumes. If your item arrives damaged or does not match your order, we offer an exchange within 7 calendar days of delivery.\n\n• Eligibility: Items must remain sealed, unopened, and in original packaging with intact security seals due to hygiene standards for perfumes.\n• Process: Contact our WhatsApp customer support (+92 324 2404984) with your order number and unboxing photos.\n• Free Pickup: We arrange convenient return courier pickup across all major cities in Pakistan.`,
    isEnabled: true,
    lastUpdated: 'October 2026',
  },
  'refund-policy': {
    title: 'Refund Policy & Guarantees',
    content: `Your complete satisfaction is our priority at MUAVER.\n\n• Transit Damage or Faulty Atomizer: If verified upon receipt, we immediately dispatch a replacement bottle or process a 100% refund.\n• Refund Channels: Refunds are sent directly via Bank Transfer (IBFT), JazzCash, or Raast within 3 to 5 business days after returning item verification.\n• Inquiries: Contact hellomuaver@gmail.com or message us on WhatsApp for fast assistance.`,
    isEnabled: true,
    lastUpdated: 'October 2026',
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    content: `MUAVER is committed to protecting the privacy of all customers.\n\n• Information Collected: Recipient full name, mobile number, delivery address, and city are collected exclusively to fulfill and deliver your orders.\n• Data Protection: We never sell, rent, or share customer information with third-party advertisers.\n• Order Updates: Order notifications and delivery status alerts are sent via WhatsApp or direct SMS.`,
    isEnabled: true,
    lastUpdated: 'October 2026',
  },
  'terms': {
    title: 'Terms of Service',
    content: `By purchasing from MUAVER, you agree to our standard terms of service.\n\n• Product Quality: All fragrances are formulated at 35% pure perfume oils (Extrait de Parfum) handcrafted in limited batches by Ashar Ul Haq Siddiqui.\n• Order Confirmation: Cash on Delivery orders may be confirmed via phone call or WhatsApp message prior to dispatch to prevent delivery failures.\n• Pricing & Taxes: All prices listed on the site are in Pakistani Rupees (PKR) and inclusive of packaging and applicable sales taxes.`,
    isEnabled: true,
    lastUpdated: 'October 2026',
  },
  'cod-policy': {
    title: 'Cash on Delivery (COD) Policy',
    content: `We offer nationwide Cash on Delivery across Pakistan so you can order with complete peace of mind.\n\n• No Advance Payment: Pay the courier in cash only when the parcel arrives at your doorstep.\n• Inspection Seal: Packages feature a tamper-proof MUAVER seal. You can inspect the outer box before paying.\n• Delivery Readiness: Please keep the exact cash amount ready upon delivery arrival for quick handover.`,
    isEnabled: true,
    lastUpdated: 'October 2026',
  },
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  isEnabled: false,
  slipWhatsAppNumber: '+92 324 2404984',
  instructionText: 'Transfer the exact amount and send your payment slip on WhatsApp. We confirm your order after verification.',
  accounts: [],
};

export const DEFAULT_STATIC_IMAGES = {
  landscapeLogoUrl: 'https://i.ibb.co/8n6t1tQH/Untitled-design.png',
  fullSquareLogoUrl: 'https://i.ibb.co/ynpdPdvP/Full-Logo.png',
  iconUrl: 'https://i.ibb.co/M5Dq0xS9/Icon.png',
  brandStoryImage: 'https://i.ibb.co/bqSSkYh/Whats-App-Image-2026-09-27-at-22-43-46.jpg',
  aboutStoryImage: 'https://i.ibb.co/ynpdPdvP/Full-Logo.png',
  heroFallbackImage: heroPerfumeBanner || '/images/hero_perfume_banner_1791271723971.jpg',
};

export const DEFAULT_WHY_FEATURES: WhyFeature[] = [
  {
    id: 'wf-1',
    icon: 'crown',
    title: 'Authentic',
    description: '100% genuine master perfume extracts and pure perfume oils. Carefully formulated with authentic ingredients.',
  },
  {
    id: 'wf-2',
    icon: 'clock',
    title: 'Long Lasting',
    description: 'Distilled at an extraordinary 35% Extrait de Parfum concentration, delivering 16+ hours of rich, lasting scent.',
  },
  {
    id: 'wf-3',
    icon: 'shield',
    title: 'COD Nationwide',
    description: 'Cash on Delivery across Karachi, Lahore, Islamabad, and all cities throughout Pakistan. Inspect and pay at your doorstep.',
  },
  {
    id: 'wf-4',
    icon: 'package',
    title: 'Premium Packaging',
    description: 'Heavy luxury glass bottle, metallic atomizer spray, and premium presentation box sealed with the signature crest.',
  },
];

export const DEFAULT_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 't-1',
    name: 'Hamza K.',
    city: 'Lahore, Pakistan',
    role: 'Verified Customer',
    rating: 5,
    comment: "The scent lasts incredibly long. The Taif rose and amber notes stayed on my clothes for two full days. Unequivocally international niche quality.",
    isActive: true,
  },
  {
    id: 't-2',
    name: 'Barrister Daniyal R.',
    city: 'Karachi, Pakistan',
    role: 'Verified Customer',
    rating: 5,
    comment: 'Ordered via WhatsApp and received the parcel with Cash on Delivery in Karachi within 48 hours. The heavy bottle and luxury gold box are truly magnificent.',
    isActive: true,
  },
  {
    id: 't-3',
    name: 'Syed Ali Raza',
    city: 'Islamabad, Pakistan',
    role: 'Fragrance Enthusiast',
    rating: 5,
    comment: 'A rich blend of warm oud and Bulgarian rose. This is not just a perfume; it is an aura of royal prestige crafted for distinction.',
    isActive: true,
  },
];

export const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: 'MUAVER | Luxury Brand',
  tagline: 'CRAFTED FOR DISTINCTION By Ashar Ul Haq Siddiqui',
  brandStoryBadge: 'Crafted by Ashar Ul Haq Siddiqui',
  brandStoryTitle: 'CRAFTED FOR DISTINCTION By Ashar Ul Haq Siddiqui',
  brandStorySnippet: 'In an era filled with mass-market, diluted scents, MUAVER was created with a clear royal conviction: to revive high-concentration master perfumery. The emblem — a radiant gold crown poised above the interlocked "MV" monogram, enveloped by laurel flourishes — symbolizes nobility of spirit, precision crafting, and unyielding distinction.',
  brandStoryText2: 'Every fragrance is crafted by Ashar Ul Haq Siddiqui with a generous 35% concentration of pure perfume essences (Extrait de Parfum). This rare saturation allows the notes to unfold organically upon the skin over hours, leaving a lasting presence that commands attention before you utter a single word.',
  brandStoryImage: 'https://i.ibb.co/bqSSkYh/Whats-App-Image-2026-09-27-at-22-43-46.jpg',
  brandStoryButtonText: 'Read Our Story',
  landscapeLogoUrl: 'https://i.ibb.co/8n6t1tQH/Untitled-design.png',
  fullSquareLogoUrl: 'https://i.ibb.co/ynpdPdvP/Full-Logo.png',
  iconUrl: 'https://i.ibb.co/M5Dq0xS9/Icon.png',
  faviconUrl: 'https://i.ibb.co/M5Dq0xS9/Icon.png',
  contactPhone: '+92 324 2404984',
  whatsappNumber: '+92 324 2404984',
  whatsappRawNumber: '923242404984',
  contactEmail: 'hellomuaver@gmail.com',
  socialLinks: {
    instagram: 'https://www.instagram.com/muaver.co',
    tiktok: 'https://www.tiktok.com/@muaver.co',
    facebook: 'https://www.facebook.com/people/Muaver-Luxury-Brand/61592411954625/',
  },
  announcementText: 'Complimentary Cash on Delivery Across Pakistan • Handcrafted in Limited Small Batches',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  freeShippingNotice: 'Free Expedited Delivery on All Orders',

  visibility: {
    showAnnouncementBar: true,
    showHeroSlider: true,
    showFeaturedProduct: true,
    showBrandStory: true,
    showWhyFeatures: true,
    showTestimonials: true,
    showWhatsAppStrip: true,
  },

  heroFallbackImage: '/src/assets/images/hero_perfume_banner_1791271723971.jpg',
  heroDefaultBadge: 'SIGNATURE COLLECTION',
  heroDefaultHeading: 'Crafted for Distinction',
  heroDefaultSubheading: 'High-concentration luxury perfumes, rare ingredients, and long-lasting fragrances made for everyday elegance.',

  featuredProductId: '',
  featuredSectionBadge: 'Featured Fragrance',
  featuredSectionTitle: 'THE SIGNATURE CREATION',

  whyFeatures: DEFAULT_WHY_FEATURES,
  testimonials: DEFAULT_TESTIMONIALS,

  aboutBadge: 'CRAFTED FOR DISTINCTION By Ashar Ul Haq Siddiqui',
  aboutTitle: 'THE MUAVER STORY',
  aboutSubtitle: 'Born out of an unwavering passion for master-grade perfumery and timeless quality.',
  aboutStoryTitle: 'The Story Behind The Imperial Crown',
  aboutStoryP1: 'The insignia of MUAVER tells the story of our philosophy: a sovereign gold crown resting regally above the interlocked "MV" monogram, wrapped in ceremonial laurel flourishes. Metallic gold cast against deep royal navy — a color combination chosen to symbolize authority, depth, and eternal distinction.',
  aboutStoryP2: 'Behind the brand stands Founder & CEO Ashar Ul Haq Siddiqui — dedicated to crafting singular fragrant works of art without compromise, without synthetic shortcuts, and without ordinary formulations.',
  aboutStoryImage: 'https://i.ibb.co/ynpdPdvP/Full-Logo.png',
  aboutCreedTitle: 'OUR THREE STANDARDS OF QUALITY',
  aboutLaw1Title: '35% Extrait Saturation',
  aboutLaw1Desc: 'Formulated at 35% pure perfume oils, ensuring every application produces a deep, persistent aura that endures from day till night.',
  aboutLaw2Title: 'Authentic Botanical Absolutes',
  aboutLaw2Desc: 'We strictly source authentic Bulgarian rose, wild Cambodian agarwood (oud), and aged ambergris without synthetic dilution.',
  aboutLaw3Title: 'Luxury Bottle Design',
  aboutLaw3Desc: 'Each bottle is crafted from heavy luxury glass, topped with an imperial gold crown cap and packaged in a velvet presentation box.',

  contactBadge: 'Customer Support',
  contactTitle: 'CUSTOMER CARE & CONTACT',
  contactSubtitle: 'Our fragrance advisors are at your service for consultations, Cash on Delivery orders, and order status updates.',
  contactHours: 'Mon - Sat: 10:00 AM - 10:00 PM PKT',
  contactDispatchNotice: 'Dispatches courier parcels nationwide directly from Karachi central distribution with inspection seals.',

  footerTagline: 'CRAFTED FOR DISTINCTION By Ashar Ul Haq Siddiqui',
  footerBlurb: 'Crafted with premium fragrance oils, long-lasting performance, and luxurious bottle design for everyday elegance.',
  footerCopyright: '© 2026 MUAVER. All rights reserved. Crafted for Distinction by Ashar Ul Haq Siddiqui.',

  deliverySettings: DEFAULT_DELIVERY_SETTINGS,
  policies: DEFAULT_POLICIES,
  paymentSettings: DEFAULT_PAYMENT_SETTINGS,
};

export const DEFAULT_BANNERS: BannerSlide[] = [
  {
    id: 'banner-1',
    desktopImage: heroPerfumeBanner || '/images/hero_perfume_banner_1791271723971.jpg',
    mobileImage: royalGoldFront || '/images/royal_gold_front_1791271735003.jpg',
    badgeText: 'SIGNATURE COLLECTION',
    heading: 'Crafted for Distinction',
    subheading: 'High-concentration luxury perfumes, rare ingredients, and long-lasting fragrances made for everyday elegance.',
    buttonText: 'Discover Collection',
    buttonLink: 'shop',
    isActive: true,
    order: 1,
  },
  {
    id: 'banner-2',
    desktopImage: bannerEditorial || '/images/banner_editorial_perfume_1791271769326.jpg',
    mobileImage: perfumeBottleAngle || '/images/perfume_bottle_angle_1791271746230.jpg',
    badgeText: 'HAUTE PARFUMERIE BY ASHAR UL HAQ SIDDIQUI',
    heading: 'Long-Lasting Luxury Scents',
    subheading: 'Experience pure 35% Extrait de Parfum concentration crafted with exceptional longevity and projection.',
    buttonText: 'View Fragrance',
    buttonLink: 'product-mv-001',
    isActive: true,
    order: 2,
  },
  {
    id: 'banner-3',
    desktopImage: heroPerfumeBanner || '/images/hero_perfume_banner_1791271723971.jpg',
    mobileImage: perfumeIngredientsOud || '/images/perfume_ingredients_oud_1791271758503.jpg',
    badgeText: 'ARTISANAL EXTRACTION',
    heading: 'Imperial Royal Reserve',
    subheading: 'Gold-infused ambergris, aged wild Taif rose, and precious Cambodian oud. Now available with nationwide Cash on Delivery.',
    buttonText: 'Order on WhatsApp',
    buttonLink: 'whatsapp',
    isActive: true,
    order: 3,
  },
];

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: 'cat-1', name: 'Extrait de Parfum', slug: 'extrait-de-parfum', description: 'Highest concentration luxury extracts (30-35%)', order: 1 },
  { id: 'cat-2', name: 'Eau de Parfum', slug: 'eau-de-parfum', description: 'Classic refined daytime and evening fragrances', order: 2 },
  { id: 'cat-3', name: 'Perfume Oils & Attars', slug: 'royal-attars-oils', description: 'Pure concentrated non-alcoholic perfume essences', order: 3 },
  { id: 'cat-4', name: 'Discovery Sets', slug: 'discovery-sets', description: 'Curated sample collections in luxury gift packaging', order: 4 },
];

// Generic, unbranded luxury perfume bottle images with zero visible brand text or logos
export const DEFAULT_PRODUCT: Product = {
  id: 'mv-001',
  name: 'ROYAL GOLD',
  edition: 'Signature Reserve • Batch N° 01',
  subtitle: 'Extrait de Parfum • 35% Concentration',
  slug: 'royal-gold-extrait-de-parfum',
  price: 2500,
  compareAtPrice: 3500,
  salePrice: 2500,
  sku: 'MV-GOLD-01',
  stockQuantity: 45,
  status: 'active',
  variants: [
    { id: 'v1', size: '50ml', label: '50ml Bottle', price: 2500, oldPrice: 3500, salePrice: 2500, stock: 25, inStock: true },
    { id: 'v2', size: '100ml', label: '100ml Bottle', price: 4500, oldPrice: 6000, salePrice: 4500, stock: 20, inStock: true },
  ],
  inStock: true,
  stockStatusText: 'In Stock • Ready to Ship',
  category: 'Extrait de Parfum',
  shortDescription: 'A warm and captivating blend of golden oud, velvet Bulgarian rose, and amber, bottled in luxury glass.',
  description: 'Crafted for Distinction by Ashar Ul Haq Siddiqui, Royal Gold is a refined and captivating fragrance. Formulated at a concentrated 35% perfume oil strength, each drop radiates warmth, depth, and a lasting scent that stays with you all day.',
  notes: {
    top: ['Calabrian Bergamot', 'Royal Cardamom', 'Pink Peppercorn', 'Saffron'],
    heart: ['Taif Rose Absolue', 'Smoky Frankincense', 'Velvet Orris', 'Cashmere Wood'],
    base: ['Aged Wild Agarwood (Oud)', 'Warm Amber', 'Smoked Vetiver', 'Bourbon Vanilla Bean'],
  },
  olfactoryFamily: 'Woody Amber Floral Royale',
  concentration: 'Extrait de Parfum (35% High-Concentration Essence)',
  longevity: '16+ Hours Long-Lasting',
  sillage: 'Strong & Long-Lasting Projection',
  images: [
    royalGoldFront || '/images/royal_gold_front_1791271735003.jpg',
    perfumeBottleAngle || '/images/perfume_bottle_angle_1791271746230.jpg',
    perfumeIngredientsOud || '/images/perfume_ingredients_oud_1791271758503.jpg',
    heroPerfumeBanner || '/images/hero_perfume_banner_1791271723971.jpg',
  ],
  isFeatured: true,
  seoTitle: 'ROYAL GOLD Extrait de Parfum | MUAVER Luxury Perfumes',
  seoDescription: 'A captivating blend of golden oud, velvet rose, and rich amber crafted by Ashar Ul Haq Siddiqui.',
};

/**
 * Fetch site settings from Firestore (or seed defaults)
/**
 * Convert raw Firestore settings document to SiteSettings.
 * Preserves empty strings ("") and empty arrays ([]), falling back to defaults ONLY when field is undefined/null.
 */
export function parseSiteSettings(data: any): SiteSettings {
  if (!data) return DEFAULT_SETTINGS;

  const resolveText = (val: any, defaultVal: string): string => {
    return val !== undefined && val !== null ? String(val) : defaultVal;
  };

  const resolveOptionalText = (val: any, defaultVal?: string): string | undefined => {
    if (val !== undefined && val !== null) return String(val);
    return defaultVal;
  };

  return {
    ...DEFAULT_SETTINGS,
    siteTitle: resolveText(data.siteTitle, DEFAULT_SETTINGS.siteTitle),
    tagline: resolveText(data.tagline, DEFAULT_SETTINGS.tagline),
    brandStoryBadge: resolveOptionalText(data.brandStoryBadge, DEFAULT_SETTINGS.brandStoryBadge),
    brandStoryTitle: resolveOptionalText(data.brandStoryTitle, DEFAULT_SETTINGS.brandStoryTitle),
    brandStorySnippet: resolveText(data.brandStorySnippet, DEFAULT_SETTINGS.brandStorySnippet),
    brandStoryText2: resolveOptionalText(data.brandStoryText2, DEFAULT_SETTINGS.brandStoryText2),
    brandStoryImage: resolveOptionalText(data.brandStoryImage, DEFAULT_SETTINGS.brandStoryImage),
    brandStoryButtonText: resolveOptionalText(data.brandStoryButtonText, DEFAULT_SETTINGS.brandStoryButtonText),
    landscapeLogoUrl: resolveText(data.landscapeLogoUrl, DEFAULT_SETTINGS.landscapeLogoUrl),
    fullSquareLogoUrl: resolveText(data.fullSquareLogoUrl, DEFAULT_SETTINGS.fullSquareLogoUrl),
    iconUrl: resolveText(data.iconUrl, DEFAULT_SETTINGS.iconUrl),
    faviconUrl: resolveOptionalText(data.faviconUrl, DEFAULT_SETTINGS.faviconUrl),
    contactPhone: resolveText(data.contactPhone, DEFAULT_SETTINGS.contactPhone),
    whatsappNumber: resolveText(data.whatsappNumber, DEFAULT_SETTINGS.whatsappNumber),
    whatsappRawNumber: resolveText(data.whatsappRawNumber, DEFAULT_SETTINGS.whatsappRawNumber),
    contactEmail: resolveText(data.contactEmail, DEFAULT_SETTINGS.contactEmail),
    announcementText: resolveText(data.announcementText, DEFAULT_SETTINGS.announcementText),
    currency: resolveText(data.currency, DEFAULT_SETTINGS.currency),
    currencySymbol: resolveText(data.currencySymbol, DEFAULT_SETTINGS.currencySymbol),
    freeShippingNotice: resolveText(data.freeShippingNotice, DEFAULT_SETTINGS.freeShippingNotice),

    socialLinks: {
      instagram: resolveText(data.socialLinks?.instagram, DEFAULT_SETTINGS.socialLinks.instagram),
      tiktok: resolveText(data.socialLinks?.tiktok, DEFAULT_SETTINGS.socialLinks.tiktok),
      facebook: resolveText(data.socialLinks?.facebook, DEFAULT_SETTINGS.socialLinks.facebook),
    },

    visibility: {
      showAnnouncementBar: data.visibility?.showAnnouncementBar ?? DEFAULT_SETTINGS.visibility?.showAnnouncementBar ?? true,
      showHeroSlider: data.visibility?.showHeroSlider ?? DEFAULT_SETTINGS.visibility?.showHeroSlider ?? true,
      showFeaturedProduct: data.visibility?.showFeaturedProduct ?? DEFAULT_SETTINGS.visibility?.showFeaturedProduct ?? true,
      showBrandStory: data.visibility?.showBrandStory ?? DEFAULT_SETTINGS.visibility?.showBrandStory ?? true,
      showWhyFeatures: data.visibility?.showWhyFeatures ?? DEFAULT_SETTINGS.visibility?.showWhyFeatures ?? true,
      showTestimonials: data.visibility?.showTestimonials ?? DEFAULT_SETTINGS.visibility?.showTestimonials ?? true,
      showWhatsAppStrip: data.visibility?.showWhatsAppStrip ?? DEFAULT_SETTINGS.visibility?.showWhatsAppStrip ?? true,
    },

    heroFallbackImage: resolveOptionalText(data.heroFallbackImage, DEFAULT_SETTINGS.heroFallbackImage),
    heroDefaultBadge: resolveOptionalText(data.heroDefaultBadge, DEFAULT_SETTINGS.heroDefaultBadge),
    heroDefaultHeading: resolveOptionalText(data.heroDefaultHeading, DEFAULT_SETTINGS.heroDefaultHeading),
    heroDefaultSubheading: resolveOptionalText(data.heroDefaultSubheading, DEFAULT_SETTINGS.heroDefaultSubheading),

    featuredProductId: resolveOptionalText(data.featuredProductId, DEFAULT_SETTINGS.featuredProductId),
    featuredSectionBadge: resolveOptionalText(data.featuredSectionBadge, DEFAULT_SETTINGS.featuredSectionBadge),
    featuredSectionTitle: resolveOptionalText(data.featuredSectionTitle, DEFAULT_SETTINGS.featuredSectionTitle),

    whyFeatures: Array.isArray(data.whyFeatures) ? data.whyFeatures : DEFAULT_WHY_FEATURES,
    testimonials: Array.isArray(data.testimonials) ? data.testimonials : DEFAULT_TESTIMONIALS,

    aboutBadge: resolveOptionalText(data.aboutBadge, DEFAULT_SETTINGS.aboutBadge),
    aboutTitle: resolveOptionalText(data.aboutTitle, DEFAULT_SETTINGS.aboutTitle),
    aboutSubtitle: resolveOptionalText(data.aboutSubtitle, DEFAULT_SETTINGS.aboutSubtitle),
    aboutStoryTitle: resolveOptionalText(data.aboutStoryTitle, DEFAULT_SETTINGS.aboutStoryTitle),
    aboutStoryP1: resolveOptionalText(data.aboutStoryP1, DEFAULT_SETTINGS.aboutStoryP1),
    aboutStoryP2: resolveOptionalText(data.aboutStoryP2, DEFAULT_SETTINGS.aboutStoryP2),
    aboutStoryImage: resolveOptionalText(data.aboutStoryImage, DEFAULT_SETTINGS.aboutStoryImage),
    aboutCreedTitle: resolveOptionalText(data.aboutCreedTitle, DEFAULT_SETTINGS.aboutCreedTitle),
    aboutLaw1Title: resolveOptionalText(data.aboutLaw1Title, DEFAULT_SETTINGS.aboutLaw1Title),
    aboutLaw1Desc: resolveOptionalText(data.aboutLaw1Desc, DEFAULT_SETTINGS.aboutLaw1Desc),
    aboutLaw2Title: resolveOptionalText(data.aboutLaw2Title, DEFAULT_SETTINGS.aboutLaw2Title),
    aboutLaw2Desc: resolveOptionalText(data.aboutLaw2Desc, DEFAULT_SETTINGS.aboutLaw2Desc),
    aboutLaw3Title: resolveOptionalText(data.aboutLaw3Title, DEFAULT_SETTINGS.aboutLaw3Title),
    aboutLaw3Desc: resolveOptionalText(data.aboutLaw3Desc, DEFAULT_SETTINGS.aboutLaw3Desc),

    contactBadge: resolveOptionalText(data.contactBadge, DEFAULT_SETTINGS.contactBadge),
    contactTitle: resolveOptionalText(data.contactTitle, DEFAULT_SETTINGS.contactTitle),
    contactSubtitle: resolveOptionalText(data.contactSubtitle, DEFAULT_SETTINGS.contactSubtitle),
    contactHours: resolveOptionalText(data.contactHours, DEFAULT_SETTINGS.contactHours),
    contactDispatchNotice: resolveOptionalText(data.contactDispatchNotice, DEFAULT_SETTINGS.contactDispatchNotice),

    footerTagline: resolveOptionalText(data.footerTagline, DEFAULT_SETTINGS.footerTagline),
    footerBlurb: resolveOptionalText(data.footerBlurb, DEFAULT_SETTINGS.footerBlurb),
    footerCopyright: resolveOptionalText(data.footerCopyright, DEFAULT_SETTINGS.footerCopyright),
    founderTitle: resolveOptionalText(data.founderTitle, DEFAULT_SETTINGS.founderTitle),
    founderName: resolveOptionalText(data.founderName, DEFAULT_SETTINGS.founderName),

    deliverySettings: {
      ...DEFAULT_DELIVERY_SETTINGS,
      ...(data.deliverySettings || {}),
      deliveryCharges: data.deliverySettings?.deliveryCharges ?? data.deliverySettings?.flatRateAmount ?? DEFAULT_DELIVERY_SETTINGS.deliveryCharges,
      freeDeliveryAbove: data.deliverySettings?.freeDeliveryAbove !== undefined ? data.deliverySettings.freeDeliveryAbove : (data.deliverySettings?.freeAboveAmount ?? DEFAULT_DELIVERY_SETTINGS.freeDeliveryAbove),
      handlingCharges: data.deliverySettings?.handlingCharges ?? DEFAULT_DELIVERY_SETTINGS.handlingCharges,
    },
    policies: {
      'delivery-info': { ...DEFAULT_POLICIES['delivery-info'], ...(data.policies?.['delivery-info'] || {}) },
      'returns': { ...DEFAULT_POLICIES['returns'], ...(data.policies?.['returns'] || {}) },
      'refund-policy': { ...DEFAULT_POLICIES['refund-policy'], ...(data.policies?.['refund-policy'] || {}) },
      'privacy-policy': { ...DEFAULT_POLICIES['privacy-policy'], ...(data.policies?.['privacy-policy'] || {}) },
      'terms': { ...DEFAULT_POLICIES['terms'], ...(data.policies?.['terms'] || {}) },
      'cod-policy': { ...DEFAULT_POLICIES['cod-policy'], ...(data.policies?.['cod-policy'] || {}) },
    },
    paymentSettings: data.paymentSettings ? {
      ...DEFAULT_PAYMENT_SETTINGS,
      ...data.paymentSettings,
      accounts: Array.isArray(data.paymentSettings.accounts) ? data.paymentSettings.accounts : [],
    } : DEFAULT_PAYMENT_SETTINGS,
  };
}

/**
 * Fetch site settings from Firestore without mutating document or overriding with defaults
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const docRef = doc(db, 'settings', 'general');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      return parseSiteSettings(snap.data());
    } else {
      await setDoc(docRef, removeUndefined(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.warn('Using default settings due to Firestore read/seed fallback:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update site settings (merge-safe: updates only specified fields, preserving empty strings and deletes)
 */
export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  const docRef = doc(db, 'settings', 'general');
  const payload = removeUndefined({ ...settings });
  await setDoc(docRef, payload, { merge: true });
}

/**
 * Fetch Payment Settings from Firestore ('settings/payment')
 */
export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const docRef = doc(db, 'settings', 'payment');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        ...DEFAULT_PAYMENT_SETTINGS,
        ...data,
        accounts: Array.isArray(data.accounts) ? data.accounts : [],
      };
    }
    return DEFAULT_PAYMENT_SETTINGS;
  } catch (error) {
    console.warn('Using default payment settings due to Firestore read fallback:', error);
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

/**
 * Update Payment Settings in Firestore ('settings/payment')
 */
export async function updatePaymentSettings(paymentSettings: Partial<PaymentSettings>): Promise<void> {
  const docRef = doc(db, 'settings', 'payment');
  await setDoc(docRef, removeUndefined(paymentSettings), { merge: true });
}

/**
 * Real-time subscription to Payment Settings
 */
export function subscribePaymentSettings(
  onUpdate: (settings: PaymentSettings) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, 'settings', 'payment');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          ...DEFAULT_PAYMENT_SETTINGS,
          ...data,
          accounts: Array.isArray(data.accounts) ? data.accounts : [],
        });
      } else {
        onUpdate(DEFAULT_PAYMENT_SETTINGS);
      }
    },
    (err) => {
      console.warn('Payment settings listener warning:', err?.message || err);
      onUpdate(DEFAULT_PAYMENT_SETTINGS);
      if (onError) onError(err);
    }
  );
}

/**
 * One-time initialization helper: Seeds defaults ONLY if store settings document does not exist at all.
 * Never overwrites existing saved content.
 */
export async function initializeStoreDefaultsIfNeeded(): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'general');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, removeUndefined(DEFAULT_SETTINGS));

      const bannerSnap = await getDocs(collection(db, 'banners'));
      if (bannerSnap.empty) {
        for (const banner of DEFAULT_BANNERS) {
          await setDoc(doc(db, 'banners', banner.id), removeUndefined(banner));
        }
      }

      const prodSnap = await getDocs(collection(db, 'products'));
      if (prodSnap.empty) {
        await setDoc(doc(db, 'products', DEFAULT_PRODUCT.id), removeUndefined(DEFAULT_PRODUCT));
      }

      const catSnap = await getDocs(collection(db, 'categories'));
      if (catSnap.empty) {
        for (const cat of DEFAULT_CATEGORIES) {
          await setDoc(doc(db, 'categories', cat.id), removeUndefined(cat));
        }
      }
    }
    // Existing settings: DO NOTHING. NEVER overwrite existing saved content!
  } catch (err) {
    console.warn('Initial store bootstrap notice:', err);
  }
}

/**
 * Real-time subscription to Site Settings (single onSnapshot, no caching, parse preserves empty values)
 */
export function subscribeSiteSettings(
  onUpdate: (settings: SiteSettings) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, 'settings', 'general');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(parseSiteSettings(snap.data()));
      } else {
        initializeStoreDefaultsIfNeeded();
        onUpdate(DEFAULT_SETTINGS);
      }
    },
    (err) => {
      console.warn('Settings live listener notice:', err?.message || err);
      onUpdate(DEFAULT_SETTINGS);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time subscription to Hero Banners
 */
export function subscribeBanners(
  onUpdate: (banners: BannerSlide[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, 'banners');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const banners: BannerSlide[] = [];
      snapshot.forEach((d) => {
        const item = { id: d.id, ...d.data() } as BannerSlide;
        if (!item.desktopImage || item.desktopImage.includes('unsplash.com') || item.desktopImage.includes('1791195') || (item.desktopImage.includes('/src/assets/images/') && !item.desktopImage.includes('17912717'))) {
          item.desktopImage = DEFAULT_BANNERS[0].desktopImage;
        }
        if (!item.mobileImage || item.mobileImage.includes('unsplash.com') || item.mobileImage.includes('1791195') || (item.mobileImage.includes('/src/assets/images/') && !item.mobileImage.includes('17912717'))) {
          item.mobileImage = DEFAULT_BANNERS[0].mobileImage;
        }
        banners.push(item);
      });
      banners.sort((a, b) => (a.order || 0) - (b.order || 0));
      onUpdate(banners);
    },
    (err) => {
      console.warn('Banners live listener notice:', err?.message || err);
      onUpdate(DEFAULT_BANNERS);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch hero banners from Firestore (one-time fetch)
 */
export async function getBanners(): Promise<BannerSlide[]> {
  try {
    const colRef = collection(db, 'banners');
    const snap = await getDocs(colRef);
    const banners: BannerSlide[] = [];
    snap.forEach((d) => {
      const item = { id: d.id, ...d.data() } as BannerSlide;
      if (!item.desktopImage || item.desktopImage.includes('unsplash.com') || item.desktopImage.includes('1791195') || (item.desktopImage.includes('/src/assets/images/') && !item.desktopImage.includes('17912717'))) {
        item.desktopImage = DEFAULT_BANNERS[0].desktopImage;
      }
      if (!item.mobileImage || item.mobileImage.includes('unsplash.com') || item.mobileImage.includes('1791195') || (item.mobileImage.includes('/src/assets/images/') && !item.mobileImage.includes('17912717'))) {
        item.mobileImage = DEFAULT_BANNERS[0].mobileImage;
      }
      banners.push(item);
    });
    return banners.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.warn('Error fetching banners:', error);
    return DEFAULT_BANNERS;
  }
}

/**
 * Save or update a banner slide
 */
export async function saveBannerSlide(banner: BannerSlide): Promise<void> {
  if (!banner.heading || !banner.heading.trim()) {
    throw new Error('Banner heading is required.');
  }
  if (!banner.desktopImage || !banner.desktopImage.trim()) {
    throw new Error('Banner desktop image is required.');
  }

  const docId = banner.id && banner.id.trim() ? banner.id.trim() : `banner-${Date.now()}`;
  const docRef = doc(db, 'banners', docId);
  const data = removeUndefined({
    ...banner,
    id: docId,
    order: typeof banner.order === 'number' ? banner.order : 1,
    isActive: banner.isActive !== false,
    updatedAt: serverTimestamp(),
  });
  await setDoc(docRef, data, { merge: true });
}

/**
 * Delete a banner slide and purge its images from Firebase Storage
 */
export async function deleteBannerSlide(bannerId: string): Promise<void> {
  if (!bannerId) throw new Error('Banner ID is required for deletion.');
  const docRef = doc(db, 'banners', bannerId);

  // 1. Purge images from Firebase Storage
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as BannerSlide;
      const urls = [data.desktopImage, data.mobileImage].filter(Boolean) as string[];
      if (urls.length > 0) {
        await deleteStorageImages(urls);
      }
    }
  } catch (err) {
    console.warn('Storage image cleanup notice on banner delete:', err);
  }

  // 2. Permanently delete document from Firestore
  await deleteDoc(docRef);
}

/**
 * Reorder banners batch update
 */
export async function updateBannersOrder(banners: BannerSlide[]): Promise<void> {
  for (let i = 0; i < banners.length; i++) {
    const b = banners[i];
    const docRef = doc(db, 'banners', b.id);
    await updateDoc(docRef, { order: i + 1 });
  }
}

/**
 * Categories management
 */
export async function getCategories(): Promise<ProductCategory[]> {
  try {
    const colRef = collection(db, 'categories');
    const snap = await getDocs(colRef);
    const cats: ProductCategory[] = [];
    snap.forEach((d) => {
      cats.push({ id: d.id, ...d.data() } as ProductCategory);
    });
    return cats.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.warn('Using default categories fallback:', error);
    return DEFAULT_CATEGORIES;
  }
}

export async function saveCategory(category: ProductCategory): Promise<void> {
  const docId = category.id || `cat-${Date.now()}`;
  const docRef = doc(db, 'categories', docId);
  await setDoc(docRef, removeUndefined({ ...category, id: docId }), { merge: true });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  if (!categoryId) throw new Error('Category ID is required for deletion.');
  const docRef = doc(db, 'categories', categoryId);
  await deleteDoc(docRef);
}

/**
 * Real-time subscription to Products catalog
 */
export function subscribeProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, 'products');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const products: Product[] = [];
      snapshot.forEach((d) => {
        const item = { id: d.id, ...d.data() } as Product;
        products.push(item);
      });
      onUpdate(products);
    },
    (err) => {
      console.warn('Products live listener notice:', err?.message || err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch products from Firestore (one-time fetch)
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const colRef = collection(db, 'products');
    const snap = await getDocs(colRef);
    const products: Product[] = [];
    snap.forEach((d) => {
      const item = { id: d.id, ...d.data() } as Product;
      products.push(item);
    });
    return products;
  } catch (error) {
    console.warn('Error fetching products:', error);
    return [];
  }
}

/**
 * Save or update a product
 */
export async function saveProduct(product: Product): Promise<Product> {
  if (!product.name || !product.name.trim()) {
    throw new Error('Product name is required.');
  }
  if (!product.images || product.images.length === 0) {
    throw new Error('At least one product image is required.');
  }

  const docId = product.id && product.id.trim() ? product.id.trim() : `mv-${Date.now()}`;
  const docRef = doc(db, 'products', docId);
  const data = removeUndefined({
    ...product,
    id: docId,
    status: product.status || 'active',
    updatedAt: serverTimestamp(),
  });
  await setDoc(docRef, data, { merge: true });

  // Re-read document directly to verify stored value
  const reReadSnap = await getDoc(docRef);
  if (reReadSnap.exists()) {
    return { id: reReadSnap.id, ...reReadSnap.data() } as Product;
  }
  return { ...product, id: docId };
}

/**
 * Delete a product and purge its images from Firebase Storage
 */
export async function deleteProduct(productId: string): Promise<void> {
  if (!productId) throw new Error('Product ID is required for deletion.');
  const docRef = doc(db, 'products', productId);

  // 1. Purge images from Firebase Storage
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Product;
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        await deleteStorageImages(data.images);
      }
    }
  } catch (err) {
    console.warn('Storage image cleanup notice on product delete:', err);
  }

  // 2. Permanently delete document from Firestore
  await deleteDoc(docRef);
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  if (!id) return null;
  try {
    const docRef = doc(db, 'products', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Product;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching product by ID:', err);
    return null;
  }
}

/**
 * Fetch a single product by Slug or fallback ID
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase().trim();
  try {
    const colRef = collection(db, 'products');
    const q = query(colRef, where('slug', '==', cleanSlug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Product;
    }
    // Also fallback check if the slug is actually the doc ID (for backward compatibility)
    return await getProductById(slug);
  } catch (err) {
    console.warn('Error fetching product by slug:', err);
    return null;
  }
}

/**
 * Real-time subscription to a single product by slug or doc ID
 */
export function subscribeProductBySlugOrId(
  identifier: string,
  onUpdate: (product: Product | null) => void,
  onError?: (error: Error) => void
): () => void {
  const clean = (identifier || '').toLowerCase().trim();
  const colRef = collection(db, 'products');

  // Query by slug
  const q = query(colRef, where('slug', '==', clean));
  return onSnapshot(
    q,
    async (snapshot) => {
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        onUpdate({ id: d.id, ...d.data() } as Product);
        return;
      }
      // If not found by slug, fallback to checking by document ID
      try {
        const docRef = doc(db, 'products', identifier);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          onUpdate({ id: docSnap.id, ...docSnap.data() } as Product);
          return;
        }
      } catch {}
      onUpdate(null);
    },
    (err) => {
      console.warn('Live listener error for product slug/id:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Generate a guaranteed unique slug for a product across all existing products
 */
export function makeUniqueSlug(
  baseNameOrSlug: string,
  existingProducts: Product[],
  currentProductId?: string
): string {
  const base = generateSlug(baseNameOrSlug) || 'perfume';
  let candidate = base;
  let counter = 2;

  const isTaken = (testSlug: string) =>
    existingProducts.some(
      (p) =>
        (p.id !== currentProductId) &&
        (p.slug || generateSlug(p.name)) === testSlug
    );

  while (isTaken(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }

  return candidate;
}

/**
 * Real-time subscription to Orders
 */
export function subscribeOrders(
  onUpdate: (orders: Order[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, 'orders');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((d) => {
        orders.push({ id: d.id, ...d.data() } as Order);
      });
      orders.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || 0)).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || 0)).getTime();
        return timeB - timeA;
      });
      onUpdate(orders);
    },
    (err) => {
      console.error('Orders live listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch all orders from Firestore sorted by date
 */
export async function getOrders(): Promise<Order[]> {
  try {
    const colRef = collection(db, 'orders');
    const snap = await getDocs(colRef);
    const orders: Order[] = [];
    snap.forEach((d) => {
      orders.push({ id: d.id, ...d.data() } as Order);
    });
    // Sort descending by date (newest first)
    return orders.sort((a, b) => {
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (new Date(a.createdAt || 0)).getTime();
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (new Date(b.createdAt || 0)).getTime();
      return timeB - timeA;
    });
  } catch (error) {
    console.warn('Error fetching orders:', error);
    return [];
  }
}

/**
 * Place an order in Firestore with:
 * 1. Snapshot of product name, price, size, and image at purchase time
 * 2. Automatic stock deduction for each product variant and overall inventory
 */
export async function createOrder(
  orderPayload: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'> & {
    orderNumber?: string;
    paymentStatus?: PaymentStatus | string;
  }
): Promise<{ orderId: string; orderNumber: string }> {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const orderNumber = orderPayload.orderNumber || `MV-${randomSuffix}`;

  // Normalize payment method and initial payment status
  const rawMethod = (orderPayload.paymentMethod || 'cod').toLowerCase();
  const paymentMethod = rawMethod.includes('online') || rawMethod === 'online' || rawMethod.includes('bank') ? 'online' : 'cod';
  const paymentStatus = orderPayload.paymentStatus || (paymentMethod === 'online' ? 'Awaiting Payment' : 'COD');

  // 1. Snapshot items ensuring purchase-time price, name, and image are frozen
  const snapshottedItems = orderPayload.items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    productImage: item.productImage,
    size: item.size,
    price: Number(item.price),
    quantity: Number(item.quantity),
  }));

  const newOrder: Omit<Order, 'id'> = {
    ...orderPayload,
    items: snapshottedItems,
    orderNumber,
    paymentMethod,
    paymentStatus,
    status: 'Pending',
    createdAt: serverTimestamp(),
  };

  const colRef = collection(db, 'orders');
  const docRef = await addDoc(colRef, removeUndefined(newOrder));

  // 2. Automatically reduce stock in products
  try {
    for (const item of snapshottedItems) {
      if (!item.productId) continue;
      const productRef = doc(db, 'products', item.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const prodData = productSnap.data() as Product;
        const updatedVariants = (prodData.variants || []).map((v) => {
          if (v.size === item.size) {
            const currentStock = v.stock !== undefined ? v.stock : 20;
            const newStock = Math.max(0, currentStock - item.quantity);
            return {
              ...v,
              stock: newStock,
              inStock: newStock > 0,
            };
          }
          return v;
        });

        const currentTotalStock = prodData.stockQuantity !== undefined ? prodData.stockQuantity : 40;
        const newTotalStock = Math.max(0, currentTotalStock - item.quantity);
        const hasAnyStock = updatedVariants.some((v) => v.inStock) || newTotalStock > 0;

        await updateDoc(productRef, {
          variants: updatedVariants,
          stockQuantity: newTotalStock,
          inStock: hasAnyStock,
          stockStatusText: hasAnyStock
            ? 'In Stock • Limited Royal Batch Allocated'
            : 'Currently Out of Stock • Joining Waiting List',
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (stockError) {
    console.warn('Stock decrement note during order creation:', stockError);
  }

  return {
    orderId: docRef.id,
    orderNumber,
  };
}

/**
 * Update order status and handle inventory restoration on cancellation
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: Order['status'],
  adminNotes?: string
): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) return;

  const currentOrder = orderSnap.data() as Order;
  const previousStatus = currentOrder.status;

  const updateData: any = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };
  if (adminNotes !== undefined) {
    updateData.adminNotes = adminNotes;
  }

  await updateDoc(orderRef, updateData);

  // If order was transitioned TO 'Cancelled' from an active status, restore stock!
  if (newStatus === 'Cancelled' && previousStatus !== 'Cancelled') {
    try {
      for (const item of currentOrder.items || []) {
        if (!item.productId) continue;
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const prodData = productSnap.data() as Product;
          const updatedVariants = (prodData.variants || []).map((v) => {
            if (v.size === item.size) {
              const currentStock = v.stock !== undefined ? v.stock : 0;
              const newStock = currentStock + (item.quantity || 1);
              return {
                ...v,
                stock: newStock,
                inStock: true,
              };
            }
            return v;
          });

          const currentTotalStock = prodData.stockQuantity !== undefined ? prodData.stockQuantity : 0;
          const newTotalStock = currentTotalStock + (item.quantity || 1);

          await updateDoc(productRef, {
            variants: updatedVariants,
            stockQuantity: newTotalStock,
            inStock: true,
            stockStatusText: 'In Stock • Limited Royal Batch Allocated',
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (restoreError) {
      console.warn('Stock restore note on order cancellation:', restoreError);
    }
  } else if (previousStatus === 'Cancelled' && newStatus !== 'Cancelled') {
    // If order was uncancelled, deduct stock again
    try {
      for (const item of currentOrder.items || []) {
        if (!item.productId) continue;
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const prodData = productSnap.data() as Product;
          const updatedVariants = (prodData.variants || []).map((v) => {
            if (v.size === item.size) {
              const currentStock = v.stock !== undefined ? v.stock : 0;
              const newStock = Math.max(0, currentStock - (item.quantity || 1));
              return {
                ...v,
                stock: newStock,
                inStock: newStock > 0,
              };
            }
            return v;
          });

          const currentTotalStock = prodData.stockQuantity !== undefined ? prodData.stockQuantity : 0;
          const newTotalStock = Math.max(0, currentTotalStock - (item.quantity || 1));

          await updateDoc(productRef, {
            variants: updatedVariants,
            stockQuantity: newTotalStock,
            inStock: newTotalStock > 0,
            stockStatusText: newTotalStock > 0
              ? 'In Stock • Limited Royal Batch Allocated'
              : 'Currently Out of Stock • Joining Waiting List',
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (deductError) {
      console.warn('Stock deduction note on reinstating order:', deductError);
    }
  }
}

/**
 * Update payment status of an order (COD, Awaiting Payment, Payment Verified, Payment Rejected)
 * Only updates the paymentStatus field as specified.
 */
export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<void> {
  if (!orderId) throw new Error('Order ID is required to update payment status.');
  const docRef = doc(db, 'orders', orderId);
  await updateDoc(docRef, {
    paymentStatus,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an order
 */
export async function deleteOrder(orderId: string): Promise<void> {
  if (!orderId) throw new Error('Order ID is required for deletion.');
  const docRef = doc(db, 'orders', orderId);
  await deleteDoc(docRef);
}

/**
 * Submit contact inquiry to Firestore
 */
export async function submitContactInquiry(inquiry: {
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  const colRef = collection(db, 'inquiries');
  return await addDoc(colRef, {
    ...inquiry,
    createdAt: serverTimestamp(),
  });
}

/**
 * Build prefilled WhatsApp ordering link
 */
export function buildWhatsAppOrderUrl(
  productName: string,
  size: string,
  quantity: number,
  price: number,
  productUrl?: string,
  rawPhone: string = '923242404984'
): string {
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const totalPrice = price * quantity;
  const currentUrl = productUrl || (typeof window !== 'undefined' ? window.location.href : `${SITE_URL}/shop`);

  const message = [
    `Assalam-o-Alaikum MUAVER Royale Concierge,`,
    `I would like to place an order for:`,
    `• Product: ${productName}`,
    `• Variant: ${size}`,
    `• Quantity: ${quantity}`,
    `• Price: Rs. ${totalPrice.toLocaleString()}`,
    `• Link: ${currentUrl}`,
    ``,
    `Please confirm availability and dispatch details for Cash on Delivery. Thank you!`
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Build general concierge WhatsApp link
 */
export function buildGeneralWhatsAppUrl(rawPhone: string = '923242404984'): string {
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const message = `Assalam-o-Alaikum MUAVER Customer Support,\nI would like to inquire about your fragrances and placing an order.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export interface OrderChargesCalculation {
  subtotal: number;
  deliveryCharges: number;
  handlingCharges: number;
  isFreeDelivery: boolean;
  totalAmount: number;
}

/**
 * Calculate live order charges based on admin settings:
 * - Subtotal
 * - Product Handling Charges (applied per order in addition to delivery)
 * - Delivery Charges (replaced by 0 if Free Delivery Above Amount is met)
 * - Total = Subtotal + Handling Charges + Delivery Charges
 */
export function calculateOrderCharges(
  subtotal: number,
  deliverySettings?: DeliverySettings
): OrderChargesCalculation {
  const ds = deliverySettings || DEFAULT_DELIVERY_SETTINGS;

  const handlingCharges = Number(ds.handlingCharges ?? 0);
  const baseDelivery = Number(ds.deliveryCharges ?? ds.flatRateAmount ?? 250);

  const freeThreshold = ds.freeDeliveryAbove !== undefined && ds.freeDeliveryAbove !== null
    ? Number(ds.freeDeliveryAbove)
    : (ds.freeAboveAmount ? Number(ds.freeAboveAmount) : null);

  let deliveryCharges = baseDelivery;
  let isFreeDelivery = false;

  if (ds.isEnabled === false || ds.shippingType === 'free') {
    deliveryCharges = 0;
    isFreeDelivery = true;
  } else if (freeThreshold !== null && freeThreshold > 0 && subtotal >= freeThreshold) {
    deliveryCharges = 0;
    isFreeDelivery = true;
  }

  const totalAmount = subtotal + handlingCharges + deliveryCharges;

  return {
    subtotal,
    deliveryCharges,
    handlingCharges,
    isFreeDelivery,
    totalAmount,
  };
}

export function calculateShippingFee(
  subtotal: number,
  deliverySettings?: DeliverySettings
): number {
  return calculateOrderCharges(subtotal, deliverySettings).deliveryCharges;
}

/**
 * =========================================================================
 * ADMIN ACCESS & ROLES MANAGEMENT (Strictly Firestore collection "admins")
 * =========================================================================
 */

/**
 * Ensures an admins document with role "owner" exists in the Firestore "admins" collection
 * for hellomuaver@gmail.com without creating duplicates. Checks first before creating.
 */
export async function ensurePermanentOwnerDocExists(): Promise<void> {
  try {
    const ownerEmail = ADMIN_SETUP.permanentOwner.email.toLowerCase().trim();
    const docRef = doc(db, 'admins', ownerEmail);
    const snap = await getDoc(docRef).catch(() => null);

    if (snap && snap.exists()) {
      const data = snap.data();
      if (data?.role !== 'owner') {
        await updateDoc(docRef, { role: 'owner' }).catch(() => {});
      }
      return;
    }

    // Secondary check: query by email field in case it was keyed by another ID
    const q = query(collection(db, 'admins'), where('email', '==', ownerEmail));
    const querySnap = await getDocs(q).catch(() => null);

    if (querySnap && !querySnap.empty) {
      const existingDoc = querySnap.docs[0];
      const existingData = existingDoc.data();
      await setDoc(
        docRef,
        {
          id: ownerEmail,
          email: ownerEmail,
          role: 'owner',
          displayName: existingData.displayName || ADMIN_SETUP.permanentOwner.displayName,
          createdAt: existingData.createdAt || serverTimestamp(),
          addedBy: existingData.addedBy || 'Permanent Owner Setup',
        },
        { merge: true }
      ).catch(() => {});

      if (existingDoc.id.toLowerCase() !== ownerEmail) {
        deleteDoc(doc(db, 'admins', existingDoc.id)).catch(() => {});
      }
      return;
    }

    // Document does not exist anywhere: create canonical document
    await setDoc(docRef, {
      id: ownerEmail,
      email: ownerEmail,
      role: 'owner',
      displayName: ADMIN_SETUP.permanentOwner.displayName,
      createdAt: serverTimestamp(),
      addedBy: 'Permanent Owner Setup',
    }).catch((err) => {
      console.warn('Could not auto-create permanent owner doc:', err);
    });
  } catch (err) {
    console.warn('ensurePermanentOwnerDocExists notice:', err);
  }
}

/**
 * Real-time subscription to Admins collection
 */
export function subscribeAdmins(
  onUpdate: (admins: AdminUser[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Always trigger permanent owner doc check in Firestore
  ensurePermanentOwnerDocExists().catch(() => {});

  const colRef = collection(db, 'admins');
  return onSnapshot(
    colRef,
    (snapshot) => {
      // Deduplicate all admins strictly by normalized lowercase email
      const map = new Map<string, AdminUser>();

      snapshot.forEach((d) => {
        const data = d.data();
        const rawEmail = (data.email || (d.id.includes('@') ? d.id : '')).toLowerCase().trim();
        if (!rawEmail) return;

        const isEmailDoc = d.id.toLowerCase() === rawEmail;
        const isOwnerAccount = isPermanentOwnerEmail(rawEmail);
        const adminObj: AdminUser = {
          id: rawEmail,
          email: rawEmail,
          role: isOwnerAccount ? 'owner' : (data.role || 'admin'),
          displayName: isOwnerAccount ? ADMIN_SETUP.permanentOwner.displayName : (data.displayName || rawEmail.split('@')[0]),
          createdAt: data.createdAt,
          addedBy: data.addedBy,
        };

        // Prefer canonical email document ID
        if (!map.has(rawEmail) || isEmailDoc) {
          map.set(rawEmail, adminObj);
        }

        // Clean up legacy non-email / UID document from Firestore so it never duplicates
        if (!isEmailDoc) {
          deleteDoc(doc(db, 'admins', d.id)).catch(() => {});
        }
      });

      // Ensure permanent owner is always present in the returned list
      const ownerEmail = ADMIN_SETUP.permanentOwner.email.toLowerCase();
      if (!map.has(ownerEmail)) {
        map.set(ownerEmail, {
          id: ownerEmail,
          email: ownerEmail,
          role: 'owner',
          displayName: ADMIN_SETUP.permanentOwner.displayName,
          createdAt: null,
          addedBy: 'Permanent Owner Setup',
        });
      }

      const list = Array.from(map.values()).sort((a, b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (a.role !== 'owner' && b.role === 'owner') return 1;
        return a.email.localeCompare(b.email);
      });

      onUpdate(list);
    },
    (err) => {
      console.warn('Admins live listener notice:', err);
      // Fallback: provide permanent owner & support accounts
      onUpdate([
        {
          id: ADMIN_SETUP.permanentOwner.email.toLowerCase(),
          email: ADMIN_SETUP.permanentOwner.email.toLowerCase(),
          role: 'owner' as AdminRole,
          displayName: ADMIN_SETUP.permanentOwner.displayName,
          createdAt: null,
          addedBy: 'Permanent Owner Setup',
        },
        ...ADMIN_SETUP.technicalSupport.map((acc) => ({
          id: acc.email.toLowerCase(),
          email: acc.email.toLowerCase(),
          role: 'owner' as AdminRole,
          displayName: acc.displayName,
          createdAt: null,
          addedBy: 'Technical Support Access',
        })),
      ]);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch all registered admins from the 'admins' collection (Deduplicated by email)
 */
export async function getAdmins(): Promise<AdminUser[]> {
  try {
    // Ensure permanent owner doc exists in Firestore
    ensurePermanentOwnerDocExists().catch(() => {});

    const colRef = collection(db, 'admins');
    const snap = await getDocs(colRef).catch(() => null);
    const map = new Map<string, AdminUser>();

    if (snap) {
      snap.forEach((d) => {
        const data = d.data();
        const rawEmail = (data.email || (d.id.includes('@') ? d.id : '')).toLowerCase().trim();
        if (!rawEmail) return;

        const isEmailDoc = d.id.toLowerCase() === rawEmail;
        const isOwnerAccount = isPermanentOwnerEmail(rawEmail);
        const adminObj: AdminUser = {
          id: rawEmail,
          email: rawEmail,
          role: isOwnerAccount ? 'owner' : (data.role || 'admin'),
          displayName: isOwnerAccount ? ADMIN_SETUP.permanentOwner.displayName : (data.displayName || rawEmail.split('@')[0]),
          createdAt: data.createdAt,
          addedBy: data.addedBy,
        };

        if (!map.has(rawEmail) || isEmailDoc) {
          map.set(rawEmail, adminObj);
        }

        // Clean up legacy non-email / UID document from Firestore so it never duplicates
        if (!isEmailDoc) {
          deleteDoc(doc(db, 'admins', d.id)).catch(() => {});
        }
      });
    }

    // Ensure permanent owner is always present in the returned directory
    const ownerEmail = ADMIN_SETUP.permanentOwner.email.toLowerCase();
    if (!map.has(ownerEmail)) {
      map.set(ownerEmail, {
        id: ownerEmail,
        email: ownerEmail,
        role: 'owner',
        displayName: ADMIN_SETUP.permanentOwner.displayName,
        createdAt: null,
        addedBy: 'Permanent Owner Setup',
      });
    }

    // Sort owners first, then alphabetical by email
    return Array.from(map.values()).sort((a, b) => {
      if (a.role === 'owner' && b.role !== 'owner') return -1;
      if (a.role !== 'owner' && b.role === 'owner') return 1;
      return a.email.localeCompare(b.email);
    });
  } catch (error) {
    console.error('Error fetching admins collection:', error);
    return [
      {
        id: ADMIN_SETUP.permanentOwner.email.toLowerCase(),
        email: ADMIN_SETUP.permanentOwner.email.toLowerCase(),
        role: 'owner' as AdminRole,
        displayName: ADMIN_SETUP.permanentOwner.displayName,
        createdAt: null,
        addedBy: 'Permanent Owner Setup',
      },
      ...ADMIN_SETUP.technicalSupport.map((acc) => ({
        id: acc.email.toLowerCase(),
        email: acc.email.toLowerCase(),
        role: 'owner' as AdminRole,
        displayName: acc.displayName,
        createdAt: null,
        addedBy: 'Technical Support Access',
      })),
    ];
  }
}

/**
 * Fetch a specific admin user document by email or UID
 */
export async function getAdminUser(emailOrUid: string): Promise<AdminUser | null> {
  if (!emailOrUid) return null;
  const cleanKey = emailOrUid.trim().toLowerCase();

  // If permanent owner, return synthesized owner immediately
  if (isPermanentOwnerEmail(cleanKey)) {
    return {
      id: cleanKey,
      email: cleanKey,
      role: 'owner',
      displayName: ADMIN_SETUP.permanentOwner.displayName,
      createdAt: null,
      addedBy: 'Permanent Owner Setup',
    };
  }

  // If technical support account, return synthesized owner immediately
  if (isTechnicalSupportEmail(cleanKey)) {
    const supportAcc = ADMIN_SETUP.technicalSupport.find((s) => s.email.toLowerCase() === cleanKey);
    return {
      id: cleanKey,
      email: cleanKey,
      role: 'owner',
      displayName: supportAcc?.displayName || cleanKey.split('@')[0],
      createdAt: null,
      addedBy: 'Technical Support Access',
    };
  }

  try {
    // 1. Try direct key (email or UID)
    let snap = await getDoc(doc(db, 'admins', cleanKey)).catch(() => null);
    if (!snap?.exists() && cleanKey.includes('@')) {
      // 2. Try normalized lowercase email
      snap = await getDoc(doc(db, 'admins', cleanKey.toLowerCase())).catch(() => null);
    }
    if (snap && snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        email: data.email || (cleanKey.includes('@') ? cleanKey.toLowerCase() : snap.id),
        role: data.role || 'admin',
        displayName: data.displayName || data.email || cleanKey,
        createdAt: data.createdAt,
        addedBy: data.addedBy,
      };
    }
    return null;
  } catch (error) {
    console.warn(`Error getting admin user for ${cleanKey}:`, error);
    return null;
  }
}

/**
 * Verify user admin access or bootstrap the first "owner" on fresh setup.
 * Access check order:
 * 1. FIRST: Check if signed-in email is in PERMANENT_ADMIN_EMAILS (always allow with full owner access).
 *    - When a technical support account logs in: check if admins/hellomuaver@gmail.com exists and create it if missing.
 *    - When hellomuaver@gmail.com logs in: check if admins/hellomuaver@gmail.com exists and create it if missing.
 * 2. SECOND: Fall back to checking "admins" Firestore collection for any other admin emails added later.
 * 3. THIRD: If collection is empty, bootstrap first owner.
 */
export async function verifyOrBootstrapAdmin(user: {
  email: string;
  displayName?: string | null;
  uid?: string;
}): Promise<{ isAuthorized: boolean; admin: AdminUser | null; isFirstOwnerCreated: boolean; errorReason?: string }> {
  if (!user || !user.email) {
    return { isAuthorized: false, admin: null, isFirstOwnerCreated: false, errorReason: 'No authenticated email provided.' };
  }

  const cleanEmail = user.email.trim().toLowerCase();

  // -------------------------------------------------------------
  // 1. HARDCODED OWNER & TECHNICAL SUPPORT CHECK
  // -------------------------------------------------------------
  if (isPermanentAdminEmail(cleanEmail)) {
    const isOwnerAccount = isPermanentOwnerEmail(cleanEmail);
    const defaultDisplayName = isOwnerAccount
      ? ADMIN_SETUP.permanentOwner.displayName
      : ADMIN_SETUP.technicalSupport.find((s) => s.email.toLowerCase() === cleanEmail)?.displayName ||
        user.displayName ||
        cleanEmail.split('@')[0];

    const permanentAdmin: AdminUser = {
      id: cleanEmail,
      email: cleanEmail,
      role: 'owner',
      displayName: defaultDisplayName,
      createdAt: serverTimestamp(),
      addedBy: isOwnerAccount ? 'Permanent Owner' : 'Technical Support Access',
    };

    // Make sure an admins document with role "owner" exists in the Firestore "admins" collection
    // for hellomuaver@gmail.com without duplicate creation:
    // When a technical support account logs in, check whether admins/hellomuaver@gmail.com exists and create it if missing;
    // Also when hellomuaver@gmail.com itself logs in, create its own admins document if missing.
    try {
      await ensurePermanentOwnerDocExists();

      // If a legacy UID doc exists in Firestore for this user, clean it up so each admin appears cleanly
      if (user.uid && user.uid !== cleanEmail) {
        const legacyUidRef = doc(db, 'admins', user.uid);
        deleteDoc(legacyUidRef).catch(() => {});
      }
    } catch (persistErr) {
      console.warn('Permanent owner doc verification notice:', persistErr);
    }

    return {
      isAuthorized: true,
      admin: permanentAdmin,
      isFirstOwnerCreated: false,
    };
  }

  // -------------------------------------------------------------
  // 2. FIRESTORE "admins" COLLECTION CHECK (For other added admins)
  // -------------------------------------------------------------
  try {
    const existingAdmin = (await getAdminUser(cleanEmail)) || (user.uid ? await getAdminUser(user.uid) : null);
    if (existingAdmin) {
      // Clean up legacy UID doc if present
      if (user.uid && user.uid !== cleanEmail) {
        const legacyUidRef = doc(db, 'admins', user.uid);
        deleteDoc(legacyUidRef).catch(() => {});
      }

      return { isAuthorized: true, admin: existingAdmin, isFirstOwnerCreated: false };
    }

    // 3. Check if the admins collection is empty (fresh setup bootstrap)
    try {
      const adminsColRef = collection(db, 'admins');
      const existingAdminsSnap = await getDocs(adminsColRef);

      if (existingAdminsSnap.empty) {
        // First login on fresh setup! Create first Owner document keyed by cleanEmail.
        const newOwner: AdminUser = {
          id: cleanEmail,
          email: cleanEmail,
          role: 'owner',
          displayName: user.displayName || cleanEmail,
          createdAt: serverTimestamp(),
          addedBy: 'Initial Setup Bootstrap',
        };

        const adminDocRef = doc(db, 'admins', cleanEmail);
        await setDoc(adminDocRef, newOwner);

        // Record setup initialization in settings/security to lock bootstrapping
        try {
          const securityDocRef = doc(db, 'settings', 'security');
          await setDoc(securityDocRef, {
            initialOwner: cleanEmail,
            initializedAt: serverTimestamp(),
          }, { merge: true });
        } catch (secErr) {
          console.warn('Security metadata flag write notice:', secErr);
        }

        return {
          isAuthorized: true,
          admin: newOwner,
          isFirstOwnerCreated: true,
        };
      }
    } catch (colErr) {
      console.warn('Admins collection read notice during bootstrap check:', colErr);
    }

    // 4. Collection is not empty and user is not in admins collection -> Reject entry
    return {
      isAuthorized: false,
      admin: null,
      isFirstOwnerCreated: false,
      errorReason: `Access Denied: The account "${cleanEmail}" is not listed in the authorized administrators registry. Only designated Owner and Admin accounts may access the admin panel.`,
    };
  } catch (error: any) {
    console.error('Error verifying admin authorization:', error);
    return {
      isAuthorized: false,
      admin: null,
      isFirstOwnerCreated: false,
      errorReason: error.message || 'Authorization check failed.',
    };
  }
}

/**
 * Add a new administrator or owner (Owner privilege)
 */
export async function addAdminUser(
  email: string,
  role: AdminRole,
  addedBy: string,
  displayName?: string
): Promise<AdminUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  const docRef = doc(db, 'admins', cleanEmail);
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    throw new Error(`Administrator with email "${cleanEmail}" already exists.`);
  }

  const newAdmin: AdminUser = {
    id: cleanEmail,
    email: cleanEmail,
    role,
    displayName: displayName?.trim() || cleanEmail.split('@')[0],
    createdAt: serverTimestamp(),
    addedBy: addedBy.toLowerCase().trim(),
  };

  await setDoc(docRef, newAdmin);
  return newAdmin;
}

/**
 * Update an admin's role (Owner privilege)
 * Prevents demoting permanent owners or the last owner!
 */
export async function updateAdminRole(
  email: string,
  newRole: AdminRole,
  requesterEmail: string
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();

  // Permanent owners can never be demoted
  if (isPermanentAdminEmail(cleanEmail) && newRole !== 'owner') {
    throw new Error('Operation Blocked: Permanent owner accounts cannot be demoted.');
  }

  const docRef = doc(db, 'admins', cleanEmail);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error('Administrator record not found.');
  }

  const currentData = snap.data() as AdminUser;

  // If demoting from owner to admin, check if there are other owners
  if (currentData.role === 'owner' && newRole === 'admin') {
    const allAdmins = await getAdmins();
    const ownerCount = allAdmins.filter((a) => a.role === 'owner').length;
    if (ownerCount <= 1) {
      throw new Error('Operation Blocked: You cannot demote the last remaining Owner. At least one Owner must exist to manage admin access.');
    }
  }

  await updateDoc(docRef, {
    role: newRole,
    updatedAt: serverTimestamp(),
    updatedBy: requesterEmail.toLowerCase().trim(),
  });
}

/**
 * Remove an administrator from the admins collection (Owner privilege)
 * Prevents removing permanent owners or the last owner!
 */
export async function removeAdminUser(
  email: string,
  requesterEmail: string
): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();

  // Permanent owners can never be removed
  if (isPermanentAdminEmail(cleanEmail)) {
    throw new Error('Operation Blocked: Permanent owner accounts cannot be removed.');
  }

  const docRef = doc(db, 'admins', cleanEmail);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error('Administrator record not found.');
  }

  const targetAdmin = snap.data() as AdminUser;

  // If target is an owner, verify there is at least one other owner
  if (targetAdmin.role === 'owner') {
    const allAdmins = await getAdmins();
    const ownerCount = allAdmins.filter((a) => a.role === 'owner').length;
    if (ownerCount <= 1) {
      throw new Error('Operation Blocked: You cannot remove the last remaining Owner. The system requires at least one active Owner to maintain console control.');
    }
  }

  await deleteDoc(docRef);
}

/**
 * ---------------------------------------------------------
 * CUSTOMER ACCOUNTS & AUTHENTICATION (Separate from Admin)
 * ---------------------------------------------------------
 */

/**
 * Browser-compatible SHA-256 password hash for resilient customer authentication
 */
async function hashCustomerPassword(password: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const enc = new TextEncoder();
      const data = enc.encode(password + '_muaver_salt_2025');
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('SubtleCrypto notice, using fallback hash:', e);
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

/**
 * Fetch a customer profile by UID
 */
export async function getCustomerProfile(uid: string): Promise<CustomerProfile | null> {
  try {
    const docRef = doc(db, 'customers', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as CustomerProfile;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching customer profile:', err);
    return null;
  }
}

/**
 * Fetch a customer profile by email address
 */
export async function getCustomerProfileByEmail(email: string): Promise<CustomerProfile | null> {
  try {
    const colRef = collection(db, 'customers');
    const q = query(colRef, where('email', '==', email.trim().toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as CustomerProfile;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching customer profile by email:', err);
    return null;
  }
}

/**
 * Save or update customer profile
 */
export async function saveCustomerProfile(profile: Partial<CustomerProfile> & { uid: string }): Promise<void> {
  const docRef = doc(db, 'customers', profile.uid);
  const data = removeUndefined({
    ...profile,
    id: profile.uid,
    updatedAt: serverTimestamp(),
  });
  await setDoc(docRef, data, { merge: true });

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('muaver_customer_session');
      if (stored) {
        const curr = JSON.parse(stored);
        if (curr.uid === profile.uid || curr.id === profile.uid) {
          const merged = { ...curr, ...profile };
          localStorage.setItem('muaver_customer_session', JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent('muaver-customer-auth-changed', { detail: merged }));
        }
      }
    } catch (e) {
      console.warn('Error syncing updated profile to localStorage:', e);
    }
  }
}

/**
 * Register a new customer with email and password
 * Resilient to Firebase Auth provider status (e.g. auth/operation-not-allowed)
 */
export async function registerCustomer(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  city?: string;
  address?: string;
}): Promise<CustomerProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPhone = params.phone.trim();
  const cleanName = params.fullName.trim();
  const cleanCity = params.city?.trim() || '';
  const cleanAddress = params.address?.trim() || '';

  // 1. Check if an account already exists with this email in the 'customers' collection
  try {
    const existing = await getCustomerProfileByEmail(cleanEmail);
    if (existing) {
      const err: any = new Error('This email address is already registered. Please log in instead or continue with Google.');
      err.code = 'auth/email-already-in-use';
      throw err;
    }
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      throw err;
    }
  }

  let userUid: string = '';
  let authSucceeded = false;
  const passwordHash = await hashCustomerPassword(params.password);

  // 2. Attempt standard Firebase Authentication account creation
  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
    userUid = cred.user.uid;
    authSucceeded = true;
    try {
      await updateProfile(cred.user, { displayName: cleanName });
    } catch {
      // displayName sync best effort
    }
  } catch (authErr: any) {
    if (authErr?.code === 'auth/email-already-in-use') {
      throw authErr;
    }
    if (authErr?.code === 'auth/invalid-email' || authErr?.code === 'auth/weak-password') {
      throw authErr;
    }
    // For auth/operation-not-allowed or disabled provider in Firebase console:
    // Generate deterministic/unique customer UID
    console.info('Firebase Auth registration notice (operating in persistent Firestore customer mode):', authErr?.code);
    userUid = 'cust_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }

  const profileData: CustomerProfile = {
    id: userUid,
    uid: userUid,
    email: cleanEmail,
    fullName: cleanName,
    phone: cleanPhone,
    city: cleanCity,
    address: cleanAddress,
    passwordHash,
    authProvider: authSucceeded ? 'email' : 'email',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // 3. Write document to 'customers' Firestore collection with UID as document ID
  const customerDocRef = doc(db, 'customers', userUid);
  await setDoc(customerDocRef, removeUndefined(profileData));

  const returnProfile: CustomerProfile = {
    ...profileData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 4. Save session in localStorage and dispatch event for immediate app state sync
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muaver_customer_session', JSON.stringify(returnProfile));
      window.dispatchEvent(new CustomEvent('muaver-customer-auth-changed', { detail: returnProfile }));
    } catch (e) {
      console.warn('Error saving customer session:', e);
    }
  }

  return returnProfile;
}

/**
 * Customer sign in with email & password
 * Resilient to Firebase Auth provider status (e.g. auth/operation-not-allowed)
 */
export async function loginCustomer(email: string, password: string): Promise<CustomerProfile> {
  const cleanEmail = email.trim().toLowerCase();
  let profile: CustomerProfile | null = null;

  // 1. First attempt Firebase Auth signInWithEmailAndPassword
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = cred.user;
    profile = await getCustomerProfile(user.uid);
    if (!profile) {
      profile = await getCustomerProfileByEmail(cleanEmail);
    }
    if (!profile) {
      // If for any reason the document wasn't found, initialize it with available auth data
      const newProfile: CustomerProfile = {
        id: user.uid,
        uid: user.uid,
        email: user.email || cleanEmail,
        fullName: user.displayName || cleanEmail.split('@')[0],
        phone: user.phoneNumber || '',
        city: '',
        address: '',
        authProvider: 'email',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'customers', user.uid), removeUndefined(newProfile));
      profile = {
        ...newProfile,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  } catch (authErr: any) {
    console.info('Firebase Auth sign-in notice (checking Firestore customer directory):', authErr?.code);

    const existingDoc = await getCustomerProfileByEmail(cleanEmail);
    if (!existingDoc) {
      if (authErr?.code === 'auth/wrong-password') {
        const err: any = new Error('The password you entered is incorrect. Please try again.');
        err.code = 'auth/wrong-password';
        throw err;
      }
      const err: any = new Error('No registered account found with this email. Please check your spelling or choose "Sign Up" above.');
      err.code = 'auth/user-not-found';
      throw err;
    }

    // Verify password hash
    const computedHash = await hashCustomerPassword(password);
    if (existingDoc.passwordHash && existingDoc.passwordHash !== computedHash) {
      const err: any = new Error('The password you entered is incorrect. Please try again.');
      err.code = 'auth/wrong-password';
      throw err;
    }

    profile = existingDoc;
  }

  if (!profile) {
    const err: any = new Error('Invalid email or password.');
    err.code = 'auth/invalid-credential';
    throw err;
  }

  // Save session to localStorage & broadcast
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muaver_customer_session', JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('muaver-customer-auth-changed', { detail: profile }));
    } catch (e) {
      console.warn('Error saving customer session to localStorage:', e);
    }
  }

  return profile;
}

/**
 * Customer sign in with Google Popup
 * Returns profile and whether a phone number is still missing
 */
export async function loginCustomerWithGoogle(): Promise<{ profile: CustomerProfile; isMissingPhone: boolean }> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  const user = cred.user;

  let profile = await getCustomerProfile(user.uid);
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const displayName = user.displayName || 'MUAVER Patron';

  if (!profile) {
    profile = await getCustomerProfileByEmail(cleanEmail);
  }

  if (!profile) {
    const newProfile: CustomerProfile = {
      id: user.uid,
      uid: user.uid,
      email: cleanEmail,
      fullName: displayName,
      phone: user.phoneNumber || '',
      city: '',
      address: '',
      authProvider: 'google',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'customers', user.uid), removeUndefined(newProfile));
    profile = {
      ...newProfile,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('muaver_customer_session', JSON.stringify(profile));
      window.dispatchEvent(new CustomEvent('muaver-customer-auth-changed', { detail: profile }));
    } catch (e) {
      console.warn('Error saving customer session to localStorage:', e);
    }
  }

  const isMissingPhone = !profile.phone || profile.phone.trim() === '';
  return { profile, isMissingPhone };
}

/**
 * Real-time subscription to all customers (Admin console in /adminAUHS)
 */
export function subscribeCustomers(
  onUpdate: (customers: CustomerProfile[]) => void,
  onError?: (err: any) => void
): () => void {
  const colRef = collection(db, 'customers');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: CustomerProfile[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CustomerProfile);
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Customers live listener notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch all registered customers from 'customers' collection (Admin console)
 */
export async function getCustomers(): Promise<CustomerProfile[]> {
  try {
    const colRef = collection(db, 'customers');
    const snap = await getDocs(colRef);
    const list: CustomerProfile[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as CustomerProfile);
    });
    list.sort((a, b) => {
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    return list;
  } catch (err) {
    console.error('Error fetching customers directory:', err);
    throw err;
  }
}

/**
 * Log out customer
 */
export async function logoutCustomer(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('muaver_customer_session');
      window.dispatchEvent(new CustomEvent('muaver-customer-auth-changed', { detail: null }));
    } catch (e) {
      console.warn('Error clearing customer session:', e);
    }
  }
  try {
    await signOut(auth);
  } catch {
    // best-effort
  }
}

/**
 * Real-time subscription to customer's own orders
 */
export function subscribeCustomerOrders(
  customerId: string,
  onUpdate: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'orders');
  const q = query(colRef, where('customerId', '==', customerId));
  return onSnapshot(
    q,
    (snap) => {
      const orders: Order[] = [];
      snap.forEach((d) => {
        orders.push({ id: d.id, ...d.data() } as Order);
      });
      orders.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      onUpdate(orders);
    },
    (err) => {
      console.warn('Customer orders listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * ---------------------------------------------------------
 * CUSTOMER MESSAGES TO ADMIN CONCIERGE
 * ---------------------------------------------------------
 */

/**
 * Send a message from logged-in customer to store
 */
export async function sendCustomerMessage(data: {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  messageText: string;
  orderReference?: string;
}): Promise<string> {
  if (!data.messageText.trim()) {
    throw new Error('Message text cannot be empty.');
  }

  const payload: Omit<CustomerMessage, 'id'> = {
    customerId: data.customerId,
    customerName: data.customerName.trim(),
    customerEmail: data.customerEmail.trim().toLowerCase(),
    customerPhone: data.customerPhone?.trim() || '',
    messageText: data.messageText.trim(),
    orderReference: data.orderReference?.trim() || '',
    status: 'New',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const colRef = collection(db, 'messages');
  const docRef = await addDoc(colRef, removeUndefined(payload));
  return docRef.id;
}

/**
 * Real-time subscription to messages for a specific customer
 */
export function subscribeCustomerMessages(
  customerId: string,
  onUpdate: (messages: CustomerMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'messages');
  const q = query(colRef, where('customerId', '==', customerId));
  return onSnapshot(
    q,
    (snap) => {
      const msgs: CustomerMessage[] = [];
      snap.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as CustomerMessage);
      });
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      onUpdate(msgs);
    },
    (err) => {
      console.warn('Customer messages listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time subscription to ALL messages (for Admin in /adminAUHS)
 */
export function subscribeAllMessages(
  onUpdate: (messages: CustomerMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'messages');
  return onSnapshot(
    colRef,
    (snap) => {
      const msgs: CustomerMessage[] = [];
      snap.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as CustomerMessage);
      });
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      onUpdate(msgs);
    },
    (err) => {
      console.warn('All messages listener error in admin:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Admin reply to customer message
 */
export async function replyToCustomerMessage(
  messageId: string,
  replyText: string,
  adminEmail: string
): Promise<void> {
  if (!replyText.trim()) {
    throw new Error('Reply text cannot be empty.');
  }
  const docRef = doc(db, 'messages', messageId);
  await updateDoc(docRef, {
    adminReply: replyText.trim(),
    status: 'Replied',
    repliedAt: serverTimestamp(),
    repliedBy: adminEmail.trim(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Admin mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  const docRef = doc(db, 'messages', messageId);
  await updateDoc(docRef, {
    status: 'Read',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a customer message (Admin or Customer owner)
 */
export async function deleteCustomerMessage(messageId: string): Promise<void> {
  const docRef = doc(db, 'messages', messageId);
  await deleteDoc(docRef);
}

/**
 * ---------------------------------------------------------
 * CUSTOMER PRODUCT REVIEWS
 * ---------------------------------------------------------
 */

/**
 * Submit or update a customer review for a perfume.
 * Enforces one review per customer per product.
 */
export async function submitProductReview(data: {
  id?: string;
  productId: string;
  productName?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  reviewText: string;
}): Promise<string> {
  if (!data.productId) throw new Error('Product ID is required.');
  if (!data.customerId) throw new Error('Customer ID is required.');
  if (!data.reviewText.trim()) throw new Error('Review text cannot be empty.');
  const clampedRating = Math.min(5, Math.max(1, Math.round(Number(data.rating) || 5)));

  // If specific review doc ID provided, update it
  if (data.id) {
    const docRef = doc(db, 'reviews', data.id);
    await updateDoc(docRef, {
      rating: clampedRating,
      reviewText: data.reviewText.trim(),
      customerName: data.customerName.trim(),
      updatedAt: serverTimestamp(),
    });
    return data.id;
  }

  // Check if an existing review already exists for this (productId, customerId)
  const colRef = collection(db, 'reviews');
  const q = query(
    colRef,
    where('productId', '==', data.productId),
    where('customerId', '==', data.customerId)
  );
  const snap = await getDocs(q);

  if (!snap.empty) {
    // Update existing review document
    const existingDoc = snap.docs[0];
    await updateDoc(doc(db, 'reviews', existingDoc.id), {
      rating: clampedRating,
      reviewText: data.reviewText.trim(),
      customerName: data.customerName.trim(),
      updatedAt: serverTimestamp(),
    });
    return existingDoc.id;
  }

  // Create new review
  const payload: Omit<ProductReview, 'id'> = {
    productId: data.productId,
    productName: data.productName?.trim() || '',
    customerId: data.customerId,
    customerName: data.customerName.trim(),
    customerEmail: data.customerEmail?.trim().toLowerCase() || '',
    rating: clampedRating,
    reviewText: data.reviewText.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const newDocRef = await addDoc(colRef, removeUndefined(payload));
  return newDocRef.id;
}

/**
 * Real-time listener for reviews belonging to a single product.
 * Returns reviews sorted newest first.
 */
export function subscribeProductReviews(
  productId: string,
  onUpdate: (reviews: ProductReview[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'reviews');
  const q = query(colRef, where('productId', '==', productId));

  return onSnapshot(
    q,
    (snap) => {
      const list: ProductReview[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ProductReview);
      });
      // Sort newest first
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Product reviews listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for ALL reviews across the store (for /adminAUHS moderation).
 * Returns reviews sorted newest first.
 */
export function subscribeAllReviews(
  onUpdate: (reviews: ProductReview[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, 'reviews');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: ProductReview[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ProductReview);
      });
      // Sort newest first
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('All reviews listener error in admin:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Delete a product review by ID (Admin or owner)
 */
export async function deleteProductReview(reviewId: string): Promise<void> {
  if (!reviewId) return;
  const docRef = doc(db, 'reviews', reviewId);
  await deleteDoc(docRef);
}


