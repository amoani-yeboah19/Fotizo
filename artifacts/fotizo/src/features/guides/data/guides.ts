// Static content for the Guides hub — a lightweight blog/resource center.
// No backend needed; when a CMS lands this can be swapped for a service call.

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export interface Guide {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readingTime: string;
  image: string;
  popular?: boolean;
  content: GuideBlock[];
}

export const GUIDE_TOPICS = [
  "Business",
  "Graphics & Design",
  "Digital Marketing",
  "Writing & Translation",
  "Programming & Tech",
  "Video & Animation",
  "AI Services",
  "Data",
] as const;

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;

export const GUIDES: Guide[] = [
  {
    slug: "best-side-hustles-2026",
    title: "31 of the Best Side Hustles to Boost Your Income in 2026",
    excerpt: "Creative, proven ways to earn extra income — from selling services to building a small online business.",
    category: "Business",
    author: "Roy Rasmussen",
    date: "January 14, 2026",
    readingTime: "12 min read",
    image: IMG("photo-1521737604893-d14cc237f11d"),
    popular: true,
    content: [
      { type: "p", text: "A side hustle is a second gig you take on to add to the income from your main job. With more people looking for extra income than ever, finding additional revenue streams has become a practical necessity — and, done right, a side hustle can grow into a full-time business." },
      { type: "h2", text: "Where to start" },
      { type: "p", text: "The best side hustle is one that uses skills you already have. Start small, keep your overhead low, and lean on marketplaces like Fotizo to find your first customers without a big upfront investment." },
      { type: "ul", items: [
        "Offer graphic design or logo work on demand",
        "Write and sell digital products or eBooks",
        "Provide social media management for small businesses",
        "Sell handmade goods or flip second-hand items",
        "Teach a skill or language online",
      ] },
      { type: "h2", text: "Turning a hustle into a business" },
      { type: "p", text: "Once you have steady demand, reinvest in better tools, raise your prices to match your value, and build a simple brand. Track your monthly income and, when it's consistent, decide whether to scale it into your main source of income." },
    ],
  },
  {
    slug: "price-your-services",
    title: "How to Price Your Services the Right Way",
    excerpt: "Stop undercharging. A practical framework for setting prices that reflect your value and still win clients.",
    category: "Business",
    author: "Maya Bennett",
    date: "January 8, 2026",
    readingTime: "8 min read",
    image: IMG("photo-1554224155-6726b3ff858f"),
    popular: true,
    content: [
      { type: "p", text: "Pricing is the single biggest lever on your income — and the one most new professionals get wrong. Charge too little and you attract demanding, low-value clients; charge with confidence and you signal quality." },
      { type: "h2", text: "Start from value, not cost" },
      { type: "p", text: "Instead of pricing by the hour, price by the outcome you deliver. A logo isn't 'three hours of work' — it's a brand a business will use for years. Anchor your price to that result." },
      { type: "h2", text: "Use tiered packages" },
      { type: "p", text: "Offer three tiers (Basic, Standard, Premium). Most buyers pick the middle option, and the top tier makes the others feel reasonable. Each tier should add clear, tangible value." },
      { type: "ul", items: [
        "Basic — the core deliverable, fast",
        "Standard — the deliverable plus revisions and extras",
        "Premium — the full package with priority delivery and support",
      ] },
    ],
  },
  {
    slug: "build-a-brand-voice",
    title: "How to Build a Brand Voice That Sticks",
    excerpt: "Your brand voice is how customers recognise you. Here's how to define one that's consistent and memorable.",
    category: "Digital Marketing",
    author: "Chris Okafor",
    date: "December 19, 2025",
    readingTime: "9 min read",
    image: IMG("photo-1460925895917-afdab827c52f"),
    popular: true,
    content: [
      { type: "p", text: "A brand voice is the consistent personality your business uses across everything you write — your listings, messages, and social posts. A strong voice builds trust and makes you instantly recognisable." },
      { type: "h2", text: "Define three traits" },
      { type: "p", text: "Pick three adjectives that describe how you want to sound — for example: warm, expert, and direct. Every piece of copy should pass the test of those three words." },
      { type: "h2", text: "Write it down" },
      { type: "p", text: "Document a short style guide: words you use, words you avoid, and a couple of example sentences. Consistency is what turns a voice into a brand." },
    ],
  },
  {
    slug: "profitable-ecommerce-ideas",
    title: "12 Profitable Ecommerce Ideas You Can Start Today",
    excerpt: "From dropshipping to handmade goods, here are business models you can launch with little upfront capital.",
    category: "Business",
    author: "Amara Nadu",
    date: "December 2, 2025",
    readingTime: "15 min read",
    image: IMG("photo-1556742049-0cfed4f6a45d"),
    content: [
      { type: "p", text: "Ecommerce keeps growing, and you don't need a warehouse to get started. These models range from zero-inventory to fully handmade — pick one that fits your time and budget." },
      { type: "ul", items: [
        "Dropshipping — sell products a supplier ships for you",
        "Print-on-demand apparel and merch",
        "Handmade crafts and goods",
        "Digital products and templates",
        "Curated subscription boxes",
      ] },
      { type: "h2", text: "Validate before you scale" },
      { type: "p", text: "Before investing heavily, test demand with a small batch or a simple landing page. Let real orders — not guesses — tell you what to build next." },
    ],
  },
  {
    slug: "first-five-star-reviews",
    title: "How to Land Your First 5-Star Reviews",
    excerpt: "Reviews are the currency of trust on any marketplace. Here's how to earn your first great ones.",
    category: "Business",
    author: "Daniel Boateng",
    date: "November 21, 2025",
    readingTime: "6 min read",
    image: IMG("photo-1552664730-d307ca884978"),
    content: [
      { type: "p", text: "New sellers face a chicken-and-egg problem: buyers trust reviews, but you can't get reviews without buyers. Break the loop by over-delivering on your very first orders." },
      { type: "h2", text: "Tactics that work" },
      { type: "ul", items: [
        "Price your first few orders competitively to win them",
        "Communicate quickly and set clear expectations",
        "Deliver a little more than promised",
        "Politely ask happy clients to leave a review",
      ] },
    ],
  },
  {
    slug: "grow-with-ai",
    title: "Using AI to Grow Your Freelance Business",
    excerpt: "AI won't replace you — but it can help you work faster, pitch better, and deliver more.",
    category: "AI Services",
    author: "Priya Sharma",
    date: "November 5, 2025",
    readingTime: "10 min read",
    image: IMG("photo-1677442136019-21780ecad995"),
    popular: true,
    content: [
      { type: "p", text: "Used well, AI is a force multiplier for small businesses. It handles the repetitive parts so you can spend more time on the work only you can do." },
      { type: "h2", text: "Where AI helps most" },
      { type: "ul", items: [
        "Drafting first versions of proposals and briefs",
        "Summarising client calls and requirements",
        "Speeding up research and outlines",
        "Generating variations to spark ideas",
      ] },
      { type: "h2", text: "Keep the human in the loop" },
      { type: "p", text: "AI gets you to a fast first draft, but your judgement, taste, and relationships are what clients pay for. Always review and add your expertise before you deliver." },
    ],
  },
  {
    slug: "logo-design-that-lasts",
    title: "Logo Design 101: How to Create a Mark That Lasts",
    excerpt: "What separates a forgettable logo from one that carries a brand for decades — and how to brief a designer.",
    category: "Graphics & Design",
    author: "Efua Mensah",
    date: "October 28, 2025",
    readingTime: "7 min read",
    image: IMG("photo-1626785774573-4b799315345d"),
    content: [
      { type: "p", text: "A great logo is simple, memorable and works everywhere — from a favicon to a billboard. Whether you're designing one yourself or hiring a pro, the same principles apply." },
      { type: "h2", text: "The rules of a strong mark" },
      { type: "ul", items: [
        "Keep it simple — it must read at 16 pixels",
        "Make it distinctive within your industry",
        "Design in black and white first; add colour last",
        "Test it on light and dark backgrounds",
      ] },
      { type: "h2", text: "Briefing a designer" },
      { type: "p", text: "Share your audience, three brands you admire, and where the logo will live. A tight brief saves rounds of revisions and gets you to a better result faster." },
    ],
  },
  {
    slug: "seo-writing-basics",
    title: "SEO Writing Basics: Content That Ranks and Converts",
    excerpt: "How to write articles people love and search engines reward — without stuffing keywords.",
    category: "Writing & Translation",
    author: "Nadine Kofi",
    date: "October 12, 2025",
    readingTime: "9 min read",
    image: IMG("photo-1455390582262-044cdead277a"),
    content: [
      { type: "p", text: "Good SEO writing isn't about tricking algorithms — it's about answering a real question better than anyone else. Search engines have become very good at recognising exactly that." },
      { type: "h2", text: "A simple structure that works" },
      { type: "ul", items: [
        "Lead with the answer, then expand",
        "Use descriptive headings a reader can skim",
        "Cover one intent per page",
        "End with a next step for the reader",
      ] },
      { type: "p", text: "Write for the reader first, then polish for search: a clear title, a compelling meta description, and internal links to your related work." },
    ],
  },
  {
    slug: "launch-your-first-website",
    title: "From Zero to Live: Launching Your First Website",
    excerpt: "Domains, hosting, builders vs. custom code — a plain-English roadmap for getting online.",
    category: "Programming & Tech",
    author: "Kwame Asante",
    date: "September 30, 2025",
    readingTime: "11 min read",
    image: IMG("photo-1461749280684-dccba630e2f6"),
    content: [
      { type: "p", text: "Getting a website live is far simpler than it used to be — the hard part is choosing the right approach for your needs and budget." },
      { type: "h2", text: "Builder or custom?" },
      { type: "p", text: "Site builders get you live in a day and are perfect for portfolios and small shops. Custom code costs more but gives you complete control — the right call once your business logic gets unique." },
      { type: "h2", text: "The launch checklist" },
      { type: "ul", items: [
        "Buy a domain you can say out loud",
        "Set up HTTPS from day one",
        "Test on a real phone before launch",
        "Add analytics so you learn from visitors",
      ] },
    ],
  },
  {
    slug: "video-content-that-sells",
    title: "Video Content That Sells: A Starter Playbook",
    excerpt: "Short-form video is the highest-leverage marketing channel right now. Here's how to start without a studio.",
    category: "Video & Animation",
    author: "Lara Quaye",
    date: "September 18, 2025",
    readingTime: "8 min read",
    image: IMG("photo-1574717024653-61fd2cf4d44d"),
    content: [
      { type: "p", text: "You don't need expensive gear to make video that converts — you need a hook, good light, and a reason for people to keep watching." },
      { type: "h2", text: "The 3-second rule" },
      { type: "p", text: "Viewers decide in the first three seconds. Open with the outcome, a bold claim, or the finished product — never a slow intro." },
      { type: "ul", items: [
        "Film near a window for free, flattering light",
        "Caption everything — most people watch muted",
        "One video, one message",
        "End with a clear call to action",
      ] },
    ],
  },
  {
    slug: "data-driven-decisions",
    title: "Making Data-Driven Decisions in a Small Business",
    excerpt: "You don't need a data team — just a handful of numbers watched consistently. Here's which ones.",
    category: "Data",
    author: "Samuel Otieno",
    date: "September 2, 2025",
    readingTime: "10 min read",
    image: IMG("photo-1551288049-bebda4e38f71"),
    content: [
      { type: "p", text: "Most small businesses drown in numbers they never use. The trick is picking a few metrics tied to decisions you actually make — and reviewing them on a schedule." },
      { type: "h2", text: "The metrics that matter" },
      { type: "ul", items: [
        "Revenue per week — the pulse of the business",
        "Conversion rate — are visitors becoming buyers?",
        "Repeat-customer rate — is your quality holding?",
        "Where new customers come from — double down there",
      ] },
      { type: "p", text: "Set a 30-minute weekly review. Trends beat snapshots: one bad week is noise, four bad weeks is a signal." },
    ],
  },
  {
    slug: "social-media-strategy",
    title: "A Social Media Strategy You Can Actually Keep Up With",
    excerpt: "Consistency beats virality. A realistic posting system for busy founders and sellers.",
    category: "Digital Marketing",
    author: "Abena Owusu",
    date: "August 20, 2025",
    readingTime: "7 min read",
    image: IMG("photo-1611926653458-09294b3142bf"),
    content: [
      { type: "p", text: "The businesses that win on social aren't the ones that go viral — they're the ones still posting six months later. Build a system you can sustain." },
      { type: "h2", text: "The sustainable system" },
      { type: "ul", items: [
        "Pick one platform where your buyers actually are",
        "Batch a week of content in one sitting",
        "Repurpose: one idea → post, story, short video",
        "Reply to every comment — the algorithm and your customers both notice",
      ] },
    ],
  },
];

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
export const getPopularGuides = () => GUIDES.filter((g) => g.popular);
export const getRelatedGuides = (slug: string) => {
  const guide = getGuide(slug);
  if (!guide) return [];
  const sameCategory = GUIDES.filter((g) => g.slug !== slug && g.category === guide.category);
  const others = GUIDES.filter((g) => g.slug !== slug && g.category !== guide.category);
  return [...sameCategory, ...others].slice(0, 3);
};
