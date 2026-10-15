export interface BannerSlide {
  id: string;
  desktopImage: string;
  mobileImage?: string;
  badgeText: string;
  heading: string;
  subheading: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  order: number;
  createdAt?: any;
}

export interface SocialLinks {
  instagram: string;
  tiktok: string;
  facebook: string;
}

export interface WhyFeature {
  id: string;
  icon: 'crown' | 'clock' | 'shield' | 'package' | 'sparkles' | 'droplet';
  title: string;
  description: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  city: string;
  role?: string;
  rating: number; // 1 to 5
  comment: string;
  isActive: boolean;
}

export interface SectionVisibility {
  showAnnouncementBar: boolean;
  showHeroSlider: boolean;
  showFeaturedProduct: boolean;
  showBrandStory: boolean;
  showWhyFeatures: boolean;
  showTestimonials: boolean;
  showWhatsAppStrip: boolean;
}

export interface SiteSettings {
  id?: string;
  siteTitle: string;
  tagline: string;
  brandStorySnippet: string;
  brandStoryBadge?: string;
  brandStoryTitle?: string;
  brandStoryText2?: string;
  brandStoryImage?: string;
  brandStoryButtonText?: string;
  landscapeLogoUrl: string;
  fullSquareLogoUrl: string;
  iconUrl: string;
  faviconUrl?: string;
  contactPhone: string;
  whatsappNumber: string;
  whatsappRawNumber: string;
  contactEmail: string;
  socialLinks: SocialLinks;
  announcementText: string;
  currency: string;
  currencySymbol: string;
  freeShippingNotice: string;

  // Visibility toggles
  visibility?: SectionVisibility;

  // Hero section settings
  heroFallbackImage?: string;
  heroDefaultBadge?: string;
  heroDefaultHeading?: string;
  heroDefaultSubheading?: string;

  // Featured Product selection
  featuredProductId?: string;
  featuredSectionBadge?: string;
  featuredSectionTitle?: string;

  // Why MUAVER Features
  whyFeatures?: WhyFeature[];

  // Testimonials
  testimonials?: TestimonialItem[];

  // About page content
  aboutBadge?: string;
  aboutTitle?: string;
  aboutSubtitle?: string;
  aboutStoryTitle?: string;
  aboutStoryP1?: string;
  aboutStoryP2?: string;
  aboutStoryImage?: string;
  aboutCreedTitle?: string;
  aboutLaw1Title?: string;
  aboutLaw1Desc?: string;
  aboutLaw2Title?: string;
  aboutLaw2Desc?: string;
  aboutLaw3Title?: string;
  aboutLaw3Desc?: string;

  // Contact page content
  contactBadge?: string;
  contactTitle?: string;
  contactSubtitle?: string;
  contactHours?: string;
  contactDispatchNotice?: string;

  // Footer & Brand content
  footerTagline?: string;
  footerBlurb?: string;
  footerCopyright?: string;
  founderTitle?: string;
  founderName?: string;
  brandStoryFounderTitle?: string;
  brandStoryFounderName?: string;

  // Delivery settings & Shipping configuration
  deliverySettings?: DeliverySettings;

  // Store policies configuration
  policies?: PoliciesConfig;

  // Online Payment Settings
  paymentSettings?: PaymentSettings;
}

export interface PaymentAccount {
  id: string;
  bankName: string; // "Bank / Wallet Name" (e.g. Meezan Bank, Easypaisa, JazzCash)
  accountTitle: string; // "Account Title" (account holder name)
  iban: string; // "IBAN"
  isEnabled: boolean; // active/inactive toggle
  order?: number;
}

export interface PaymentSettings {
  isEnabled: boolean; // "Enable Online Payment" toggle
  slipWhatsAppNumber: string; // WhatsApp number for payment slips (default: +92 324 2404984)
  instructionText: string; // editable instruction text
  accounts: PaymentAccount[];
}

export type ShippingType = 'flat' | 'free_above' | 'free';

