import type {
  Product, Service, Category, Testimonial, Order, Booking, SellerProduct,
  ManagerMetrics, DeveloperStats, User, Conversation, CurrencyRates,
} from "@/types";

export const products: Product[] = [];


export const services: Service[] = [
  {
    id: "s1",
    title: "Senior Full-Stack Web Development",
    description: "I deliver robust, scalable web applications using React, Node.js, and cloud infrastructure. Specialising in SaaS platforms, e-commerce solutions, and API integrations. I bring 8 years of experience shipping production code for startups and enterprises alike.",
    provider: "Sarah Jenkins",
    providerId: "u2",
    avatar: "/images/avatar-1.webp",
    rating: 5.0,
    reviewCount: 142,
    experience: "8 years",
    hourlyRate: 85,
    category: "Development",
    availability: "Available now",
    packages: [
      { name: "Starter", price: 500, delivery: "3 days", description: "Landing page or simple feature" },
      { name: "Standard", price: 1500, delivery: "7 days", description: "Full feature development with testing" },
      { name: "Premium", price: 4000, delivery: "21 days", description: "Complete web application with deployment" },
    ],
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker"],
  },
  {
    id: "s2",
    title: "Commercial Product Photography",
    description: "Professional commercial photography for e-commerce, advertising, and brand campaigns. I have worked with brands across fashion, food, technology, and lifestyle sectors. Studio and on-location shoots available throughout the UK.",
    provider: "David Chen",
    providerId: "u2",
    avatar: "/images/avatar-2.webp",
    rating: 4.9,
    reviewCount: 88,
    experience: "12 years",
    hourlyRate: 120,
    category: "Photography",
    availability: "Next week",
    packages: [
      { name: "Basic", price: 300, delivery: "2 days", description: "10 product shots, white background" },
      { name: "Standard", price: 800, delivery: "5 days", description: "30 shots, lifestyle + studio" },
      { name: "Premium", price: 2000, delivery: "10 days", description: "Full brand campaign, 80+ images" },
    ],
    skills: ["Product Photography", "Retouching", "Lightroom", "Studio Lighting", "Food Photography"],
  },
  {
    id: "s3",
    title: "Business Strategy & Growth Consulting",
    description: "I help founders and executives identify growth opportunities, optimize operations, and make confident strategic decisions. Former McKinsey consultant with experience across 40+ companies in tech, retail, and finance.",
    provider: "Elena Rodriguez",
    providerId: "u2",
    avatar: "/images/avatar-3.webp",
    rating: 4.8,
    reviewCount: 215,
    experience: "15 years",
    hourlyRate: 150,
    category: "Consulting",
    availability: "Available now",
    packages: [
      { name: "Discovery", price: 500, delivery: "1 day", description: "90-minute strategy session + report" },
      { name: "Sprint", price: 2000, delivery: "7 days", description: "Full business audit and roadmap" },
      { name: "Partnership", price: 6000, delivery: "30 days", description: "Ongoing monthly strategy retainer" },
    ],
    skills: ["Business Strategy", "Market Analysis", "OKRs", "Fundraising", "Go-to-Market", "Financial Modeling"],
  },
  {
    id: "s4",
    title: "Digital Marketing & SEO Campaign Management",
    description: "Data-driven digital marketing with a focus on measurable ROI. I manage paid social, Google Ads, and organic SEO campaigns that consistently outperform industry benchmarks. Clients typically see 3x ROAS within 90 days.",
    provider: "Michael Foster",
    providerId: "u2",
    avatar: "/images/avatar-4.webp",
    rating: 4.7,
    reviewCount: 304,
    experience: "6 years",
    hourlyRate: 75,
    category: "Marketing",
    availability: "In 2 days",
    packages: [
      { name: "Audit", price: 250, delivery: "3 days", description: "Full marketing audit and recommendations" },
      { name: "Campaign", price: 1200, delivery: "14 days", description: "Full campaign setup and management" },
      { name: "Retainer", price: 3500, delivery: "30 days", description: "Monthly ongoing management + reporting" },
    ],
    skills: ["Google Ads", "Facebook Ads", "SEO", "Analytics", "Email Marketing", "CRO"],
  },
  {
    id: "s5",
    title: "Financial Planning & Tax Advisory",
    description: "Chartered accountant offering comprehensive financial planning, tax optimization, and compliance services for individuals and SMEs. I help clients legally minimise their tax burden while planning for long-term financial growth.",
    provider: "Robert Hughes",
    providerId: "u2",
    avatar: "/images/avatar-1.webp",
    rating: 4.9,
    reviewCount: 156,
    experience: "20 years",
    hourlyRate: 180,
    category: "Finance",
    availability: "Available now",
    packages: [
      { name: "Consultation", price: 300, delivery: "1 day", description: "60-minute financial review session" },
      { name: "Tax Return", price: 500, delivery: "5 days", description: "Full personal or business tax return" },
      { name: "Annual Plan", price: 4000, delivery: "1 year", description: "Comprehensive year-round financial management" },
    ],
    skills: ["Tax Planning", "HMRC", "Bookkeeping", "Payroll", "VAT Returns", "Business Finance"],
  },
  {
    id: "s6",
    title: "UX/UI Design & Brand Identity",
    description: "Creating digital experiences that delight users and drive conversions. I specialise in product design for SaaS, marketplaces, and consumer apps. My designs consistently test above 85th percentile in usability studies.",
    provider: "Jessica Walsh",
    providerId: "u2",
    avatar: "/images/avatar-2.webp",
    rating: 5.0,
    reviewCount: 94,
    experience: "5 years",
    hourlyRate: 95,
    category: "Design",
    availability: "Available now",
    packages: [
      { name: "Audit", price: 400, delivery: "3 days", description: "UX audit with detailed recommendations" },
      { name: "Design Sprint", price: 2500, delivery: "10 days", description: "End-to-end feature design with prototype" },
      { name: "Brand Identity", price: 5000, delivery: "21 days", description: "Full brand system + design guidelines" },
    ],
    skills: ["Figma", "User Research", "Prototyping", "Design Systems", "Brand Identity", "Accessibility"],
  },
];

