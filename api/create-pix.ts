import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";

// PIX via Duttyfy. O CARTÃO continua na Pagou (api/create-card.ts) e não é afetado por este arquivo.
//
// Variável de ambiente na Vercel (obrigatória):
//   DUTTYFY_API_URL -> a URL ENCRIPTADA gerada em Duttyfy > Chaves API > "Gerar URL encriptada".
//                      Use a URL inteira (não a chave bruta). Ela é secreta: nunca coloque no código nem no navegador.
// Opcionais (Meta Conversions API): META_CAPI_TOKEN e META_PIXEL_ID
const clean = (v?: string) => (v ?? "").trim().replace(/^[\"']|[\"']$/g, "");
const getUrl = () => clean(process.env.DUTTYFY_API_URL || process.env.DUTTYFY_URL);

// ⚠️ Preços ficam no SERVIDOR: o cliente só envia o id da oferta.
// Mantenha em sincronia com checkout/config.js e api/create-card.ts
const OFFERS: Record<string, { title: string; priceCents: number }> = {
  ferramenta: { title: "Kit 4 em 1 Ferramentas 48V com Maleta", priceCents: 9790 },
  lavadora: { title: "Lavadora de Alta Pressão MOHOR 3800W 140 Bar", priceCents: 9790 },
  "serra-marmore": { title: "Serra Mármore Vonder SMV 1300S 1300W - Leve 2", priceCents: 9790 },
  "luminaria-1": { title: "Kit 2 Luminárias Poste Solar 2200W (Compre 1 Leve 2)", priceCents: 9700 },
  "luminaria-2": { title: "Kit 4 Luminárias Poste Solar 2200W (Compre 2 Leve 4)", priceCents: 13790 },
  "luminaria-3": { title: "Kit 6 Luminárias Poste Solar 2200W (Compre 3 Leve 6)", priceCents: 15790 },
  "luminaria-4": { title: "Kit 8 Luminárias Poste Solar 2200W (Compre 4 Leve 8)", priceCents: 17790 },
  "ce-001-1": {"title": "Alicate Multifuncional 5 em 1 Linha Profissional — Padrão", "priceCents": 24900},
  "ce-002-1": {"title": "Bandeja Higiênica para Gatos com Peneira — Padrão", "priceCents": 14990},
  "ce-003-1": {"title": "Bolsa Ferramentas Reforçada Grande Lona Mala 16 Bolsos 15kg Eletricista Encanador Mecânico Mochila Fundo Emborrachado Manutenção Predial Porta Ferramenta Profissional Preto E Amarelo — Padrão", "priceCents": 22990},
  "ce-004-1": {"title": "Cabo Chupeta para Bateria de Carro e Caminhão 1200A 2,0 Metros — Padrão", "priceCents": 11990},
  "ce-005-1": {"title": "Cabo De Carga Bateria Chupeta Caminhão Carro 2,5m 800a — Padrão", "priceCents": 9790},
  "ce-006-1": {"title": "Cabo Extensor Telescópico 4 — Padrão", "priceCents": 12790},
  "ce-007-1": {"title": "Calibrador de Pneu e Compressor de Ar Portátil Digital Recarregável — Padrão", "priceCents": 32790},
  "ce-008-1": {"title": "Câmera Lâmpada De Segurança Wifi — Padrão", "priceCents": 14990},
  "ce-009-1": {"title": "Câmera veicular automotiva 3 em 1 Full HD 1080P — Padrão", "priceCents": 21970},
  "ce-010-1": {"title": "Chave De Impacto 21v 600nm - Bom 9964 — Padrão", "priceCents": 69190},
  "ce-011-1": {"title": "Chuveiro Portátil Recarregável USB com Bomba Submersa — Padrão", "priceCents": 16790},
  "ce-012-1": {"title": "Conjunto de 36 bits de impacto Bosch Impact Control — Padrão", "priceCents": 18390},
  "ce-013-1": {"title": "Escova Elétrica 9 em 1 Recarregável — Padrão", "priceCents": 16790},
  "ce-014-1": {"title": "Esmerilhadeira Angular 710W Corte Metal Desbaste Profissional — Padrão", "priceCents": 22290},
  "ce-015-1": {"title": "Esmerilhadeira Angular Recarregável 21V Bateria — Padrão", "priceCents": 46790},
  "ce-016-1": {"title": "Espremedor de Frutas Portátil Recarregável USB Laranja Limão 45W — Padrão", "priceCents": 14990},
  "ce-017-1": {"title": "Esquadro Gabarito para Marcação de Ângulos — Padrão", "priceCents": 9790},
  "ce-018-1": {"title": "Frigideira Antiaderente Cerâmica 24cm + Espátula De Silicone — Padrão", "priceCents": 14990},
  "ce-019-1": {"title": "Furadeira Impacto 220V 500W Alta Potência Concreto Madeira | Perfuração Rápida Precisa — Padrão", "priceCents": 31990},
  "ce-020-1": {"title": "Jogo 3 Broca Escalonada Titanio 3-12 4-20 -32mm — Padrão", "priceCents": 6990},
  "ce-021-1": {"title": "Kit 100 Pinos Para Pistola De Pregos Finca Pino Com Arruela — Padrão", "priceCents": 9790},
  "ce-022-1": {"title": "Kit 4 Utensilios De Cozinha Silicone Vermelho Antiaderente — Padrão", "priceCents": 5790},
  "ce-023-1": {"title": "Kit Chaves Canhão Catraca Reversível Soquetes Profissional — Padrão", "priceCents": 8990},
  "ce-024-1": {"title": "Kit Profissional Parafusadeira 30 Peças Bateria 21v Com Serrote e Ferramentas — Padrão", "priceCents": 62890},
  "ce-025-1": {"title": "Lavadora Jato Portátil Recarregável com Maleta e 2 Baterias — Padrão", "priceCents": 25790},
  "ce-026-1": {"title": "Lixeira Inteligente Automática 16L Com Sensor e Recarregável — Padrão", "priceCents": 17990},
  "ce-027-1": {"title": "Mangueira Mágica Retrátil Flexível Elástica 30 Mts 7 Jatos Jardim e Carro — Padrão", "priceCents": 11990},
  "ce-028-1": {"title": "Mini Motosserra Portátil 2 Baterias Recarregável Bivolt Sem Fio Compacta Profissional Serra Elétrica — Padrão", "priceCents": 33490},
  "ce-029-1": {"title": "Módulo de Automomação Sem Fio 30A Acionador Remoto — Padrão", "priceCents": 18990},
  "ce-030-1": {"title": "Multimetro Digital Profissional C/ Capacímetro Bateria — Padrão", "priceCents": 11990},
  "ce-031-1": {"title": "Nivel A Laser Nivelador 3 Linhas Trena Régua Profissional — Padrão", "priceCents": 10990},
  "ce-032-1": {"title": "Parafusadeira e Furadeira Impacto 48v 2 Baterias + Maleta Com Acessórios Kit Completo — Padrão", "priceCents": 15990},
  "ce-033-1": {"title": "Parafusadeira Sem Fio 47Pcs Bivolt 250RPM C/Maleta e Acessórios — Padrão", "priceCents": 12990},
  "ce-034-1": {"title": "Pistola de Pregos / Fica Pinos Manual Kit Completo — Padrão", "priceCents": 16990},
  "ce-035-1": {"title": "Serrote Podador De Galhos Altos Tesoura 2 Em 1 — Serrote Podador", "priceCents": 14790},
  "ce-035-2": {"title": "Serrote Podador De Galhos Altos Tesoura 2 Em 1 — Serrote Podador + Cabo 4M", "priceCents": 24790},
  "ce-036-1": {"title": "Soldador Plástico Solda Para-choque Carro E Moto Farol Carenagem 200 Grampos — Padrão", "priceCents": 21990},
  "ce-037-1": {"title": "Soprador De Ar Turbo 21v Portátil Com 2 Baterias Recarregável Potente Para Folhas Pó Limpeza — Padrão", "priceCents": 21990},
  "ce-038-1": {"title": "Soprador de Folhas Profissional 21v 2 Bateria 3000mah Usb C 600w Forte — Padrão", "priceCents": 54790},
  "ce-039-1": {"title": "Suporte Telescópico Fácil Instalação - 40kg — 1 UNIDADE - 30cm a 59cm", "priceCents": 16799},
  "ce-039-2": {"title": "Suporte Telescópico Fácil Instalação - 40kg — 2 UNIDADES - 30cm a 59cm", "priceCents": 29799},
  "ce-040-1": {"title": "Tesoura Alicate Poda Galho Árvore Elétrica 48v 2 Baterias — Padrão", "priceCents": 6990},
  "ce-041-1": {"title": "Trena Medidor A Laser 100m Área Volume Pitagórica — Padrão", "priceCents": 27790},
  "ce-042-1": {"title": "[BLACK] Rodo Mágico 180° – Limpeza Prática para Pisos e Vidros | 50% OFF 🔥 — 1 Unidade", "priceCents": 9490},
  "ce-042-2": {"title": "[BLACK] Rodo Mágico 180° – Limpeza Prática para Pisos e Vidros | 50% OFF 🔥 — 2 Unidades (Mais Vendido) 🔥", "priceCents": 12990},
  "ce-042-3": {"title": "[BLACK] Rodo Mágico 180° – Limpeza Prática para Pisos e Vidros | 50% OFF 🔥 — 3 Unidades (Maior Desconto) 🔥", "priceCents": 16990},
  "ce-043-1": {"title": "Abajur de Mesa Industrial Retrô — Branco", "priceCents": 16380},
  "ce-043-2": {"title": "Abajur de Mesa Industrial Retrô — Cobre", "priceCents": 16380},
  "ce-043-3": {"title": "Abajur de Mesa Industrial Retrô — Preto", "priceCents": 16380},
  "ce-044-1": {"title": "Amolador de Facas Inox 3 Estágios Profissional Premium — Padrão", "priceCents": 9999},
  "ce-045-1": {"title": "Aspirador Portátil Potente para Carros — Preto", "priceCents": 8198},
  "ce-045-2": {"title": "Aspirador Portátil Potente para Carros — Branco", "priceCents": 8198},
  "ce-046-1": {"title": "Bacia Raladora 4 em 1 Inox Fatiador e Escorredor — Padrão", "priceCents": 11490},
  "ce-047-1": {"title": "BlenderMix - Mini Liquidificador Portátil Com 10 Lâminas — Padrão", "priceCents": 15980},
  "ce-048-1": {"title": "Cafeteira Prensa Francesa em Vidro com Filtro Inox — 350 ML", "priceCents": 13990},
  "ce-048-2": {"title": "Cafeteira Prensa Francesa em Vidro com Filtro Inox — 600 ML", "priceCents": 15990},
  "ce-049-1": {"title": "Caixa De Armazenamento para Roupas - Grade para Íntimas e Calças — Padrão", "priceCents": 10990},
  "ce-050-1": {"title": "Caixa De Sapato Empilhável — 6 andares", "priceCents": 31990},
  "ce-050-2": {"title": "Caixa De Sapato Empilhável — 3 andares", "priceCents": 26990},
  "ce-051-1": {"title": "Caneca Flowers Artesanal em Vidro Duplo — 350ml / 02 Peças", "priceCents": 12990},
  "ce-051-2": {"title": "Caneca Flowers Artesanal em Vidro Duplo — 350ml / 04 Peças", "priceCents": 19990},
  "ce-051-3": {"title": "Caneca Flowers Artesanal em Vidro Duplo — 350ml / 06 Peças", "priceCents": 28990},
  "ce-052-1": {"title": "Caneca Flowers Artesanal em Vidro Duplo. — 350ml / 02 Peças", "priceCents": 14990},
  "ce-052-2": {"title": "Caneca Flowers Artesanal em Vidro Duplo. — 350ml / 04 Peças", "priceCents": 21990},
  "ce-052-3": {"title": "Caneca Flowers Artesanal em Vidro Duplo. — 350ml / 06 Peças", "priceCents": 28990},
  "ce-053-1": {"title": "Canecas Natalinas em Porcelana | Oferta Black Friday 50% OFF 🔥 — Papai Noel Clássico", "priceCents": 14990},
  "ce-053-2": {"title": "Canecas Natalinas em Porcelana | Oferta Black Friday 50% OFF 🔥 — Papai Noel de Óculos", "priceCents": 14990},
  "ce-053-3": {"title": "Canecas Natalinas em Porcelana | Oferta Black Friday 50% OFF 🔥 — Boneco De Neve", "priceCents": 14990},
  "ce-053-4": {"title": "Canecas Natalinas em Porcelana | Oferta Black Friday 50% OFF 🔥 — Kit Com os 3 Modelos (Super Desconto)", "priceCents": 38790},
  "ce-054-1": {"title": "Capa para Colchão Impermeável Premium — Solteiro / Cinza", "priceCents": 9990},
  "ce-054-2": {"title": "Capa para Colchão Impermeável Premium — Solteiro / Branco", "priceCents": 9990},
  "ce-054-3": {"title": "Capa para Colchão Impermeável Premium — Solteiro / Palha", "priceCents": 9990},
  "ce-054-4": {"title": "Capa para Colchão Impermeável Premium — Solteiro / Marrom", "priceCents": 9990},
  "ce-054-5": {"title": "Capa para Colchão Impermeável Premium — Solteiro / Rose", "priceCents": 9990},
  "ce-054-6": {"title": "Capa para Colchão Impermeável Premium — Solteiro / Azul", "priceCents": 9990},
  "ce-054-7": {"title": "Capa para Colchão Impermeável Premium — Solteiro / Verde Tiffany", "priceCents": 9990},
  "ce-054-8": {"title": "Capa para Colchão Impermeável Premium — Casal / Cinza", "priceCents": 12990},
  "ce-054-9": {"title": "Capa para Colchão Impermeável Premium — Casal / Branco", "priceCents": 12990},
  "ce-054-10": {"title": "Capa para Colchão Impermeável Premium — Casal / Palha", "priceCents": 12990},
  "ce-054-11": {"title": "Capa para Colchão Impermeável Premium — Casal / Marrom", "priceCents": 12990},
  "ce-054-12": {"title": "Capa para Colchão Impermeável Premium — Casal / Rose", "priceCents": 12990},
  "ce-054-13": {"title": "Capa para Colchão Impermeável Premium — Casal / Azul", "priceCents": 12990},
  "ce-054-14": {"title": "Capa para Colchão Impermeável Premium — Casal / Verde Tiffany", "priceCents": 12990},
  "ce-054-15": {"title": "Capa para Colchão Impermeável Premium — Queen / Cinza", "priceCents": 13990},
  "ce-054-16": {"title": "Capa para Colchão Impermeável Premium — Queen / Branco", "priceCents": 13990},
  "ce-054-17": {"title": "Capa para Colchão Impermeável Premium — Queen / Palha", "priceCents": 13990},
  "ce-054-18": {"title": "Capa para Colchão Impermeável Premium — Queen / Marrom", "priceCents": 13990},
  "ce-054-19": {"title": "Capa para Colchão Impermeável Premium — Queen / Rose", "priceCents": 13990},
  "ce-054-20": {"title": "Capa para Colchão Impermeável Premium — Queen / Azul", "priceCents": 13990},
  "ce-054-21": {"title": "Capa para Colchão Impermeável Premium — Queen / Verde Tiffany", "priceCents": 13990},
  "ce-054-22": {"title": "Capa para Colchão Impermeável Premium — King / Cinza", "priceCents": 14990},
  "ce-054-23": {"title": "Capa para Colchão Impermeável Premium — King / Branco", "priceCents": 14990},
  "ce-054-24": {"title": "Capa para Colchão Impermeável Premium — King / Palha", "priceCents": 14990},
  "ce-054-25": {"title": "Capa para Colchão Impermeável Premium — King / Marrom", "priceCents": 14990},
  "ce-054-26": {"title": "Capa para Colchão Impermeável Premium — King / Rose", "priceCents": 14990},
  "ce-054-27": {"title": "Capa para Colchão Impermeável Premium — King / Azul", "priceCents": 14990},
  "ce-054-28": {"title": "Capa para Colchão Impermeável Premium — King / Verde Tiffany", "priceCents": 14990},
  "ce-055-1": {"title": "Conjunto de Duas Facas para Frutas Inox Que Se Encaixam Corte Preciso — Kit（Um Par）", "priceCents": 9790},
  "ce-055-2": {"title": "Conjunto de Duas Facas para Frutas Inox Que Se Encaixam Corte Preciso — Kit（Dois Pares）", "priceCents": 12990},
  "ce-055-3": {"title": "Conjunto de Duas Facas para Frutas Inox Que Se Encaixam Corte Preciso — Kit（Três Pares）", "priceCents": 14790},
  "ce-056-1": {"title": "Cortador e Fatiador de Legumes Multifuncional 16 em 1 — 1 Unidade", "priceCents": 11790},
  "ce-056-2": {"title": "Cortador e Fatiador de Legumes Multifuncional 16 em 1 — 2 Unidades (Mais Desconto) 🔥", "priceCents": 19790},
  "ce-057-1": {"title": "Cortina para Cozinha de Voil com Forro de Microfibra — Branco", "priceCents": 10780},
  "ce-057-2": {"title": "Cortina para Cozinha de Voil com Forro de Microfibra — Cinza", "priceCents": 10780},
  "ce-057-3": {"title": "Cortina para Cozinha de Voil com Forro de Microfibra — Perola", "priceCents": 10780},
  "ce-057-4": {"title": "Cortina para Cozinha de Voil com Forro de Microfibra — Bege", "priceCents": 10780},
  "ce-057-5": {"title": "Cortina para Cozinha de Voil com Forro de Microfibra — Xadrez Branco", "priceCents": 10780},
  "ce-057-6": {"title": "Cortina para Cozinha de Voil com Forro de Microfibra — Xadrez Perola", "priceCents": 10780},
  "ce-057-7": {"title": "Cortina para Cozinha de Voil com Forro de Microfibra — Xadrez bege", "priceCents": 10780},
  "ce-058-1": {"title": "Descascador Elétrico Inteligente Premium — 110v", "priceCents": 19990},
  "ce-058-2": {"title": "Descascador Elétrico Inteligente Premium — 220v", "priceCents": 19990},
  "ce-059-1": {"title": "Descascador Multifuncional Cmof™ 2 em 1 – 50% OFF — Padrão", "priceCents": 12990},
  "ce-060-1": {"title": "Escova Elétrica de Limpeza 5 em 1 Sem Fio — 1 peças", "priceCents": 11698},
  "ce-061-1": {"title": "Esfregão WashDry Limpeza a Seco — Padrão", "priceCents": 27780},
  "ce-062-1": {"title": "FastCrusher Triturador Multifuncional 4 em 1 — Padrão", "priceCents": 14980},
  "ce-063-1": {"title": "Ferro passar roupas Portátil a Vapor — Verde e Dourado", "priceCents": 16184},
  "ce-064-1": {"title": "Filtro de Fiapos Flutuante Magic Filter — 2PCS", "priceCents": 6990},
  "ce-064-2": {"title": "Filtro de Fiapos Flutuante Magic Filter — 5PCS", "priceCents": 9790},
  "ce-065-1": {"title": "Gaveteiro Organizador Fibra Sintética Tela 3 Gavetas — Banana", "priceCents": 28172},
  "ce-065-2": {"title": "Gaveteiro Organizador Fibra Sintética Tela 3 Gavetas — Canela", "priceCents": 28172},
  "ce-065-3": {"title": "Gaveteiro Organizador Fibra Sintética Tela 3 Gavetas — Capuccino", "priceCents": 28172},
  "ce-065-4": {"title": "Gaveteiro Organizador Fibra Sintética Tela 3 Gavetas — Marrom", "priceCents": 28172},
  "ce-065-5": {"title": "Gaveteiro Organizador Fibra Sintética Tela 3 Gavetas — Preto", "priceCents": 28172},
  "ce-066-1": {"title": "Jogo Talheres 24 Peças Faqueiro Inox Premium — Padrão", "priceCents": 21380},
  "ce-067-1": {"title": "Kit 2 Capas Protetoras de Travesseiro Impermeável - Dream Shield - Desconto Especial!!! — Preto", "priceCents": 9990},
  "ce-067-2": {"title": "Kit 2 Capas Protetoras de Travesseiro Impermeável - Dream Shield - Desconto Especial!!! — Branco", "priceCents": 9990},
  "ce-067-3": {"title": "Kit 2 Capas Protetoras de Travesseiro Impermeável - Dream Shield - Desconto Especial!!! — Bege", "priceCents": 9990},
  "ce-067-4": {"title": "Kit 2 Capas Protetoras de Travesseiro Impermeável - Dream Shield - Desconto Especial!!! — Tabaco", "priceCents": 9990},
  "ce-068-1": {"title": "Kit 4 Organizadores 2,2 Litros de Geladeira Acrílico — Padrão", "priceCents": 49380},
  "ce-069-1": {"title": "Kit com 3 Lâmpadas de Filamento LED Retrô Vintage — Padrão", "priceCents": 10398},
  "ce-070-1": {"title": "Kit com 6 Taças de Vidro Agua e vinho Tinto Luxo — Padrão", "priceCents": 16576},
  "ce-071-1": {"title": "Kit Compact Premium – Saco a Vácuo + Bomba Elétrica — Bomba 110 V", "priceCents": 18990},
  "ce-071-2": {"title": "Kit Compact Premium – Saco a Vácuo + Bomba Elétrica — Bomba 220 V", "priceCents": 18990},
  "ce-072-1": {"title": "Kit Completo 19 Peças Premium | ÚLTIMAS UNIDADES! — Preto / Kit 12 Pcs", "priceCents": 9790},
  "ce-072-2": {"title": "Kit Completo 19 Peças Premium | ÚLTIMAS UNIDADES! — Preto / Kit COMPLETO 19 Pcs", "priceCents": 14990},
  "ce-072-3": {"title": "Kit Completo 19 Peças Premium | ÚLTIMAS UNIDADES! — Rosa / Kit 12 Pcs", "priceCents": 9790},
  "ce-072-4": {"title": "Kit Completo 19 Peças Premium | ÚLTIMAS UNIDADES! — Rosa / Kit COMPLETO 19 Pcs", "priceCents": 14990},
  "ce-072-5": {"title": "Kit Completo 19 Peças Premium | ÚLTIMAS UNIDADES! — Verde / Kit 12 Pcs", "priceCents": 9790},
  "ce-072-6": {"title": "Kit Completo 19 Peças Premium | ÚLTIMAS UNIDADES! — Verde / Kit COMPLETO 19 Pcs", "priceCents": 14990},
  "ce-072-7": {"title": "Kit Completo 19 Peças Premium | ÚLTIMAS UNIDADES! — Cinza / Kit 12 Pcs", "priceCents": 9790},
  "ce-072-8": {"title": "Kit Completo 19 Peças Premium | ÚLTIMAS UNIDADES! — Cinza / Kit COMPLETO 19 Pcs", "priceCents": 14990},
  "ce-073-1": {"title": "Kit de Puffs de Luxo - Elegance Lounge — Bege", "priceCents": 29990},
  "ce-073-2": {"title": "Kit de Puffs de Luxo - Elegance Lounge — Cinza", "priceCents": 29990},
  "ce-074-1": {"title": "Kit Utensílios de Cozinha em Silicone — Cinza-escuro", "priceCents": 11990},
  "ce-074-2": {"title": "Kit Utensílios de Cozinha em Silicone — Preto", "priceCents": 11990},
  "ce-074-3": {"title": "Kit Utensílios de Cozinha em Silicone — Rosa", "priceCents": 11990},
  "ce-074-4": {"title": "Kit Utensílios de Cozinha em Silicone — Verde", "priceCents": 11990},
  "ce-074-5": {"title": "Kit Utensílios de Cozinha em Silicone — Vermelho", "priceCents": 11990},
  "ce-075-1": {"title": "Luminária 3D de Cristal com LED Multicolor — Galáxia", "priceCents": 14990},
  "ce-075-2": {"title": "Luminária 3D de Cristal com LED Multicolor — Lua", "priceCents": 14990},
  "ce-075-3": {"title": "Luminária 3D de Cristal com LED Multicolor — Saturno", "priceCents": 14990},
  "ce-075-4": {"title": "Luminária 3D de Cristal com LED Multicolor — Sistema Solar", "priceCents": 14990},
  "ce-075-5": {"title": "Luminária 3D de Cristal com LED Multicolor — Terra", "priceCents": 14990},
  "ce-076-1": {"title": "Luminária de Lua Cheia 3D LED — Única", "priceCents": 7394},
  "ce-077-1": {"title": "Luminária de Mesa Dourada | Bateria 24h | LED Alta Performance — Padrão", "priceCents": 13990},
  "ce-078-1": {"title": "Luminária de Mesa LED em Madeira Nórdica — Base Quadrada", "priceCents": 17380},
  "ce-078-2": {"title": "Luminária de Mesa LED em Madeira Nórdica — Base Redonda", "priceCents": 17380},
  "ce-079-1": {"title": "Luminária de Mesa Sem Fio Recarregável — Padrão", "priceCents": 19400},
  "ce-080-1": {"title": "Luminária Inteligente LED com Sensor de Movimento USB Recarregável — Luz Quente / 2 unid 10cm", "priceCents": 8590},
  "ce-080-2": {"title": "Luminária Inteligente LED com Sensor de Movimento USB Recarregável — Luz Quente / 2 unid 20cm", "priceCents": 11390},
  "ce-080-3": {"title": "Luminária Inteligente LED com Sensor de Movimento USB Recarregável — Luz Quente / 2 unid 30cm", "priceCents": 13290},
  "ce-080-4": {"title": "Luminária Inteligente LED com Sensor de Movimento USB Recarregável — Luz Branca / 2 unid 10cm", "priceCents": 8590},
  "ce-080-5": {"title": "Luminária Inteligente LED com Sensor de Movimento USB Recarregável — Luz Branca / 2 unid 20cm", "priceCents": 11390},
  "ce-080-6": {"title": "Luminária Inteligente LED com Sensor de Movimento USB Recarregável — Luz Branca / 2 unid 30cm", "priceCents": 13290},
  "ce-081-1": {"title": "Luminária Inteligente Ultra LED com Sensor de Movimento sem Fio e Recarregável [COMPRE 1 LEVE 2] — 10CM | BRANCO FRIO / COMPRE 1 LEVE 2", "priceCents": 5990},
  "ce-081-2": {"title": "Luminária Inteligente Ultra LED com Sensor de Movimento sem Fio e Recarregável [COMPRE 1 LEVE 2] — 10CM | BRANCO QUENTE / COMPRE 1 LEVE 2", "priceCents": 5990},
  "ce-081-3": {"title": "Luminária Inteligente Ultra LED com Sensor de Movimento sem Fio e Recarregável [COMPRE 1 LEVE 2] — 20CM | BRANCO FRIO / COMPRE 1 LEVE 2", "priceCents": 7990},
  "ce-081-4": {"title": "Luminária Inteligente Ultra LED com Sensor de Movimento sem Fio e Recarregável [COMPRE 1 LEVE 2] — 20CM | BRANCO QUENTE / COMPRE 1 LEVE 2", "priceCents": 7990},
  "ce-081-5": {"title": "Luminária Inteligente Ultra LED com Sensor de Movimento sem Fio e Recarregável [COMPRE 1 LEVE 2] — 30CM | BRANCO FRIO / COMPRE 1 LEVE 2", "priceCents": 9990},
  "ce-081-6": {"title": "Luminária Inteligente Ultra LED com Sensor de Movimento sem Fio e Recarregável [COMPRE 1 LEVE 2] — 30CM | BRANCO QUENTE / COMPRE 1 LEVE 2", "priceCents": 9990},
  "ce-081-7": {"title": "Luminária Inteligente Ultra LED com Sensor de Movimento sem Fio e Recarregável [COMPRE 1 LEVE 2] — 50CM | BRANCO FRIO / COMPRE 1 LEVE 2", "priceCents": 12990},
  "ce-081-8": {"title": "Luminária Inteligente Ultra LED com Sensor de Movimento sem Fio e Recarregável [COMPRE 1 LEVE 2] — 50CM | BRANCO QUENTE / COMPRE 1 LEVE 2", "priceCents": 12990},
  "ce-082-1": {"title": "Luminária Smart 360 | Oferta Compre 1 - Leve 2 🔥 — Preto | Compre 1 Leve 2", "priceCents": 12990},
  "ce-082-2": {"title": "Luminária Smart 360 | Oferta Compre 1 - Leve 2 🔥 — Branco | Compre 1 Leve 2", "priceCents": 12990},
  "ce-083-1": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Bege Mesclado / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-2": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Neblina / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-3": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Chumbo Mesclado / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-4": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Chocolate Mesclado / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-5": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Coral / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-6": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Verde Mesclado / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-7": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Preto Xadrez / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-8": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Cru / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-9": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Preto / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-10": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Verde Água / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-11": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Laranja / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-12": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Marrom / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-13": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Cinza Mesclado / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-083-14": {"title": "Manta Para Sofá de Luxo Estilo Europeu de Algodão Macio - Entrega Grátis — Amarelo / 4.00 x 1.70 Metros", "priceCents": 17990},
  "ce-084-1": {"title": "Martelo Portátil Multifuncional Garra Ao Ar Livre Camping Adventure Survival Kit Com Bolsa de Nylon — Padrão", "priceCents": 16790},
  "ce-085-1": {"title": "Mini Selador de Sacos para Plásticos e Lanches - 2 em 1 — Branco", "priceCents": 7200},
  "ce-085-2": {"title": "Mini Selador de Sacos para Plásticos e Lanches - 2 em 1 — Preto", "priceCents": 7200},
  "ce-086-1": {"title": "Moedor elétrico de café Premium - Café Fresco Moído na Hora, com Praticidade e Sabor Intenso — 220V", "priceCents": 10990},
  "ce-086-2": {"title": "Moedor elétrico de café Premium - Café Fresco Moído na Hora, com Praticidade e Sabor Intenso — 110V", "priceCents": 10990},
  "ce-087-1": {"title": "Moedor Premium Inox GourmetPro - 40% OFF — Padrão", "priceCents": 13900},
  "ce-088-1": {"title": "Omeleteira Para Micro-Ondas Casa Ella 🍳 | Frete Grátis 🚚 — Padrão", "priceCents": 7490},
  "ce-089-1": {"title": "ORGANIZADOR DE ROUPAS DOBRÁVEL - COMPRE 1 E LEVE 4 - SOMENTE HOJE 🔥 — Compre 1 e Leve 4", "priceCents": 16990},
  "ce-089-2": {"title": "ORGANIZADOR DE ROUPAS DOBRÁVEL - COMPRE 1 E LEVE 4 - SOMENTE HOJE 🔥 — Compre 2 e Leve 8", "priceCents": 29990},
  "ce-089-3": {"title": "ORGANIZADOR DE ROUPAS DOBRÁVEL - COMPRE 1 E LEVE 4 - SOMENTE HOJE 🔥 — Compre 3 e Leve 12", "priceCents": 39990},
  "ce-090-1": {"title": "Organizador Multiuso Estante Lateral para Banheiro — Branco", "priceCents": 12360},
  "ce-090-2": {"title": "Organizador Multiuso Estante Lateral para Banheiro — Preto", "priceCents": 12360},
  "ce-091-1": {"title": "Pano Microfibra SuperClean | Limpeza Rápida e Brilho Sem Esforço | Kit com 20 Panos — Padrão", "priceCents": 6990},
  "ce-092-1": {"title": "Pica Tudo Inox™ | Praticidade Total — 2 Litros / 127 V", "priceCents": 19990},
  "ce-092-2": {"title": "Pica Tudo Inox™ | Praticidade Total — 2 Litros / 220 V", "priceCents": 19990},
  "ce-092-3": {"title": "Pica Tudo Inox™ | Praticidade Total — 3 Litros / 127 V", "priceCents": 21990},
  "ce-092-4": {"title": "Pica Tudo Inox™ | Praticidade Total — 3 Litros / 220 V", "priceCents": 21990},
  "ce-093-1": {"title": "Porta-Talheres de Bambu Extensível | Oferta BlackFriday 50% OFF 🔥 — Padrão", "priceCents": 16990},
  "ce-094-1": {"title": "Potes Herméticos com Trava e Alta Vedação — KIT 5 POTES HERMÉTICOS", "priceCents": 18198},
  "ce-095-1": {"title": "Protetor Anti-Respingos para Fogão Dobrável - ÚLTIMAS UNIDADES — 1 Unidade", "priceCents": 7966},
  "ce-095-2": {"title": "Protetor Anti-Respingos para Fogão Dobrável - ÚLTIMAS UNIDADES — 2 Unidades (50% na segunda)", "priceCents": 11994},
  "ce-096-1": {"title": "Pulverizador de Óleo de Vidro para Cozinhar — Pulverizador de óleo", "priceCents": 8990},
  "ce-097-1": {"title": "Rack para Banheiro com Prateleiras — Preto", "priceCents": 15200},
  "ce-098-1": {"title": "Ralador com Bacia Escorredor para Legumes 7 em 1 — Padrão", "priceCents": 13980},
  "ce-099-1": {"title": "Sapateira Simples De Tubos De Aço Com 4 Andares Para Quarto Dormitório Sala — Padrão", "priceCents": 8990},
  "ce-100-1": {"title": "Super Tesoura de Cozinha Premium — Comprar 1", "priceCents": 14999},
  "ce-100-2": {"title": "Super Tesoura de Cozinha Premium — 🔥Compre 2 e ganhe desconto🔥", "priceCents": 24990},
  "ce-101-1": {"title": "Tábua de Cozinha Titanium - Antibacteriana e Antisujeira — Pequeno 22cm/18cm", "priceCents": 9990},
  "ce-101-2": {"title": "Tábua de Cozinha Titanium - Antibacteriana e Antisujeira — Médio 29cm/20cm", "priceCents": 10490},
  "ce-101-3": {"title": "Tábua de Cozinha Titanium - Antibacteriana e Antisujeira — Grande 34cm/23cm", "priceCents": 10990},
  "ce-101-4": {"title": "Tábua de Cozinha Titanium - Antibacteriana e Antisujeira — Kit com os 3 Tamanhos", "priceCents": 24969},
  "ce-102-1": {"title": "Tabua Queijos e Frios + Kit Espátulas 04 Peças — Padrão", "priceCents": 25376},
  "ce-103-1": {"title": "Tampas Elásticas Descartáveis para Alimentos | Oferta Limitada + Frete Grátis 🚚 — 100 Unidades", "priceCents": 7490},
  "ce-103-2": {"title": "Tampas Elásticas Descartáveis para Alimentos | Oferta Limitada + Frete Grátis 🚚 — 200 Unidades", "priceCents": 7990},
  "ce-103-3": {"title": "Tampas Elásticas Descartáveis para Alimentos | Oferta Limitada + Frete Grátis 🚚 — 300 Unidades", "priceCents": 8490},
  "ce-103-4": {"title": "Tampas Elásticas Descartáveis para Alimentos | Oferta Limitada + Frete Grátis 🚚 — 400 Unidades (Mais Pedido) 🔥", "priceCents": 9790},
  "ce-103-5": {"title": "Tampas Elásticas Descartáveis para Alimentos | Oferta Limitada + Frete Grátis 🚚 — 500 Unidades (Maior Desconto) 🔥", "priceCents": 10790},
  "ce-104-1": {"title": "Tapete Felpudo de Luxo — Bege Liso", "priceCents": 47200},
  "ce-104-2": {"title": "Tapete Felpudo de Luxo — Bege Mesclado", "priceCents": 47200},
  "ce-104-3": {"title": "Tapete Felpudo de Luxo — Branco", "priceCents": 47200},
  "ce-104-4": {"title": "Tapete Felpudo de Luxo — Cinza Mesclado", "priceCents": 47200},
  "ce-104-5": {"title": "Tapete Felpudo de Luxo — Marrom Liso", "priceCents": 47200},
  "ce-104-6": {"title": "Tapete Felpudo de Luxo — Marrom Mesclado", "priceCents": 47200},
  "ce-104-7": {"title": "Tapete Felpudo de Luxo — Preto Liso", "priceCents": 47200},
  "ce-104-8": {"title": "Tapete Felpudo de Luxo — Preto Mesclado", "priceCents": 47200},
  "ce-104-9": {"title": "Tapete Felpudo de Luxo — Rosa Bebê", "priceCents": 47200},
  "ce-104-10": {"title": "Tapete Felpudo de Luxo — Vermelho", "priceCents": 47200},
  "ce-105-1": {"title": "Tapete Ultra Absorvente e Antiderrapante FlexGrip - Compre 1, Leve 2 — Cinza", "priceCents": 12490},
  "ce-105-2": {"title": "Tapete Ultra Absorvente e Antiderrapante FlexGrip - Compre 1, Leve 2 — Marrom", "priceCents": 12490},
  "ce-105-3": {"title": "Tapete Ultra Absorvente e Antiderrapante FlexGrip - Compre 1, Leve 2 — Azul", "priceCents": 12490},
  "ce-105-4": {"title": "Tapete Ultra Absorvente e Antiderrapante FlexGrip - Compre 1, Leve 2 — Branco", "priceCents": 12490},
  "ce-106-1": {"title": "ThermoHeat Inox - Garrafa Térmica 500ml + 3 Xícaras Exclusivas - Entrega Grátis — Prata Elegance", "priceCents": 14790},
  "ce-106-2": {"title": "ThermoHeat Inox - Garrafa Térmica 500ml + 3 Xícaras Exclusivas - Entrega Grátis — Preto Onyx", "priceCents": 14790},
  "ce-106-3": {"title": "ThermoHeat Inox - Garrafa Térmica 500ml + 3 Xícaras Exclusivas - Entrega Grátis — Azul Marinho", "priceCents": 14790},
  "ce-106-4": {"title": "ThermoHeat Inox - Garrafa Térmica 500ml + 3 Xícaras Exclusivas - Entrega Grátis — Rosé Pérola", "priceCents": 14790},
  "ce-107-1": {"title": "Tower Varal 3 Andares — 1 Unidade - Tower Varal 3 Andares [R$209.90]", "priceCents": 21990},
  "ce-107-2": {"title": "Tower Varal 3 Andares — 2 Unidades - Tower Varal 3 Andares [R$167.35][cada]", "priceCents": 33470},
  "ce-108-1": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — COCA-COLA", "priceCents": 9790},
  "ce-108-2": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — SKOL", "priceCents": 9790},
  "ce-108-3": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — ANTÁRCTICA", "priceCents": 9790},
  "ce-108-4": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — AMSTEL", "priceCents": 9790},
  "ce-108-5": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — BRAHMA", "priceCents": 9790},
  "ce-108-6": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — BUDWEISER", "priceCents": 9790},
  "ce-108-7": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — HEINEKEN", "priceCents": 9790},
  "ce-108-8": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — MICHELOB", "priceCents": 9790},
  "ce-108-9": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — MONSTER", "priceCents": 9790},
  "ce-108-10": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — RED BULL", "priceCents": 9790},
  "ce-108-11": {"title": "Cooler Para Cerveja E Bebidas Com Porta-gelo Customizável — PERSONALIZADO", "priceCents": 9790}
};

// Frete grátis pelos Correios (se um dia tiver valor, ele é somado ao total).
const SHIPPING: Record<string, { name: string; priceCents: number }> = {
  correios: { name: "Frete Correios", priceCents: 0 },
};

// Order bumps: vazio por enquanto. Para ativar, adicione aqui E em checkout/config.js.
const BUMPS: Record<string, { title: string; priceCents: number }> = {};

// Envia a compra ao Meta direto do servidor (Conversions API) assim que o PIX é gerado.
// Variáveis na Vercel: META_CAPI_TOKEN (obrigatória) e META_PIXEL_ID (opcional).
const sha = (v: unknown) => createHash("sha256").update(String(v ?? "").trim().toLowerCase()).digest("hex");
async function sendMetaPurchase(id: string, amountCents: number, offerId: string, c: any, m: any) {
  const token = clean(process.env.META_CAPI_TOKEN);
  const pixel = clean(process.env.META_PIXEL_ID) || "1474529167889526";
  if (!token) { console.log("[meta] META_CAPI_TOKEN ausente — Purchase NÃO enviado pelo servidor"); return; }
  const ph = String(c?.phone ?? "").replace(/\D/g, "");
  const body = { data: [{
    event_name: "Purchase", event_time: Math.floor(Date.now() / 1000), event_id: "purchase_" + id,
    action_source: "website", event_source_url: m.url || undefined,
    user_data: {
      em: c?.email ? [sha(c.email)] : undefined,
      ph: ph ? [sha(ph.startsWith("55") ? ph : "55" + ph)] : undefined,
      fn: c?.name ? [sha(String(c.name).split(" ")[0])] : undefined,
      fbp: m.fbp || undefined, fbc: m.fbc || undefined,
      client_ip_address: m.ip || undefined, client_user_agent: m.ua || undefined,
    },
    custom_data: { currency: "BRL", value: amountCents / 100, content_type: "product", content_ids: [offerId] },
  }] };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    console.log("[meta] Purchase (PIX gerado)", id, r.status, (await r.text()).slice(0, 300));
  } catch (e) { console.error("[meta] falha", e); }
}

const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

// Query string de rastreamento (utm_*, fbclid, ttclid, click_id...) no formato "a=1&b=2", sem "?".
// Vem do navegador (body.utm); se faltar, tenta extrair da URL de origem.
function buildUtm(rawUtm: unknown, sourceUrl: unknown): string {
  let s = String(rawUtm ?? "").trim().replace(/^\?/, "");
  if (!s) {
    try { s = new URL(String(sourceUrl ?? "")).search.replace(/^\?/, ""); } catch { s = ""; }
  }
  // Remove parâmetros internos do próprio checkout (não são de rastreamento).
  const p = new URLSearchParams(s);
  ["p", "qtd"].forEach((k) => p.delete(k));
  return p.toString().slice(0, 1500);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = getUrl();

  // Diagnóstico: abra /api/create-pix?diag=1 no navegador. Só confere se a variável existe; nunca mostra a URL.
  if (req.method === "GET" && req.query?.diag) {
    let host = "";
    try { host = new URL(url).host; } catch { /* url inválida */ }
    return res.status(200).json({ gateway: "duttyfy", urlConfigured: !!url, urlValida: !!host, host });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });
  if (!url) return res.status(500).json({ error: "Pagamento não configurado (DUTTYFY_API_URL ausente)." });

  const { offerId, shipping, bumps, customer, address, fbp, fbc, sourceUrl, utm } = (req.body ?? {}) as any;
  const offer = OFFERS[offerId];
  if (!offer) return res.status(400).json({ error: "Oferta inválida." });

  const cpf = digits(customer?.cpf);
  let phone = digits(customer?.phone);
  if (phone.startsWith("55") && phone.length > 11) phone = phone.slice(2);
  const zip = digits(address?.cep);
  if (!customer?.name || !customer?.email || cpf.length !== 11 || phone.length < 10 || zip.length !== 8 ||
      !address?.street || !address?.number || !address?.neighborhood || !address?.city || !address?.state) {
    return res.status(400).json({ error: "Preencha todos os dados obrigatórios." });
  }

  const ship = SHIPPING[shipping];
  if (!ship) return res.status(400).json({ error: "Escolha uma opção de frete." });
  const bumpIds: string[] = Array.isArray(bumps) ? [...new Set<string>(bumps.map(String))].filter((b) => b in BUMPS) : [];

  // O valor total é calculado AQUI no servidor (em centavos): oferta + extras + frete.
  const amount = offer.priceCents + bumpIds.reduce((t, b) => t + BUMPS[b].priceCents, 0) + ship.priceCents;
  if (amount < 100) return res.status(400).json({ error: "Valor inválido." });

  const ip = String(req.headers["x-forwarded-for"] ?? "").split(",")[0].trim();

  // O Duttyfy aceita UM item por cobrança: o título resume o pedido e o preço é o total.
  const title = [offer.title, ...bumpIds.map((b) => BUMPS[b].title)].join(" + ").slice(0, 200);

  const utmStr = buildUtm(utm, sourceUrl);
  const payload = {
    amount,
    customer: {
      name: String(customer.name).trim(),
      document: cpf,
      email: String(customer.email).trim(),
      phone,
    },
    item: { title, price: amount, quantity: 1 },
    paymentMethod: "PIX",
    // Só envia utm quando existe: campo vazio pode causar erro 500 no gateway.
    ...(utmStr ? { utm: utmStr } : {}),
  };

  try {
    const ctrl = new AbortController();
    const t0 = Date.now();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    const raw = await r.text();
    let json: any = {};
    try { json = JSON.parse(raw); } catch { /* resposta não-JSON */ }
    console.log("Duttyfy resp", r.status, Date.now() - t0 + "ms", raw.slice(0, 300));
    if (!r.ok) {
      // Log sem dados pessoais: ajuda a diagnosticar (formato do telefone, tamanho do CPF, se tinha utm).
      console.error("Duttyfy error", r.status, JSON.stringify(json), JSON.stringify({
        amount, phoneLen: phone.length, phoneDDD: phone.slice(0, 2), cpfLen: cpf.length, temUtm: !!utmStr, titleLen: title.length,
      }));
      const detail = String(json?.error ?? json?.message ?? "");
      const msg = r.status === 401 || r.status === 403 || /chave api/i.test(detail)
        ? "Pagamento temporariamente indisponível. Tente novamente em instantes."
        : /cpf/i.test(detail)
          ? "CPF inválido. Confira e tente novamente."
          : r.status === 400 || r.status === 422
            ? `Confira os dados informados${detail ? ` (${detail.slice(0, 120)})` : ""}.`
            : "Não foi possível gerar o PIX. Tente novamente.";
      return res.status(502).json({ error: msg });
    }
    const tx = json?.data ?? json;
    const qrcode = tx?.pixCode ?? tx?.qrcode ?? tx?.qrCode;
    const id = tx?.transactionId ?? tx?.id;
    if (!id || !qrcode) {
      console.error("Resposta inesperada da Duttyfy", JSON.stringify(json));
      return res.status(502).json({ error: "Resposta inesperada do gateway de pagamento." });
    }
    await sendMetaPurchase(String(id), amount, String(offerId), customer, { fbp: String(fbp ?? ""), fbc: String(fbc ?? ""), url: String(sourceUrl ?? ""), ua: String(req.headers["user-agent"] ?? ""), ip });
    // Mesmo formato que o checkout já espera (id, qrcode, amount, status).
    return res.status(200).json({
      id: String(id),
      qrcode: String(qrcode),
      expirationDate: null,
      amount,
      status: "waiting_payment",
    });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "AbortError";
    console.error(timeout ? "Duttyfy TIMEOUT (sem resposta em 9s)" : "Duttyfy falha de rede", e);
    return res.status(502).json({ error: timeout ? "O gateway de pagamento demorou para responder. Tente novamente." : "Falha de comunicação com o gateway de pagamento." });
  }
}
