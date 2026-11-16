const $=s=>document.querySelector(s);
const money=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const id=new URLSearchParams(location.search).get('id');
let P,imgs=[],cur=0,vi=0;
function show(i){if(!imgs.length)return;cur=(i+imgs.length)%imgs.length;$('#mainImg').src=imgs[cur];$('#count').textContent=(cur+1)+' / '+imgs.length;document.querySelectorAll('#thumbs button').forEach((b,k)=>b.classList.toggle('on',k===cur))}
function setPrice(){const v=P.variants[vi];$('#price').textContent=money(v.priceCents);$('#stPrice').textContent=money(v.priceCents);
  const has=v.compareCents&&v.compareCents>v.priceCents;
  $('#oldPrice').hidden=!has;$('#stOld').hidden=!has;
  if(has){const o=money(v.compareCents),pct=Math.round((1-v.priceCents/v.compareCents)*100);$('#oldPrice').textContent=o;$('#stOld').textContent=o;$('#off').textContent=pct+'% OFF';$('#off').hidden=false;$('#flag').textContent=pct+'% OFF';$('#flag').hidden=false}else{$('#off').hidden=true;$('#flag').hidden=true}
  const href='/checkout/?p='+encodeURIComponent(P.id+'-'+(vi+1));
  ['#buy','#buy2','#buySt'].forEach(s=>{$(s).dataset.href=href});
  if(v.image){const k=imgs.indexOf(v.image);if(k>=0)show(k)}}
function go(e){e.preventDefault();const box=$('#comprar').getBoundingClientRect();const visible=box.top<innerHeight*.6&&box.bottom>innerHeight*.2;if(visible||e.currentTarget.id==='buy')location.href=e.currentTarget.dataset.href;else $('#comprar').scrollIntoView({behavior:'smooth',block:'start'})}
fetch('/catalog/products.json').then(r=>r.json()).then(items=>{
  P=items.find(x=>x.id===id);
  if(!P){$('#comprar').hidden=true;$('#sobre').hidden=true;$('#nf').hidden=false;return}
  document.title=P.title+' | Casa & Engenho';
  $('#title').textContent=P.title;$('#crumbTitle').textContent=P.title.length>60?P.title.slice(0,57)+'…':P.title;
  $('#crumbCat').textContent=P.category;$('#catLine').textContent=P.category;
  $('#description').innerHTML=P.description||'<p>Consulte as opções disponíveis.</p>';
  imgs=[...new Set([...(P.images||[]),...P.variants.map(v=>v.image).filter(Boolean)])].slice(0,14);
  if(!imgs.length)imgs=['/assets/logo.png'];
  $('#mainImg').alt=P.title;
  $('#thumbs').innerHTML=imgs.map((s,i)=>`<button class="${i?'':'on'}" data-i="${i}" aria-label="Foto ${i+1}"><img src="${s}" alt="" loading="lazy"></button>`).join('');
  $('#thumbs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)show(+b.dataset.i)});
  $('#prev').onclick=()=>show(cur-1);$('#next').onclick=()=>show(cur+1);
  if(P.variants.length>1){$('#variantsBox').hidden=false;const sel=$('#variant');sel.innerHTML=P.variants.map((v,i)=>`<option value="${i}">${v.label.replace(/</g,'&lt;')} — ${money(v.priceCents)}</option>`).join('');sel.addEventListener('change',()=>{vi=+sel.value;setPrice()})}
  show(0);setPrice();
  ['#buy','#buy2','#buySt'].forEach(s=>$(s).addEventListener('click',go));
}).catch(()=>{$('#title').textContent='Erro ao carregar o produto'});
