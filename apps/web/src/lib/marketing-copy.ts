import {
  Activity,
  Ban,
  BarChart3,
  Building2,
  Clock,
  CreditCard,
  Filter,
  GraduationCap,
  HelpCircle,
  Instagram,
  Landmark,
  ListChecks,
  Lock,
  MessageCircle,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

export const proofFacts = [
  {
    icon: ShieldCheck,
    title: "Official Instagram Login",
    body: "Meta’s Instagram API with Instagram Login. No browser extensions, no unofficial APIs.",
  },
  {
    icon: Landmark,
    title: "Pay in ₹",
    body: "Razorpay checkout in Indian rupees. No USD conversion surprises.",
  },
  {
    icon: Filter,
    title: "One Reel or post",
    body: "Rules attach to the media you pick — not every comment on the whole profile.",
  },
  {
    icon: Lock,
    title: "Tokens stay on the server",
    body: "Access tokens are encrypted at rest and never shown in the browser.",
  },
];

export const audiences = [
  {
    icon: Sparkles,
    title: "Creators selling from comments",
    body: "Someone comments LINK or PRICE — they get one private reply with your product, PDF, or WhatsApp.",
  },
  {
    icon: GraduationCap,
    title: "Coaches and educators",
    body: "Keyword TRAIN or BATCH on a specific Reel. The right people get the enrolment link. Everyone else is ignored.",
  },
  {
    icon: Building2,
    title: "Agencies with many accounts",
    body: "One workspace, multiple professional accounts, Agency team seats. Client pages stay isolated.",
  },
];

export const refusals = [
  {
    icon: Ban,
    title: "No bulk DMs",
    body: "We only private-reply people who commented a matching keyword on media you selected.",
  },
  {
    icon: Ban,
    title: "No scraping",
    body: "Comments arrive over Meta HTTPS webhooks we verify. We do not scrape the public feed.",
  },
  {
    icon: Ban,
    title: "No “message everyone” mode",
    body: "Meta allows one eligible private reply per comment. We do not retry the same person as outreach.",
  },
];

export const featureHighlights = [
  {
    icon: Zap,
    title: "Comment → DM",
    body: "Keyword in a comment triggers an automatic private reply.",
  },
  {
    icon: Instagram,
    title: "Reel/Post specific",
    body: "Separate automations per Reel or post — not your whole profile.",
  },
  {
    icon: Send,
    title: "Instant link delivery",
    body: "Send a PDF, course, product, website, or WhatsApp link.",
  },
  {
    icon: Users,
    title: "Multi Instagram",
    body: "One login. Multiple Instagram professional accounts.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: "See comments, automated replies, and campaign performance.",
  },
  {
    icon: CreditCard,
    title: "Made for India",
    body: "Pay in ₹. Razorpay checkout. No USD billing.",
  },
];

export const featureDetails = [
  {
    icon: Zap,
    title: "Keyword matching",
    body: "Exact or contains matching, with optional case sensitivity. Each automation can watch several keywords such as TRAIN, LINK, or PRICE.",
  },
  {
    icon: Instagram,
    title: "Post and reel scoped rules",
    body: "Bind a rule to a specific Instagram post or reel so replies only fire on that media — not your entire profile.",
  },
  {
    icon: MessageCircle,
    title: "Private reply after a comment",
    body: "When a comment matches, KRAFTSANDKODES sends one private reply through Meta’s official Instagram messaging API. It does not blast bulk DMs.",
  },
  {
    icon: Filter,
    title: "Follow gate",
    body: "Optionally require the commenter to follow you first. You can send a public comment reply and a different private message if they are not following yet.",
  },
  {
    icon: Workflow,
    title: "Dashboard automations",
    body: "Create, pause, and edit rules from the app. Enable or disable a rule without deleting it.",
  },
  {
    icon: Activity,
    title: "Activity log",
    body: "See matched comments, sent replies, failures, and waiting follow-gate rows. Export CSV when you need a record.",
  },
  {
    icon: Shield,
    title: "Official Instagram Login",
    body: "Connect with Instagram Login (graph.instagram.com). Access tokens stay encrypted on the server and are never shown in the browser.",
  },
  {
    icon: CreditCard,
    title: "Razorpay billing",
    body: "Paid plans checkout in the app. Success and failure are stored on your account. Receipts email when SMTP is configured.",
  },
];

export const steps = [
  {
    icon: Instagram,
    title: "Connect Instagram",
    body: "Sign in, then authorize a professional Instagram account with official Meta Login.",
  },
  {
    icon: ListChecks,
    title: "Create a keyword rule",
    body: "Pick a post or reel, set keywords like TRAIN, LINK, PRICE, and write the private reply.",
  },
  {
    icon: Send,
    title: "We watch comments",
    body: "Meta sends comment webhooks. KRAFTSANDKODES matches them against your enabled rules.",
  },
  {
    icon: MessageCircle,
    title: "Send private reply",
    body: "A matching comment gets one eligible private reply through Meta’s official API.",
  },
];

export const howItWorksDetail = [
  {
    title: "Who can connect",
    body: "The Instagram account must be a professional account (Business or Creator). Personal accounts cannot complete Instagram Login.",
  },
  {
    title: "One reply per commenter",
    body: "Meta allows one private reply per commenter on a given comment window. The app does not retry the same person as a bulk outreach tool.",
  },
  {
    title: "Webhooks, not scraping",
    body: "Live comments arrive over HTTPS webhooks on the app host. We verify Meta’s signature. We do not scrape the public feed.",
  },
  {
    title: "App Review",
    body: "You can sign up and explore the dashboard immediately. Live comment webhooks on other people’s accounts need a Live Meta app and Advanced Access after App Review.",
  },
];

export const plans = [
  {
    name: "Free",
    tag: "",
    price: "₹0",
    period: "/month",
    cta: "Start Free",
    href: "/auth/signup",
    popular: false,
    annual: null as string | null,
    points: [
      "1 Instagram account",
      "100 automated replies/month",
      "1 active automation",
      "Reel/Post specific automation",
      "7-day activity history",
      "Basic analytics",
    ],
  },
  {
    name: "Creator",
    tag: "Best Value for Creators",
    price: "₹299",
    period: "/month",
    cta: "Start Creating",
    href: "/auth/signup",
    popular: false,
    annual: "₹2,999/year",
    points: [
      "2 Instagram accounts",
      "5,000 automated replies/month",
      "Unlimited automations",
      "Reel/Post specific rules",
      "Basic analytics",
    ],
  },
  {
    name: "Pro",
    tag: "Most Popular",
    price: "₹599",
    period: "/month",
    cta: "Start Growing",
    href: "/auth/signup",
    popular: true,
    annual: "₹5,999/year",
    points: [
      "5 Instagram accounts",
      "20,000 automated replies/month",
      "Unlimited automations",
      "Reel/Post specific rules",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    name: "Agency",
    tag: "For Agencies",
    price: "₹999",
    period: "/month",
    cta: "Start Agency",
    href: "/auth/signup",
    popular: false,
    annual: "₹9,999/year",
    points: [
      "15 Instagram accounts",
      "50,000 automated replies/month",
      "Unlimited automations",
      "Reel/Post specific rules",
      "Advanced analytics",
      "Priority support",
      "3 team members",
    ],
  },
];

export const planCompare = {
  headers: ["Feature", "Free", "Creator", "Pro", "Agency"],
  rows: [
    ["Instagram accounts", "1", "2", "5", "15"],
    ["Automated replies", "100", "5,000", "20,000", "50,000"],
    ["Active automations", "1", "Unlimited", "Unlimited", "Unlimited"],
    ["Reel/Post specific", "Yes", "Yes", "Yes", "Yes"],
    ["Basic analytics", "Yes", "Yes", "Yes", "Yes"],
    ["Advanced analytics", "No", "No", "Yes", "Yes"],
    ["Priority support", "No", "No", "Yes", "Yes"],
    ["Team members", "No", "No", "No", "3"],
  ],
};

export const faqs = [
  {
    icon: HelpCircle,
    q: "How does an automated reply work?",
    a: "When someone comments on an eligible Instagram post or Reel and matches an automation you've configured, KRAFTSANDKODES can send a private reply according to your automation.",
  },
  {
    icon: MessageCircle,
    q: "Does KRAFTSANDKODES send bulk or unsolicited DMs?",
    a: "No. KRAFTSANDKODES is designed for comment-triggered private replies based on automations you configure. It does not provide unsolicited bulk-DM blasting.",
  },
  {
    icon: Instagram,
    q: "Can I connect multiple Instagram accounts?",
    a: "Yes. Depending on your plan, you can connect 1, 2, 5, or 15 Instagram Professional accounts.",
  },
  {
    icon: Users,
    q: "Does the Agency plan include team members?",
    a: "Yes. The Agency plan supports up to 3 total team members, including the account owner.",
  },
  {
    icon: Clock,
    q: "What happens when I reach my monthly limit?",
    a: "Automations pause when you reach your plan's monthly automated reply limit. Upgrade to continue immediately or wait for your monthly usage reset.",
  },
  {
    icon: CreditCard,
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel your paid plan at any time. Your account and existing automations remain accessible according to the applicable plan and billing terms.",
  },
  {
    icon: Zap,
    q: "How many free automated replies do I get?",
    a: "The Free plan includes 100 automated replies every month.",
  },
  {
    icon: Zap,
    q: "Can I start for free?",
    a: "Yes. The Free plan includes 100 automated replies every month so you can test KRAFTSANDKODES before upgrading.",
  },
  {
    icon: ShieldCheck,
    q: "Is this safe to use?",
    a: "Yes. We use official Meta Instagram Login APIs. No unofficial tools, no scraping, no browser extensions that log into Instagram for you.",
  },
  {
    icon: UserCheck,
    q: "Do I need a professional account?",
    a: "Yes. Instagram Login and comment webhooks require an Instagram professional or business account.",
  },
  {
    icon: HelpCircle,
    q: "Will this work before App Review?",
    a: "You can create an account, pay, and use the dashboard. Live comment webhooks for customers need a Live Meta app plus Advanced Access after App Review.",
  },
  {
    icon: Instagram,
    q: "Which Instagram product do you use?",
    a: "Instagram API with Instagram Login (graph.instagram.com), not Facebook Login for Business Pages.",
  },
  {
    icon: CreditCard,
    q: "How is billing handled?",
    a: "Paid plans checkout with Razorpay inside the app at app.kraftsandkodes.com. Karan Digital Labs is the merchant. See Refund & Cancellation for refunds.",
  },
  {
    icon: Clock,
    q: "How fast is a reply?",
    a: "After Meta delivers the comment webhook, a matching enabled rule sends the private reply. Timing depends on Meta delivery, not a polling scrape.",
  },
  {
    icon: Filter,
    q: "Can I require a follow first?",
    a: "Yes. Enable follow-gate on the automation. People who are not following can get a public comment prompt; followers get the private reply.",
  },
];
