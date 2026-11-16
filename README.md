# Casa & Engenho

Base: layout de loja padronizado. Todas as páginas de produto usam o mesmo modelo (/produto/), com busca e coleção única na home.

## Catálogo
108 produtos agrupados, 256 variantes importadas dos arquivos CSV (Casa Ella, Vektor Fix e cooler). Produtos originais mantidos. Fotos externas dependem dos servidores de origem.

## Estrutura dos produtos
Tudo de produto fica dentro de `produto/`:
- `produto/` (index.html + product.js): modelo único dos 108 produtos do catálogo (`catalog/products.json`).
- `produto/ferramenta/`, `produto/lavadora/`, `produto/luminaria/`, `produto/serra-marmore/`: landing pages próprias.
- Os endereços antigos (`/ferramenta/`, `/lavadora/`, `/luminaria/`, `/serra-marmore/`) redirecionam para os novos (ver `vercel.json`).
- Todos os botões de compra levam ao checkout próprio: `/checkout/?p=<id>`.

## Onde mudar preço
O servidor é quem manda no valor cobrado, então o preço existe em mais de um lugar. Ao mudar, altere em todos:
1. `checkout/config.js` (valor mostrado no checkout)
2. `api/create-pix.ts` e `api/create-card.ts` (valor cobrado)
3. Vitrine/página: `catalog/products.json` (produtos do catálogo, em centavos) ou `catalog/catalog.js` + `CONFIG` do `script.js` da pasta do produto (landing pages)

## Deploy
1. Suba o conteúdo deste diretório na raiz de um repositório GitHub.
2. Importe o repositório na Vercel (Framework: Other).
3. Configure as variáveis de ambiente de acordo com os provedores: `DUTTYFY_API_URL` (PIX), `PAGOU_API_KEY` e `PAGOU_PUBLISHABLE_KEY` (cartão), além das variáveis opcionais de Meta. NÃO publique segredos no GitHub.
4. Teste PIX e cartão em ambiente seguro antes de aceitar pedidos reais.
5. Revise preços, estoque, imagens, prazos e políticas de entrega, além de cadastrar CNPJ e contato reais.

## Importante
O checkout foi preservado do projeto original, e as novas ofertas foram incluídas tanto no frontend quanto nas APIs, com preço validado no servidor. **Pagamentos não foram testados com credenciais reais**. As ofertas e informações de frete herdadas do site original devem ser conferidas antes da publicação.
