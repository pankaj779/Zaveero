import { STONE_IMAGES } from "./images";

export const COMPANY = {
  name: "Sanjana Stone Arts",
  shortName: "SSA",
  owner: "Devisingh Prajapathi",
  email: "prajapathipankaj321@gmail.com",
  phone: "+91 9900984570",
  phoneTel: "tel:+919900984570",
  whatsapp: "https://wa.me/919900984570",
  address: "#23, 6th Cross, Floor Mill Road, Kogilu, Yelahanka, Bangalore - 560064",
  tagline: "Premium Marble, Granite & Tile Installation",
  description:
    "Sanjana Stone Arts delivers exceptional marble, granite, and tile installation for residential and commercial projects — trusted by architects, engineers, and builders across India.",
} as const;

export const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#portfolio", label: "Projects" },
  { href: "#pricing", label: "Pricing" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#contact", label: "Contact" },
] as const;

export const SERVICES = [
  {
    title: "Marble Flooring",
    description: "Flawless marble floor installation with precision cutting, inlay patterns, and mirror polish finishing.",
    image: STONE_IMAGES.marbleFloor,
    icon: "Layers",
  },
  {
    title: "Marble Wall Cladding",
    description: "Elegant marble wall cladding for lobbies, feature walls, and luxury stone interiors.",
    image: STONE_IMAGES.marbleWall,
    icon: "LayoutGrid",
  },
  {
    title: "Marble Staircases",
    description: "Custom marble staircases with hand-crafted treads, risers, and premium stone balustrades.",
    image: STONE_IMAGES.marbleStaircase,
    icon: "ArrowUpRight",
  },
  {
    title: "Granite Flooring",
    description: "Durable granite flooring for high-traffic residential and commercial spaces with expert laying.",
    image: STONE_IMAGES.graniteFloor,
    icon: "Square",
  },
  {
    title: "Granite Installation",
    description: "Expert granite installation for facades, countertops, and structural stone elements.",
    image: STONE_IMAGES.graniteCladding,
    icon: "Hammer",
  },
  {
    title: "Granite Countertops",
    description: "Premium granite kitchen and vanity countertops with seamless edges and polished finishes.",
    image: STONE_IMAGES.graniteCounter,
    icon: "ChefHat",
  },
  {
    title: "Tile Fixing",
    description: "Professional tile fixing with level alignment, waterproof grouting, and durable adhesive work.",
    image: STONE_IMAGES.tileMosaic,
    icon: "Grid3x3",
  },
  {
    title: "Floor Tiles",
    description: "Ceramic, porcelain, and vitrified floor tile installation with precise stone-like finishes.",
    image: STONE_IMAGES.tileFloor,
    icon: "Footprints",
  },
  {
    title: "Wall Tiles",
    description: "Decorative wall tile and stone cladding for kitchens, living areas, and accent walls.",
    image: STONE_IMAGES.marbleInlay,
    icon: "PanelTop",
  },
  {
    title: "Bathroom Tiles",
    description: "Waterproof bathroom tile and stone installation with proper slopes and sealed joints.",
    image: STONE_IMAGES.tileBathroom,
    icon: "Bath",
  },
  {
    title: "Commercial & Residential Projects",
    description: "End-to-end marble, granite, and tile contracting for hotels, offices, villas, and homes.",
    image: STONE_IMAGES.commercialStone,
    icon: "Building2",
  },
] as const;

export const WHY_CHOOSE_US = [
  {
    title: "Skilled Workforce",
    description: "Experienced masons and finishers trained in premium stone and tile craftsmanship.",
    icon: "Users",
  },
  {
    title: "Premium Finishing",
    description: "Mirror-polish surfaces, precise joints, and flawless detailing on every project.",
    icon: "Sparkles",
  },
  {
    title: "Quality Assurance",
    description: "Rigorous quality checks at every stage — from material selection to final handover.",
    icon: "ShieldCheck",
  },
  {
    title: "Timely Completion",
    description: "Structured project timelines with disciplined execution and on-time delivery.",
    icon: "Clock",
  },
  {
    title: "Competitive Pricing",
    description: "Transparent rate cards with fair pricing for both material-inclusive and labour-only work.",
    icon: "IndianRupee",
  },
  {
    title: "Trusted by Architects & Engineers",
    description: "Preferred contractor for design professionals who demand precision and reliability.",
    icon: "Award",
  },
] as const;

export const PROJECT_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "marble", label: "Marble" },
  { value: "granite", label: "Granite" },
  { value: "tiles", label: "Tiles" },
  { value: "commercial", label: "Commercial" },
  { value: "residential", label: "Residential" },
] as const;

export const PRICING_TABS = [
  { value: "with_material", label: "With Material" },
  { value: "without_material", label: "Without Material" },
] as const;

export const PRICING_CATEGORIES = [
  { value: "marble", label: "Marble Works" },
  { value: "granite", label: "Granite Works" },
  { value: "tile", label: "Tile Works" },
] as const;

export const QUOTE_SERVICE_TYPES = [
  "Marble",
  "Granite",
  "Tiles",
  "Other",
] as const;

export const CONTACT_SERVICES = [
  "Marble Flooring",
  "Marble Wall Cladding",
  "Marble Staircases",
  "Granite Flooring",
  "Granite Installation",
  "Granite Countertops",
  "Tile Fixing",
  "Floor Tiles",
  "Wall Tiles",
  "Bathroom Tiles",
  "Commercial Project",
  "Residential Project",
  "Other",
] as const;

export const STATS = [
  { value: "30+", label: "Years Experience" },
  { value: "6000+", label: "Projects Completed" },
  { value: "500+", label: "Happy Clients" },
  { value: "100%", label: "Client Satisfaction" },
] as const;
