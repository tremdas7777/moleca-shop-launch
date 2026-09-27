export const store = {
  name: "Kazza",
  tagline: "Car Care",
  description: "Produtos profissionais para limpeza e estética automotiva.",
  email: "atendimento@kazzacarcare.com.br",
  phone: "(11) 99999-9999",
  whatsapp: "5511999999999",
  hours: "Segunda à Sexta 08:00 - 17:00",
  installments: 12,
  monthlyInterest: 0.0199,
  pixDiscount: 0.05,
  freeShippingFrom: 299,
  company: "Kazza Car Care LTDA",
  cnpj: "00.000.000/0001-00",
  address: "Rua Exemplo, 123 - São Paulo/SP",
  instagram: "https://instagram.com/",
  youtube: "https://youtube.com/",
};

export const announcements = [
  `Frete grátis acima de R$ ${store.freeShippingFrom} para Sul e Sudeste`,
  `${store.pixDiscount * 100}% de desconto pagando no Pix`,
  `Parcele em até ${store.installments}x no cartão`,
];

export type CategoryId = "lavagem" | "polimento" | "protecao" | "interior" | "acessorios";

export type Category = {
  id: CategoryId;
  name: string;
  headline: string;
  about: string;
  image?: string;
};

export const categories: Category[] = [
  {
    id: "lavagem",
    image: "/categorias/lavagem.jpg",
    name: "Lavagem",
    headline: "Limpeza pesada sem agredir a pintura",
    about:
      "Fórmula profissional para remover sujeira, barro e resíduos da estrada sem agredir pintura, plásticos e borrachas. Rende muito e deixa o veículo pronto para receber proteção.",
  },
  {
    id: "polimento",
    image: "/categorias/polimento.jpg",
    name: "Polimento",
    headline: "Corte, refino e brilho de showroom",
    about:
      "Desenvolvido para o polimento profissional: remove riscos, marcas e oxidação, recuperando a profundidade da cor e o brilho de carro novo.",
  },
  {
    id: "protecao",
    image: "/categorias/protecao.jpg",
    name: "Proteção",
    headline: "Brilho duradouro e proteção contra o tempo",
    about:
      "Cria uma camada de proteção contra sol, chuva e contaminantes, com efeito repelente de água e brilho intenso que facilita as próximas lavagens.",
  },
  {
    id: "interior",
    image: "/categorias/interior.jpg",
    name: "Interior",
    headline: "Tecidos, plásticos e vidros como novos",
    about:
      "Cuidado completo para o interior: limpa, renova e protege bancos, painéis, vidros e acabamentos, deixando o ambiente do carro limpo e agradável.",
  },
  {
    id: "acessorios",
    image: "/categorias/acessorios.jpg",
    name: "Acessórios",
    headline: "Microfibras, aplicadores e ferramentas",
    about:
      "Acessórios de alta qualidade para aplicar, remover e finalizar produtos com segurança, sem riscar e com o melhor rendimento.",
  },
];

export type Product = {
  id: string;
  name: string;
  category: CategoryId | "kits";
  price: number;
  salePrice?: number;
  hasVariants?: boolean;
  bestSeller?: boolean;
  image?: string;
  description?: string;
  kitItems?: string[];
};

