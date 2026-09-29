export const store = {
  name: "Kazza",
  tagline: "Car Care",
  description: "Produtos profissionais para limpeza e estética automotiva.",
  email: "atendimento@kazzacarcare.com.br",
  phone: "+55 (11) 3368-5599",
  whatsapp: "551133685599",
  hours: "Segunda à Sexta 08:00 - 17:00",
  company: "Kazza Car Care LTDA",
  cnpj: "00.000.000/0001-00",
  address: "Rua Exemplo, 123 - São Paulo/SP",
  instagram: "https://instagram.com/",
  youtube: "https://youtube.com/",
};

export const announcements = [
  "Frete grátis para todo o Brasil",
  "Até 50% OFF em toda a loja",
  "Compra 100% segura",
];

export type CategoryId =
  "lavagem" | "polimento" | "protecao" | "interior" | "acessorios" | "eletricos";

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
  {
    id: "eletricos",
    image: "/categorias/eletricos.jpg",
    name: "Carro Elétrico",
    headline: "Recarga prática, em casa ou na estrada",
    about:
      "Carregadores e acessórios para quem dirige elétrico: recarregue na tomada de casa, no trabalho ou em viagem, com segurança e sem obra.",
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
  /** Fotos extras exibidas depois da imagem principal. */
  gallery?: string[];
  highlights?: string[];
  details?: { title: string; text: string }[];
  compatibleBrands?: string[];
  specs?: [label: string, value: string][];
  /** Preço por quantidade (1, 2, 3 unidades...). Cada oferta acima de 1 vira um pacote com SKU próprio. */
  offers?: { units: number; price: number }[];
  bundleOf?: { id: string; units: number };
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
    id: "carregador-portatil-ipe-p4",
    name: "Carregador Portátil para Carro Elétrico IPE P4 4,4 kW Bivolt / Bifásico",
    category: "eletricos",
    price: 267,
    offers: [
      { units: 1, price: 267 },
      { units: 2, price: 497 },
      { units: 3, price: 697 },
    ],
    gallery: [2, 3, 4, 5, 6, 7, 8].map((n) => `/produtos/carregador-portatil-ipe-p4/${n}.jpg`),
    description:
      "Seu carro elétrico carregando em qualquer tomada de 20A: na garagem de casa, na casa de praia, no sítio ou na casa de um amigo. O IPE P4 entrega até 4,4 kW, reconhece 110V e 220V sozinho e vai no porta-malas dentro da própria bolsa de transporte. Chega de depender de eletroposto ou de ficar na mão no meio da viagem.",
    highlights: [
      "Até 4,4 kW em tomada residencial de 20A",
      "Bivolt 110V / 220V, rede monofásica ou bifásica",
      "Compatível com todos os elétricos e híbridos plug-in da BYD, GWM, Volvo, BMW e mais",
      "Tela em português com potência, tempo e kWh carregados",
      "Cabo de 5 metros em TPU e bolsa de transporte inclusos",
      "2 anos de garantia do fabricante",
    ],
    compatibleBrands: [
      "BYD",
      "GWM",
      "Volvo",
      "BMW",
      "Mini",
      "Mercedes-Benz",
      "Renault",
      "Chevrolet",
      "Caoa Chery",
      "JAC",
      "Peugeot",
      "Nissan",
      "Audi",
      "Porsche",
    ],
    details: [
      {
        title: "Compatível com os elétricos mais vendidos do Brasil",
        text: "O conector Tipo 2 é o padrão dos carros elétricos vendidos no Brasil. Por isso, o P4 carrega todos os elétricos e híbridos plug-in da BYD, GWM, Volvo, BMW, Mini, Mercedes-Benz, Renault, Chevrolet, Caoa Chery, JAC, Peugeot, Nissan, Audi e Porsche. Não precisa de adaptador.",
      },
      {
        title: "Sem obra e sem wallbox",
        text: "Não precisa instalar nada. Basta uma tomada de 20A no padrão brasileiro de 3 pinos, com a instalação elétrica em dia. Ele funciona em 110V e em 220V, em redes monofásicas e bifásicas.",
      },
      {
        title: "Você acompanha tudo pela tela",
        text: 'O visor de 2,8" mostra em português a tensão da tomada, a corrente, a potência, a temperatura interna, o tempo de recarga e quantos kWh já entraram na bateria. Com o timer, dá para programar a recarga para o horário da tarifa mais barata.',
      },
      {
        title: "Corrente ajustável",
        text: "Em um local com instalação mais fraca, é só reduzir a amperagem para adaptar a recarga à tomada disponível, com segurança para o carro e para a rede.",
      },
      {
        title: "Cabo feito para o dia a dia",
        text: "São 5 metros de cabo em TPU, flexível e resistente a abrasão, óleo e produtos químicos. O controlador tem proteção IP54 contra poeira e respingos, e aguenta garagem, estacionamento e área externa.",
      },
      {
        title: "Preparado para emergências",
        text: "Se a tomada não tiver aterramento, o carregador avisa na tela com o código E4. Em uma emergência, dá para desativar esse alerta e concluir a recarga. O recomendado é sempre carregar em uma tomada aterrada e usar essa função só quando não houver outra opção.",
      },
      {
        title: "Vai com você no porta-malas",
        text: "A bolsa de transporte guarda o carregador e o cabo organizados e protegidos, prontos para a próxima viagem.",
      },
    ],
    specs: [
      ["Modelo", "IPE P4"],
      ["Tipo", "Carregador portátil (modo 2)"],
      ["Potência", "Até 4,4 kW"],
      ["Corrente", "Até 20A, ajustável"],
      ["Tensão", "Bivolt 110V / 220V (monofásico ou bifásico)"],
      ["Frequência", "50 / 60 Hz"],
      ["Conector do veículo", "Tipo 2 (T2)"],
      [
        "Compatibilidade",
        "Elétricos e híbridos plug-in com entrada Tipo 2: BYD, GWM, Volvo, BMW, Mini, Mercedes-Benz, Renault, Chevrolet, Caoa Chery, JAC, Peugeot, Nissan, Audi, Porsche e outras",
      ],
      ["Plugue", "3 pinos 20A, padrão ABNT NBR 14136"],
      ["Cabo", "TPU, 5 metros"],
      ["Tela", 'LCD 2,8", em português'],
      ["Timer", "Sim"],
      ["Aterramento", "Alerta com desativação para emergência"],
      ["Grau de proteção", "IP54"],
      ["Temperatura de operação", "-25 °C a 55 °C"],
      ["Certificações", "CE, CB, UKCA, RoHS e TÜV"],
      ["Dimensões do controlador", "23 × 8 × 5 cm"],
      ["Peso", "0,4 kg (controlador) / 2,8 kg (total)"],
      ["Acompanha", "Bolsa de transporte"],
      ["Garantia", "2 anos do fabricante"],
    ],
  },
  {
    id: "kit-basico",
    name: "Kit Básico Kazza: Shampoo, Limpador de Pneus, Hidratante e Limpador de Couro, APC, Restaurador de Plásticos, Luva e Toalha de Microfibra",
    category: "kits",
    price: 306.2,
    salePrice: 153.1,
    image: "/produtos/kit-basico-concentrado.jpg",
    description:
      "Tudo para a primeira lavagem completa: lava a pintura sem tirar a proteção, limpa pneus, cuida do couro e renova os plásticos. Acompanha luva de lavagem e toalha de microfibra.",
    kitItems: [
      "shampoo-concentrado",
      "limpador-pneus-borrachas",
      "hidratante-couro",
      "limpador-couro",
      "limpador-multiuso-apc",
      "restaurador-plasticos-gel",
      "luva-microfibra-lavagem",
      "toalha-microfibra-carbono",
    ],
  },
];