export interface DeliverySettings {
  deliveryTimeText: string; // e.g. "2 to 5 working days"
  deliveryCharges: number; // Delivery Charges in PKR (e.g. 250)
  freeDeliveryAbove?: number | null; // Free Delivery Above Amount in PKR (optional, delivery charge becomes 0 if exceeded)
  handlingCharges: number; // Product Handling Charges in PKR (applied per order in addition to delivery)
  shippingType?: ShippingType; // 'flat' | 'free_above' | 'free'
  flatRateAmount?: number; // legacy alias
  freeAboveAmount?: number; // legacy alias
  isEnabled: boolean; // on/off toggle
}

export interface PolicySection {
  title: string;
  content: string;
  isEnabled: boolean;
  lastUpdated?: string;
}

export interface PoliciesConfig {
  'delivery-info': PolicySection;
  'returns': PolicySection;
  'refund-policy': PolicySection;
  'privacy-policy': PolicySection;
  'terms': PolicySection;
  'cod-policy': PolicySection;
}

export type PolicySlug = keyof PoliciesConfig;

export { 
  ADMIN_SETUP, 
  PERMANENT_ADMIN_EMAILS, 
  isPermanentAdminEmail, 
  isPermanentOwnerEmail, 
  isTechnicalSupportEmail 
} from '../config/constants';

export type AdminRole = 'owner' | 'admin';

export interface AdminUser {
  id: string; // lowercase email
  email: string;
  role: AdminRole;
  displayName?: string;
  createdAt: any;
  addedBy?: string;
}

export interface FragranceNotes {
  top: string[];
  heart: string[];
  base: string[];
}

export interface ProductVariant {
  id?: string;
  size: string; // e.g. "30ml", "50ml", "100ml"
  label: string;
  price: number;
  oldPrice?: number; // Optional crossed-out price (PKR)
  salePrice?: number;
  stock?: number;
  inStock: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order?: number;
}

export interface Product {
  id: string;
  name: string;
  edition: string;
  subtitle: string;
  slug: string;
  price: number;
  compareAtPrice?: number; // For sale display
  salePrice?: number;
  sku?: string;
  stockQuantity?: number;
  status?: 'active' | 'draft';
  variants: ProductVariant[];
  inStock: boolean;
  stockStatusText: string;
  category: string;
  shortDescription: string;
  description: string;
  notes: FragranceNotes;
  olfactoryFamily: string;
  concentration: string;
  longevity: string;
  images: string[];
  isFeatured: boolean;
  sillage: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  size: string;
  price: number;
  quantity: number;
}

export interface OrderCustomer {
  fullName: string;
  phone: string;
  city: string;
  address: string;
  notes?: string;
  email?: string;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned';
export type PaymentMethod = 'cod' | 'online' | 'Cash on Delivery (COD)' | 'WhatsApp Order' | 'Bank Transfer';
export type PaymentStatus = 'COD' | 'Awaiting Payment' | 'Payment Verified' | 'Payment Rejected';

export interface CustomerProfile {
  id: string; // Auth UID or Customer ID
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  city?: string;
  address?: string;
  passwordHash?: string;
  authProvider?: 'email' | 'google';
  createdAt: any;
  updatedAt?: any;
}

export type MessageStatus = 'New' | 'Read' | 'Replied';

export interface CustomerMessage {
  id?: string;
  customerId: string; // Customer Auth UID
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  messageText: string;
  orderReference?: string;
  status: MessageStatus;
  adminReply?: string;
  repliedAt?: any;
  repliedBy?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface Order {
  id?: string;
  orderNumber: string;
  customerId?: string; // Logged-in customer Auth UID
  customer: OrderCustomer;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  handlingFee?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod | string;
  paymentStatus?: PaymentStatus | string;
  status: OrderStatus;
  adminNotes?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface CustomerInquiry {
  id?: string;
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: any;
}

export interface ProductReview {
  id?: string;
  productId: string;
  productName?: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  rating: number; // 1 to 5
  reviewText: string;
  createdAt: any;
  updatedAt?: any;
}