export const categories: Category[] = [
  { id: "c1", name: "Electronics", icon: "Monitor", count: 12483 },
  { id: "c2", name: "Fashion", icon: "Shirt", count: 8921 },
  { id: "c3", name: "Home & Living", icon: "Home", count: 6540 },
  { id: "c4", name: "Beauty", icon: "Sparkles", count: 4312 },
  { id: "c5", name: "Sports", icon: "Activity", count: 3891 },
  { id: "c6", name: "Books", icon: "BookOpen", count: 2540 },
  { id: "c7", name: "Freelance Services", icon: "Briefcase", count: 9201 },
  { id: "c8", name: "Digital Products", icon: "Download", count: 5630 },
  { id: "c9", name: "Food & Gourmet", icon: "Coffee", count: 1820 },
  { id: "c10", name: "Auto Parts", icon: "Wrench", count: 3140 },
];

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Amanda Brooks",
    role: "Founder, Bloom Studio",
    avatar: "/images/avatar-1.webp",
    rating: 5,
    text: "Fotizo completely transformed how we source talent for our creative agency. The caliber of professionals here is unmatched.",
  },
  {
    id: "t2",
    name: "James Wilson",
    role: "E-commerce Director",
    avatar: "/images/avatar-3.webp",
    rating: 5,
    text: "We moved our entire product catalog to Fotizo three months ago. Our conversion rates are up 40% and the seller tools are incredibly intuitive.",
  },
  {
    id: "t3",
    name: "Sophia Martinez",
    role: "Independent Consultant",
    avatar: "/images/avatar-4.webp",
    rating: 5,
    text: "As a service provider, I appreciate platforms that value quality over a race to the bottom. Fotizo connects me with serious, committed clients.",
  },
];

export const mockOrders: Order[] = [
  {
    id: "ord-001",
    productId: "p1",
    productTitle: "Sony WH-1000XM5 Wireless Headphones",
    productImage: "/images/product-1.webp",
    seller: "Sony Official",
    price: 348.00,
    quantity: 1,
    status: "delivered",
    date: "2026-06-10",
    trackingNumber: "FTZ-UK-8821934",
  },
  {
    id: "ord-002",
    productId: "p4",
    productTitle: "Leather Classic Tote Bag",
    productImage: "/images/product-4.webp",
    seller: "Artisan Leather",
    price: 245.00,
    quantity: 1,
    status: "in_transit",
    date: "2026-06-28",
    trackingNumber: "FTZ-UK-9940021",
  },
  {
    id: "ord-003",
    productId: "p5",
    productTitle: "Titanium Smart Watch Series 9",
    productImage: "/images/product-5.webp",
    seller: "Tech World",
    price: 499.00,
    quantity: 1,
    status: "processing",
    date: "2026-06-30",
    trackingNumber: null,
  },
];