/** Produtos avulsos aparecem com 50% OFF: o preço cobrado não muda, o preço "de" é o dobro. */
function withHalfOff(p: Product): Product {
  if (p.category === "kits") return p;
  const sale = p.salePrice ?? p.price;
  return { ...p, price: Math.round(sale * 200) / 100, salePrice: sale };
}

export const products: Product[] = catalog.map((p) =>
  withHalfOff({ image: `/produtos/${p.id}.jpg`, ...p }),
);

export function bundleId(productId: string, units: number) {
  return units === 1 ? productId : `${productId}-${units}un`;
}

/** Pacotes de quantidade: não aparecem nas vitrines, só no carrinho e no checkout. */
export const bundles: Product[] = products.flatMap(({ offers, salePrice: _, ...base }) =>
  (offers ?? [])
    .filter((o) => o.units > 1)
    .map((o) =>
      withHalfOff({
        ...base,
        id: bundleId(base.id, o.units),
        name: `${base.name} (${o.units} unidades)`,
        price: o.price,
        bundleOf: { id: base.id, units: o.units },
      }),
    ),
);

export function findProduct(id: string) {
  return products.find((p) => p.id === id) ?? bundles.find((p) => p.id === id);
}

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
    title: "50% off",
    subtitle: "Compostos, boinas e polidores para corte e refino",
    cta: "Comprar agora",
    category: "polimento",
    theme: "dark",
    image: "/banners/banner-polimento.jpg",
  },
  {
    id: "lavagem",
    eyebrow: "Kit lavagem",
    title: "Frete grátis",
    subtitle: "Em todas as compras, para todo o Brasil",
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
