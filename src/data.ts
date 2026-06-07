import { ServiceItem, AccessoryBrand, ReviewItem, SptTool } from './types';

export const SPACE_WALLPAPERS = [
  {
    id: 'cosmic_violet',
    name: 'Midnight Orion Nebula',
    url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1600'
  },
  {
    id: 'stellar_green',
    name: 'Teal Stellar Nursery',
    url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=1600'
  },
  {
    id: 'golden_galaxy',
    name: 'Golden Supernova Swirl',
    url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=1600'
  },
  {
    id: 'aqua_aurora',
    name: 'Aqua Aurora Borealis',
    url: 'https://images.unsplash.com/photo-1537210249814-196387768577?q=80&w=1600'
  }
];

export const INITIAL_SERVICES: ServiceItem[] = [
  // Category 1: AI & Digital Design
  {
    id: 's1',
    title: 'AI Commercial Ads',
    description: 'Cinematic ad campaigns & promotional creatives crafted with state-of-the-art vision models.',
    category: 'ai_design',
    highlight: true,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800',
    showcaseFiles: [
      { id: 'sc_s1_1', type: 'image', title: 'Product Launch Cinematic Banner', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800' },
      { id: 'sc_s1_2', type: 'video', title: 'Cyberpunk Drone Advertisement Video Showcase', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ]
  },
  {
    id: 's2',
    title: 'Concept Music Videos',
    description: 'Immersive abstract music videos built to visual sync your acoustic beats with precision.',
    category: 'ai_design'
  },
  {
    id: 's3',
    title: 'Futuristic Short Films',
    description: 'High-fidelity sci-fi narratives and visual storyboards using next-gen generative AI.',
    category: 'ai_design'
  },
  {
    id: 's4',
    title: 'Iconic Logos & Book Covers',
    description: 'Identity designing and book cover arts that speak directly with modern aesthetics.',
    category: 'ai_design'
  },
  // Category 2: Music & Writing
  {
    id: 's5',
    title: 'Melodious Lyrics Design',
    description: 'Rhythmic Sinhala & English lyrics penned to connect with deep emotional and poetic vibes.',
    category: 'music_writing',
    highlight: true,
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800',
    showcaseFiles: [
      { id: 'sc_s5_1', type: 'image', title: 'Unreleased Poetry Sample Sheet', url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800' }
    ]
  },
  {
    id: 's6',
    title: 'Original Music Tracks',
    description: 'Ambient space beats, cinematic instrumental orchestration and customized backing loops.',
    category: 'music_writing'
  },
  {
    id: 's7',
    title: 'Custom AI Voice Songs',
    description: 'Full audio tracks compiled with custom lyrics and tailored vocal characters of choice.',
    category: 'music_writing'
  },
  // Category 3: Video, Photo & Content
  {
    id: 's8',
    title: 'Smartphone Cinematic Video Guides',
    description: 'Professional video-editing & filming blueprints designed exclusively for creator phones.',
    category: 'video_content'
  },
  {
    id: 's9',
    title: 'Bulk Social Media Packages',
    description: 'High-density vertical content packs formatted for TikTok, Reels, & YouTube Shorts.',
    category: 'video_content',
    highlight: true
  },
  {
    id: 's10',
    title: 'Advanced Photo Manipulation',
    description: 'Premium raw grading, complex background removal, and high-contrast color balances.',
    category: 'video_content'
  },
  {
    id: 's11',
    title: 'AI Photoshoots & Models',
    description: 'Commercial catalog styling and modeling without physical studios or expensive cameras.',
    category: 'video_content'
  },
  // Category 4: Clothing & Apparel Art
  {
    id: 's12',
    title: 'T-Shirt Design & Eco-Printing',
    description: 'Streetwear graphic tees and bespoke cotton prints using premium durability inks.',
    category: 'apparel_art',
    highlight: true
  },
  {
    id: 's13',
    title: 'Custom Gift Artworks',
    description: 'Personalized physical stickers, customized canvas prints and custom miniature boxes.',
    category: 'apparel_art'
  },
  {
    id: 's14',
    title: 'Oil & Acrylic Paintings',
    description: 'Original handpainted physical canvases on wood blocks shipped locally with premium framing.',
    category: 'apparel_art'
  },
  // Category 5: Web Design & Development (web_dev)
  {
    id: 's15',
    title: 'Custom Premium Web Designing',
    description: 'Highly interactive, responsive portfolios, blog templates, and business branding pages with customizable neon accents and animation guides.',
    category: 'web_dev',
    highlight: true,
    imageUrl: 'https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=800',
    showcaseFiles: [
      { id: 'sc_s15_1', type: 'image', title: 'Cosmic Portfolio Portal Preview', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=800' },
      { id: 'sc_s15_2', type: 'image', title: 'Live Client Metric Console', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800' },
      { id: 'sc_s15_3', type: 'video', title: 'Animated Micro-Interactions Video Teaser', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ]
  },
  {
    id: 's16',
    title: 'Admin Panels & Fullstack Integrations',
    description: 'Fully connected React dashboards built to allow real-time information edits, local and cloud storage sync, and custom user session panels.',
    category: 'web_dev',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800',
    showcaseFiles: [
      { id: 'sc_s16_1', type: 'image', title: 'Dynamic CMS Admin Controller Preview', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800' }
    ]
  }
];

export const ACCESSORY_BRANDS: AccessoryBrand[] = [
  {
    id: 'brand_kbera',
    name: 'KBERA Clothing',
    subtitle: 'COSMIC STREETWEAR',
    description: 'High-end cybernetic prints and sustainable local streetwear matching the cosmic SPT identity.',
    visualUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800'
  },
  {
    id: 'brand_miniature',
    name: 'Miniature Master',
    subtitle: 'HANDCRAFTED ARCHITECTURES',
    description: 'Stunningly detailed micro-scale physical sculptures and bespoke personalized gifts.',
    visualUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800'
  },
  {
    id: 'brand_phoenix',
    name: 'Phoenix Art Studio',
    subtitle: 'FINE ACRYLICS & CANVAS',
    description: 'Sophisticated interior wall artwork, fine-line ink design, and premium framed masterworks.',
    visualUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800'
  }
];

export const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev1',
    name: 'Kavindu Dilshan',
    role: 'Music Artist & Producer',
    comment: 'The melody backing and custom lyrics Sadeep wrote for my track were unbelievably creative. Beyond solutions for sure!',
    rating: 5,
    avatarSeed: 'kavindu'
  },
  {
    id: 'rev2',
    name: 'Sandeepa Silva',
    role: 'Co-Founder, BoldSpace',
    comment: 'Bulk content design helped us generate over 500k views on TikTok inside 2 weeks. The visual quality is unmatched.',
    rating: 5,
    avatarSeed: 'sandeepa'
  },
  {
    id: 'rev3',
    name: 'Nipuna Perera',
    role: 'Clothing Brand Owner',
    comment: 'KBERA printing quality on our t-shirts is premium caliber. Solid colors, neat stitches. Highly recommended!',
    rating: 5,
    avatarSeed: 'nipuna'
  }
];

export const INITIAL_TOOLS: SptTool[] = [
  {
    id: 'tool_aio',
    name: 'AIO Link Hub',
    description: 'Your ultimate centralized links showcase. Build an interactive linktree live with custom styling.',
    icon: 'Link2',
    category: 'Bio Tool'
  },
  {
    id: 'tool_qr',
    name: 'Cosmic QR Builder',
    description: 'Generate beautiful style-colored QRs for URLs or text with customization and instant high-quality export.',
    icon: 'QrCode',
    category: 'Utility'
  }
];