const catalog: Product[] = [
  {
    id: "pistola-espuma-pro",
    name: "Pistola Espuma Pro para Lavadora de Alta Pressão",
    category: "acessorios",
    price: 219.9,
    hasVariants: true,
  },
  {
    id: "boina-la-corte-5",
    name: 'Boina de Lã Corte Pesado 5"',
    category: "polimento",
    price: 64.9,
  },
  {
    id: "toalha-microfibra-carbono",
    name: "Toalha de Microfibra Carbono 40x40 cm",
    category: "acessorios",
    price: 27.9,
  },
  {
    id: "selante-rapido-spray",
    bestSeller: true,
    name: "Selante Rápido em Spray",
    category: "protecao",
    price: 54.9,
  },
  {
    id: "revitalizador-plasticos",
    bestSeller: true,
    name: "Revitalizador de Plásticos Externos",
    category: "protecao",
    price: 31.9,
  },
  {
    id: "aplicador-espuma-ergonomico",
    name: "Aplicador de Espuma Ergonômico",
    category: "acessorios",
    price: 19.9,
    hasVariants: true,
  },
  {
    id: "polidor-metais",
    name: "Polidor de Metais",
    category: "polimento",
    price: 64.9,
    salePrice: 57.9,
  },
  {
    id: "verniz-motor-aerossol",
    name: "Verniz Protetor de Motor Aerossol 400 ml",
    category: "protecao",
    price: 45.9,
  },
  {
    id: "antiembacante-vidros",
    name: "Antiembaçante para Vidros",
    category: "interior",
    price: 49.9,
    hasVariants: true,
  },
  {
    id: "rolo-microfibra-polimento",
    name: "Rolo de Microfibra para Polimento",
    category: "polimento",
    price: 79.9,
    hasVariants: true,
  },
  {
    id: "aromatizante-automotivo",
    name: "Aromatizante Automotivo",
    category: "interior",
    price: 16.9,
    hasVariants: true,
  },
  {
    id: "kit-pinceis-macios",
    bestSeller: true,
    name: "Kit 3 Pincéis de Detalhamento Macios",
    category: "acessorios",
    price: 49.9,
    hasVariants: true,
  },
  {
    id: "cera-carnauba-finalizadora",
    bestSeller: true,
    name: "Cera de Carnaúba Finalizadora",
    category: "protecao",
    price: 32.9,
  },
  {
    id: "shampoo-concentrado",
    bestSeller: true,
    name: "Shampoo Automotivo Concentrado 1,5 L",
    category: "lavagem",
    price: 39.9,
  },
  {
    id: "limpador-tecidos",
    name: "Limpador de Tecidos e Estofados",
    category: "interior",
    price: 44.9,
  },
  {
    id: "composto-polidor-corte",
    name: "Composto Polidor de Corte",
    category: "polimento",
    price: 89.9,
  },
  {
    id: "descontaminante-rodas",
    name: "Descontaminante de Rodas",
    category: "lavagem",
    price: 49.9,
    salePrice: 44.9,
  },
  { id: "pretinho-pneus", name: "Pretinho para Pneus", category: "lavagem", price: 29.9 },
  {
    id: "limpador-multiuso-apc",
    bestSeller: true,
    name: "Limpador Multiuso APC Concentrado 1,5 L",
    category: "lavagem",
    price: 42.9,
  },
  {
    id: "removedor-piche",
    name: "Removedor de Piche e Cola",
    category: "lavagem",
    price: 36.9,
  },
  {
    id: "argila-descontaminante",
    name: "Argila Descontaminante de Pintura 100 g",
    category: "lavagem",
    price: 34.9,
  },
  {
    id: "composto-polidor-refino",
    name: "Composto Polidor de Refino",
    category: "polimento",
    price: 84.9,
  },
  {
    id: "boina-espuma-refino",
    name: 'Boina de Espuma Refino 6"',
    category: "polimento",
    price: 39.9,
  },
  {
    id: "vitrificador-ceramico",
    name: "Vitrificador Cerâmico para Pintura 50 ml",
    category: "protecao",
    price: 149.9,
    salePrice: 129.9,
  },
  {
    id: "hidratante-couro",
    bestSeller: true,
    name: "Hidratante de Couro",
    category: "interior",
    price: 39.9,
  },
  {
    id: "limpa-vidros",
    bestSeller: true,
    name: "Limpa Vidros Automotivo",
    category: "interior",
    price: 24.9,
  },
  {
    id: "luva-microfibra-lavagem",
    name: "Luva de Microfibra para Lavagem",
    category: "acessorios",
    price: 34.9,
  },
  {
    id: "shampoo-desincrustante",
    bestSeller: true,
    name: "Shampoo Desincrustante para Sujeira Pesada 1,5 L",
    category: "lavagem",
    price: 38.9,
  },
  {
    id: "limpador-pneus-borrachas",
    bestSeller: true,
    name: "Limpador de Pneus e Borrachas",
    category: "lavagem",
    price: 32.9,
  },
  {
    id: "restaurador-plasticos-gel",
    name: "Restaurador de Plásticos em Gel",
    category: "protecao",
    price: 59.9,
  },
  {
    id: "cera-pasta-premium",
    name: "Cera em Pasta Premium Carnaúba + SiO2 200 g",
    category: "protecao",
    price: 99.9,
  },
  {
    id: "removedor-chuva-acida",
    name: "Removedor de Chuva Ácida para Vidros",
    category: "interior",
    price: 44.9,
  },
  {
    id: "escova-microfibra-rodas",
    name: "Escova de Microfibra para Rodas",
    category: "acessorios",
    price: 69.9,
  },
  {
    id: "toalha-secagem",
    name: "Toalha de Secagem Microfibra 60x90 cm",
    category: "acessorios",
    price: 69.9,
  },
  {
    id: "shampoo-sio2",
    name: "Shampoo com Proteção SiO2 500 ml",
    category: "lavagem",
    price: 89.9,
  },
  {
    id: "limpador-couro",
    name: "Limpador de Couro 500 ml",
    category: "interior",
    price: 27.9,
  },
  {
    id: "kit-basico",
    name: "Kit Básico Kazza: Lavagem, Couro e Plásticos",
    category: "kits",
    price: 293.4,
    salePrice: 263.9,
    description:
      "Tudo para a primeira lavagem completa: lava e protege a pintura, limpa pneus, cuida do couro e renova os plásticos.",
    kitItems: [
      "shampoo-sio2",
      "limpador-pneus-borrachas",
      "hidratante-couro",
      "limpador-couro",
      "limpador-multiuso-apc",
      "restaurador-plasticos-gel",
    ],
  },
];

export const products: Product[] = catalog.map((p) => ({
  image: `/produtos/${p.id}.jpg`,
  ...p,
}));

export type Banner = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  coupon?: string;
  cta: string;
  category: CategoryId;
  theme: "dark" | "brand" | "light";
  image?: string;
};

export const banners: Banner[] = [
  {
    id: "polimento",
    eyebrow: "Linha polimento",
    title: "Até 20% off",
    subtitle: "Compostos, boinas e polidores para corte e refino",
    coupon: "BRILHO20",
    cta: "Comprar agora",
    category: "polimento",
    theme: "dark",
    image: "/banners/banner-polimento.jpg",
  },
  {
    id: "lavagem",
    eyebrow: "Kit lavagem",
    title: "Frete grátis",
    subtitle: `Em compras acima de R$ ${store.freeShippingFrom} para Sul e Sudeste`,
    cta: "Ver produtos",
    category: "lavagem",
    theme: "dark",
    image: "/banners/banner-lavagem.jpg",
  },
  {
    id: "interior",
    eyebrow: "Novidade",
    title: "Interior impecável",
    subtitle: "Limpadores de tecido, antiembaçante e aromatizantes",
    cta: "Conferir",
    category: "interior",
    theme: "light",
    image: "/banners/banner-interior.jpg",
  },
];

export function productsByCategory(category: Product["category"]) {
  return products.filter((p) => p.category === category);
}

export const kits = productsByCategory("kits");

export function kitProducts(kit: Product) {
  return (kit.kitItems ?? [])
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
}
