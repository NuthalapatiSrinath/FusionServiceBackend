export type PriceRange = { min: number; max: number | null; label?: string };

export type BulkTier = {
  quantity: string;
  min: number | null;
  max: number | null;
  quoteBased?: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: "apparel" | "mockup";
  material?: string;
  description: string;
  individual: {
    singleSide?: PriceRange;
    frontBack?: PriceRange;
    plain?: number;
    namePrint?: number;
    photoPrint?: number;
    logoPrint?: number;
    printed?: number;
  };
  bulk: BulkTier[];
  recommendedPrice?: number;
  mockupType: "tshirt" | "polo" | "cap" | "mug" | "bag" | "business-card";
  colors: string[];
  sides: ("front" | "back")[];
};

export type Addon = {
  id: string;
  name: string;
  priceMin: number;
  priceMax: number;
  description: string;
};

export type Package = {
  id: string;
  name: string;
  description: string;
  price: number | null;
  quoteBased: boolean;
  items: string;
};

export type Service = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

export const services: Service[] = [
  {
    id: "tshirt",
    name: "T-Shirt Printing",
    icon: "shirt",
    description: "Custom apparel printing for events, brands, and personal style.",
  },
  {
    id: "printing",
    name: "Color Printing & Xerox",
    icon: "printer",
    description: "High-quality color and B&W prints for documents and marketing.",
  },
  {
    id: "lamination",
    name: "Lamination & Binding",
    icon: "layers",
    description: "Protect and finish documents with professional lamination and binding.",
  },
  {
    id: "passport-photo",
    name: "Passport Photo & Editing",
    icon: "camera",
    description: "Compliant passport photos with on-the-spot editing.",
  },
  {
    id: "pan",
    name: "PAN Card Services",
    icon: "id-card",
    description: "PAN application support and related document services.",
  },
  {
    id: "passport-appt",
    name: "Passport Appointment",
    icon: "passport",
    description: "Assistance booking passport appointments and form help.",
  },
  {
    id: "exam",
    name: "Exam & Online Applications",
    icon: "laptop",
    description: "Exam forms, online applications, and submission support.",
  },
  {
    id: "scanning",
    name: "Scanning & Upload",
    icon: "scan",
    description: "Document scanning, digitizing, and upload assistance.",
  },
  {
    id: "id-card",
    name: "ID Card Printing",
    icon: "badge",
    description: "Custom ID cards for schools, offices, and events.",
  },
  {
    id: "design",
    name: "Designing Services",
    icon: "pen-tool",
    description: "Logo, flyer, and brand design from concept to print-ready.",
  },
  {
    id: "stationery",
    name: "Spiral Binding & Stationery",
    icon: "book",
    description: "Spiral binding, notebooks, and everyday stationery.",
  },
  {
    id: "flex",
    name: "Flex & Banner Printing",
    icon: "banner",
    description: "Large-format flex, banners, and outdoor signage.",
  },
];

