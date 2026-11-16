const FEATURED=[
 {t:"Kit 2 Luminárias Poste Solar 2200W com Sensor de Presença e Controle Remoto",cat:"Casa e cozinha",href:"/produto/luminaria/",img:"/assets/luminaria.webp",old:45002,price:10990,note:"em 10x de R$ 10,99 sem juros"},
 {t:"Kit 4 em 1 Ferramentas 48V com Martelete, Esmerilhadeira, Parafusadeira e Chave de Impacto",cat:"Ferramentas",href:"/produto/ferramenta/",img:"/assets/ferramenta.webp",old:63999,price:12999},
 {t:"Serra Mármore Vonder SMV 1300S 1300W Amarela e Preta - Leve Duas",cat:"Ferramentas",href:"/produto/serra-marmore/",img:"/assets/serra-marmore.webp",old:13990,price:9790},
 {t:"Lavadora de Alta Pressão Portátil MOHOR 3800W 140 Bar com Mangueira de 7 Metros",cat:"Ferramentas",href:"/produto/lavadora/",img:"/assets/lavadora.webp",old:14700,price:9790}
];
let all=[],shown=0,filtered=[];
const grid=document.querySelector('#catalog-grid'),search=document.querySelector('#search'),filter=document.querySelector('#filter'),more=document.querySelector('#more');
const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const norm=s=>(s||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function card(p){
  const a=document.createElement('article');a.className='item';
  const pic=document.createElement('a');pic.className='pic';pic.href=p.href;pic.setAttribute('aria-label','Ver '+p.title);
  if(p.old>p.price){const f=document.createElement('span');f.className='flag';f.textContent=Math.round((1-p.price/p.old)*100)+'% OFF';pic.append(f)}
  const img=document.createElement('img');img.src=p.img;img.loading='lazy';img.alt=p.title;pic.append(img);a.append(pic);
  const t=document.createElement('div');t.className='txt';
  const h=document.createElement('h3');h.textContent=p.title;t.append(h);
  const pr=document.createElement('div');pr.className='price';
  if(p.old>p.price){const s=document.createElement('s');s.textContent=money(p.old);pr.append(s)}
  const st=document.createElement('strong');st.textContent=money(p.price);pr.append(st);
  if(p.note){const sp=document.createElement('span');sp.textContent=p.note;pr.append(sp)}
  t.append(pr);
  const fr=document.createElement('p');fr.className='free';fr.textContent='Frete grátis';t.append(fr);
  const b=document.createElement('a');b.className='btn';b.href=p.href;b.textContent='Ver produto';t.append(b);
  a.append(t);return a}
function update(){const q=norm(search.value);
  filtered=all.filter(p=>(!filter.value||p.cat===filter.value)&&norm(p.title+' '+p.cat).includes(q));
  shown=0;grid.replaceChildren();
  if(!filtered.length){grid.textContent='Nenhum produto encontrado para essa busca.';more.hidden=true;return}
  add()}
function add(){const part=filtered.slice(shown,shown+24);grid.append(...part.map(card));shown+=part.length;more.hidden=shown>=filtered.length}
fetch('/catalog/products.json').then(r=>r.json()).then(items=>{
  const cat=items.map(p=>{const v=p.variants[0];return{title:p.title,cat:p.category,href:'/produto/?id='+encodeURIComponent(p.id),img:p.images[0]||v.image||'/assets/logo.png',old:v.compareCents||0,price:v.priceCents}});
  all=[...FEATURED.map(f=>({title:f.t,cat:f.cat,href:f.href,img:f.img,old:f.old,price:f.price,note:f.note})),...cat];
  update()}).catch(()=>{grid.textContent='Não foi possível carregar os produtos.'});
search.addEventListener('input',update);filter.addEventListener('change',update);more.addEventListener('click',add);