export const mockBookings: Booking[] = [
  {
    id: "bk-001",
    serviceId: "s3",
    serviceTitle: "Business Strategy & Growth Consulting",
    provider: "Elena Rodriguez",
    providerAvatar: "/images/avatar-3.webp",
    package: "Sprint",
    price: 2000.00,
    status: "confirmed",
    date: "2026-07-05",
    time: "14:00 GMT",
    meetingLink: "https://meet.fotizo.com/bk-001",
  },
  {
    id: "bk-002",
    serviceId: "s1",
    serviceTitle: "Senior Full-Stack Web Development",
    provider: "Sarah Jenkins",
    providerAvatar: "/images/avatar-2.webp",
    package: "Standard",
    price: 1500.00,
    status: "pending",
    date: "2026-07-12",
    time: "10:00 GMT",
    meetingLink: null,
  },
];

export const sellerProducts: SellerProduct[] = [];


export const managerMetrics: ManagerMetrics = {
  totalUsers: 48920,
  newUsersThisMonth: 3241,
  totalTransactions: 182043,
  revenueThisMonth: 842000,
  activeListings: 94201,
  pendingReviews: 34,
  flaggedContent: 12,
  openTickets: 89,
};

export const developerStats: DeveloperStats = {
  apiCalls: 1294003,
  webhooksDelivered: 45821,
  errorRate: 0.12,
  avgLatency: 142,
  activeKeys: 3,
  rateLimit: 10000,
};

// Relocated out of the UI layer (were hardcoded in contexts).
export const MOCK_USERS: (User & { password: string })[] = [
  { id: "u1", name: "Alex Morgan", email: "buyer@fotizo.com", password: "password", role: "buyer", avatar: "/images/avatar-1.webp", joinedAt: "2024-01-15", verified: true },
  { id: "u2", name: "Sarah Jenkins", email: "seller@fotizo.com", password: "password", role: "seller", avatar: "/images/avatar-2.webp", joinedAt: "2023-11-08", verified: true },
  { id: "u3", name: "James Carter", email: "manager@fotizo.com", password: "password", role: "manager", avatar: "/images/avatar-3.webp", joinedAt: "2023-06-01", verified: true },
  { id: "u4", name: "Priya Sharma", email: "developer@fotizo.com", password: "password", role: "developer", avatar: "/images/avatar-4.webp", joinedAt: "2024-03-20", verified: true },
  { id: "u5", name: "Jordan Blake", email: "usa@fotizo.com", password: "password", role: "representative", avatar: "/images/avatar-1.webp", joinedAt: "2024-02-01", verified: true },
];

export const CURRENCY_RATES: CurrencyRates = { GBP: 1, USD: 1.27, GHS: 18.5 };

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv1",
    participantId: "u2",
    participantName: "Sarah Jenkins",
    participantAvatar: "/images/avatar-2.webp",
    participantRole: "Seller",
    subject: "Inquiry about Sony WH-1000XM5",
    lastMessage: "Thanks for reaching out! The headphones are in stock and ready to ship.",
    lastMessageTime: "2026-07-01T14:30:00Z",
    unreadCount: 1,
    messages: [
      { id: "m1", senderId: "u1", senderName: "Alex Morgan", content: "Hi Sarah, I'm interested in the Sony headphones. Are they still available?", timestamp: "2026-07-01T14:00:00Z", read: true },
      { id: "m2", senderId: "u2", senderName: "Sarah Jenkins", senderAvatar: "/images/avatar-2.webp", content: "Thanks for reaching out! The headphones are in stock and ready to ship.", timestamp: "2026-07-01T14:30:00Z", read: false },
    ],
  },
  {
    id: "conv2",
    participantId: "u3",
    participantName: "Elena Rodriguez",
    participantAvatar: "/images/avatar-3.webp",
    participantRole: "Professional",
    subject: "Business Strategy Consultation",
    lastMessage: "I can schedule a 30-minute discovery call on Thursday at 2pm GMT. Does that work?",
    lastMessageTime: "2026-06-30T09:15:00Z",
    unreadCount: 0,
    messages: [
      { id: "m3", senderId: "u1", senderName: "Alex Morgan", content: "Hello Elena, I'd like to discuss your business strategy consulting services.", timestamp: "2026-06-30T08:00:00Z", read: true },
      { id: "m4", senderId: "u3", senderName: "Elena Rodriguez", senderAvatar: "/images/avatar-3.webp", content: "I can schedule a 30-minute discovery call on Thursday at 2pm GMT. Does that work?", timestamp: "2026-06-30T09:15:00Z", read: true },
    ],
  },
];