export const products: Product[] = [
  {
    id: "round-neck",
    name: "Round Neck T-Shirt",
    slug: "round-neck-tshirt",
    category: "apparel",
    material: "180 GSM Cotton",
    description: "Soft cotton round neck — ideal for everyday wear and events.",
    individual: {
      singleSide: { min: 299, max: 349 },
      frontBack: { min: 399, max: 499 },
      plain: 199,
      namePrint: 249,
      photoPrint: 299,
    },
    bulk: [
      { quantity: "10-25", min: 250, max: 280 },
      { quantity: "26-50", min: 230, max: 260 },
      { quantity: "51-100", min: 210, max: 240 },
      { quantity: "100+", min: null, max: null, quoteBased: true },
    ],
    recommendedPrice: 299,
    mockupType: "tshirt",
    colors: ["#FFFFFF", "#1A2A47", "#000000", "#F37021", "#E11D48", "#2563EB"],
    sides: ["front", "back"],
  },
  {
    id: "polo",
    name: "Polo T-Shirt",
    slug: "polo-tshirt",
    category: "apparel",
    material: "220 GSM Cotton",
    description: "Premium polo for corporate branding and uniforms.",
    individual: {
      singleSide: { min: 399, max: 499 },
      frontBack: { min: 499, max: 599 },
      plain: 299,
      logoPrint: 399,
    },
    bulk: [
      { quantity: "10-25", min: 350, max: 400 },
      { quantity: "26-50", min: 330, max: 380 },
      { quantity: "51-100", min: 300, max: 350 },
      { quantity: "100+", min: null, max: null, quoteBased: true },
    ],
    recommendedPrice: 449,
    mockupType: "polo",
    colors: ["#FFFFFF", "#1A2A47", "#000000", "#166534", "#F37021"],
    sides: ["front", "back"],
  },
  {
    id: "cap",
    name: "Cap",
    slug: "cotton-cap",
    category: "apparel",
    material: "Cotton Cap",
    description: "Custom printed cotton caps for teams and promotions.",
    individual: {
      singleSide: { min: 249, max: 299 },
      frontBack: { min: 299, max: 349 },
      plain: 149,
      printed: 249,
      logoPrint: 299,
    },
    bulk: [
      { quantity: "10-25", min: 200, max: 220 },
      { quantity: "26-50", min: 180, max: 200 },
      { quantity: "51-100", min: 170, max: 190 },
      { quantity: "100+", min: null, max: null, quoteBased: true },
    ],
    recommendedPrice: 249,
    mockupType: "cap",
    colors: ["#FFFFFF", "#1A2A47", "#000000", "#F37021", "#DC2626"],
    sides: ["front"],
  },
  {
    id: "mug",
    name: "Ceramic Mug",
    slug: "ceramic-mug",
    category: "mockup",
    description: "White ceramic mug mockup for custom designs.",
    individual: {},
    bulk: [],
    mockupType: "mug",
    colors: ["#FFFFFF"],
    sides: ["front"],
  },
  {
    id: "bag",
    name: "Paper Shopping Bag",
    slug: "shopping-bag",
    category: "mockup",
    description: "Branded paper bag mockup for retail and events.",
    individual: {},
    bulk: [],
    mockupType: "bag",
    colors: ["#FFFFFF", "#1A2A47"],
    sides: ["front"],
  },
  {
    id: "business-card",
    name: "Business Card",
    slug: "business-card",
    category: "mockup",
    description: "Professional business card mockup.",
    individual: {},
    bulk: [],
    mockupType: "business-card",
    colors: ["#1A2A47", "#FFFFFF"],
    sides: ["front", "back"],
  },
];

export const addons: Addon[] = [
  {
    id: "glow",
    name: "Glow in the Dark Print",
    priceMin: 100,
    priceMax: 100,
    description: "Glow-in-the-dark ink finish",
  },
  {
    id: "metallic",
    name: "Metallic / Gold Finish",
    priceMin: 100,
    priceMax: 100,
    description: "Metallic or gold print finish",
  },
  {
    id: "puff",
    name: "Puff (3D) Print",
    priceMin: 100,
    priceMax: 150,
    description: "Raised 3D puff print effect",
  },
  {
    id: "embroidery",
    name: "Embroidery (Logo / Name)",
    priceMin: 100,
    priceMax: 200,
    description: "Embroidered logo or name",
  },
  {
    id: "name-number",
    name: "Individual Name & Number",
    priceMin: 50,
    priceMax: 100,
    description: "Per-piece name and number personalization",
  },
];

export const packages: Package[] = [
  {
    id: "birthday",
    name: "Birthday Package",
    description: "Perfect for birthday parties and celebrations",
    price: 2499,
    quoteBased: false,
    items: "10 Printed T-Shirts",
  },
  {
    id: "school",
    name: "School Package",
    description: "Uniform printing for schools and colleges",
    price: null,
    quoteBased: true,
    items: "50 Uniform T-Shirts — Custom Quotation",
  },
  {
    id: "corporate",
    name: "Corporate Package",
    description: "Company branding for teams and events",
    price: null,
    quoteBased: true,
    items: "100 Polo T-Shirts with Company Logo — Custom Quotation",
  },
];

export const businessInfo = {
  name: "FUSION PRINT & SERVICES",
  slogans: [
    "Your One-Stop Print & Digital Hub",
    "Print. Design. Deliver.",
    "PRINTING TODAY, SOLUTIONS FOR TOMORROW",
    "PRINT YOUR IDEAS, WEAR YOUR STYLE.",
  ],
  proprietor: "AARE BHAGAVAN",
  phones: {
    call: "9494197969",
    callDisplay: "94941 97969",
    whatsapp: "7995572200",
    whatsappDisplay: "79955 72200",
  },
  email: "fusionprintservices@gmail.com",
  address: {
    village: "Macherla",
    mandal: "Armoor",
    district: "Nizamabad",
    pincode: "503224",
    full: "Village: Macherla, Mandal: Armoor, District: Nizamabad, Pincode: 503224",
  },
  footerTaglines: [
    "Everything You Need, Under One Roof.",
    "FAST SERVICE | BEST QUALITY | REASONABLE PRICES",
  ],
  colors: {
    navy: "#1A2A47",
    orange: "#F37021",
    cyan: "#00AEEF",
    magenta: "#EC008C",
    yellow: "#FFF200",
    black: "#000000",
  },
};
