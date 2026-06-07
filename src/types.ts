export interface ServiceShowcaseItem {
  id: string;
  type: 'image' | 'video';
  title: string;
  titleEn?: string;
  url: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  category: 'ai_design' | 'music_writing' | 'video_content' | 'apparel_art' | 'web_dev';
  highlight?: boolean;
  imageUrl?: string;
  showcaseFiles?: ServiceShowcaseItem[];
  youtubeUrl?: string;
}

export interface AccessoryBrand {
  id: string;
  name: string;
  nameEn?: string;
  subtitle: string;
  subtitleEn?: string;
  description: string;
  descriptionEn?: string;
  visualUrl: string;
}

export interface ReviewItem {
  id: string;
  name: string;
  nameEn?: string;
  role: string;
  roleEn?: string;
  comment: string;
  commentEn?: string;
  rating: number;
  avatarSeed: string;
  imageUrl?: string;
  pinned?: boolean;
  hidden?: boolean;
}

export interface SptTool {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  icon: string;
  category: string;
  imageUrl?: string;
}

export interface CustomLink {
  id: string;
  title: string;
  titleEn?: string;
  url: string;
  iconName: string;
}

export interface AioProfile {
  name: string;
  nameEn?: string;
  bio: string;
  avatarBg: string;
  accentColor: string;
  links: CustomLink[];
}

export interface SystemConfig {
  bgImage: string;
  glassOpacity: number;
  glassBlur: number;
  neonAccent: 'blue' | 'green' | 'purple' | 'gold';
  
  // Custom Dynamic Text properties requested by user
  siteTitle: string;
  siteSubtitle: string;
  siteMiddleTagline: string;
  siteCreatorSlogan: string;
  aboutSinhalaStory?: string;
  aboutEnglishStory?: string;
  brandGenesisStory?: string;
  brandGenesisStoryEn?: string;
  blogSubtitle?: string;
  blogSubtitleEn?: string;
  reviewsTitle?: string;
  reviewsTitleEn?: string;
  reviewsSubtitle?: string;
  reviewsSubtitleEn?: string;
  submitReviewTitle?: string;
  submitReviewTitleEn?: string;
  submitReviewDesc?: string;
  submitReviewDescEn?: string;
  adminPassword?: string;
  adminRecoveryEmail?: string;
  aboutOwnerPhotoUrl?: string;
  logoUrl?: string;
  reviewsStoryImageUrl?: string;
  showUniverseAnimation?: boolean;
  universeGifUrl?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'moderator' | 'editor';
  permissions: string[];
}

export interface PaymentMethod {
  id: string;
  name: string;
  nameEn?: string;
  details: string; // e.g., Account number, Email, Phone number
  detailsEn?: string;
  qrCodeUrl?: string;
  instructions?: string;
  type: 'bank' | 'googlepay' | 'paypal' | 'other';
  isActive: boolean;
}

export interface SubscriptionPlan {
  id: string;
  title: string;
  titleEn?: string;
  priceUsd: number;
  originalPriceUsd?: number;
  discountTag?: string;
  discountTagEn?: string;
  durationLabel: string;
  durationLabelEn?: string;
  imageUrl?: string;
  perks: string[]; // Sinhala perks
  perksEn?: string[]; // English perks
  isPopular: boolean;
  isFree?: boolean;
}

export interface ContactLinkItem {
  id: string;
  title: string;
  titleEn?: string;
  url: string;
  imageUrl?: string;
}

export interface OfferItem {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  discountBadge?: string;
  discountBadgeEn?: string;
  validUntil?: string;
  promoCode?: string;
  imageUrl?: string;
}

export interface AboutCard {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  icon: string;
  imageUrl?: string;
}

export interface HomeStatCard {
  id: string;
  badge: string;
  badgeEn?: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  imageUrl?: string;
}

export interface TelemetryEvent {
  id: string;
  type: 'pageview' | 'click' | 'signup' | 'contact';
  path: string; // Tab title/path name e.g., 'home', 'services', 'offers', 'tools', 'reviews', 'about'
  elementName?: string; // e.g., 'WhatsApp', 'Newsletter Submit', 'Admin Tab', etc.
  timestamp: string; // ISO string
  sessionToken: string; // identifies simulated / real unique sessions
  ipLocation?: string; // e.g. Colombo, Kandy, Galle, Gampaha
}

export interface SptUser {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  subscriptionStatus: 'trial' | 'pending' | 'active' | 'expired';
  subscriptionPlan?: 'weekly' | 'monthly' | '6months' | 'yearly' | 'lifetime';
  subscriptionExpiresAt?: string;
  receiptUrl?: string;
  paymentReference?: string;
  paymentSubmittedAt?: string;
  profilePictureUrl?: string;
  password?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  titleEn?: string;
  content: string;
  contentEn?: string;
  mediaType: 'none' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  createdAt: string;
  author: string;
  youtubeUrl?: string;
}

export interface SupportMessage {
  id: string;
  email: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'resolved';
}

