function norm(s){ return s.replace(/ё/g,'е').toLowerCase(); }
//
function toks(s){ return norm(s).split(/[^a-zа-я0-9]+/).filter(w=>w.length>1); }
//
function renderSlots(){
  const c = document.getElementById('slots'); c.innerHTML='';
  for(let i=0;i<7;i++){
    const d = document.createElement('div'); d.className='slot';
    d.innerHTML = '<div class="slot-label">Вопрос '+(i+1)+'</div>'
      + '<input id="in'+i+'" autocomplete="off" placeholder="Начните печатать вопрос или выберите из банка ниже">'
      + '<div class="ac" id="ac'+i+'"></div>'
      + '<div id="ans'+i+'"></div>';
    c.appendChild(d);
    const inp = document.getElementById('in'+i);
    inp.addEventListener('input', ()=>showAC(i));
    inp.addEventListener('blur', ()=>setTimeout(()=>hideAC(i),180));
    if(state[i]!=null) inp.value = DATA[state[i]].q;
  }
}
function showAC(i){
  const val = document.getElementById('in'+i).value.trim();
  console.log(val);
  const ac = document.getElementById('ac'+i);
  if(!val){ ac.style.display='none'; state[i]=null; document.getElementById('ans'+i).innerHTML=''; return; }
  const words = toks(val);
  const scored = [];
  DATA.forEach(d=>{
    const qt = toks(d.q);
    let hit = 0, partial = 0;
    words.forEach(w=>{
      if(qt.some(t=>t===w)) hit++;
      else if(qt.some(t=>t.startsWith(w))) partial++;
    });
    if(hit>0||partial>0) scored.push({d, score: hit*2 + partial, exact: hit===words.length});
  });
  scored.sort((a,b)=>(b.exact-a.exact)||b.score-a.score);
  const top = scored.slice(0,8);
  ac.innerHTML = top.length
    ? top.map(s=>'<div class="ac-item" onclick="pick('+i+','+s.d.id+')">'+s.d.q+'<span class="t">'+s.d.theme+'</span></div>').join('')
    : '<div class="ac-empty">Точных совпадений нет — нажмите «Собрать ответы» или загляните в банк ниже</div>';
  ac.style.display='block';
}
function hideAC(i){ document.getElementById('ac'+i).style.display='none'; }
function pick(i,id){
  state[i]=id;
  document.getElementById('in'+i).value = DATA[id].q;
  hideAC(i); renderCard(i);
}
function renderCard(i){
  const box = document.getElementById('ans'+i);
  if(state[i]==null){ box.innerHTML=''; return; }
  const d = DATA[state[i]];
  const saved = localStorage.getItem('cmt_'+d.id)||'';
  box.innerHTML = '<div class="card">'
    + '<span class="chip" style="background:'+THEMES[d.theme]+'">'+d.theme+'</span>'
    + '<div class="q">'+d.q+'</div>'
    + '<div class="a">'+esc(d.a)+'</div>'
    + '<div class="comment"><span class="ch">💡 Комментарий:</span> '+esc(d.c)+'</div>'
    + '<div class="ucmt noprint"><label>Свой комментарий (сохранится в браузере и попадёт в скачанный файл):</label>'
    + '<textarea placeholder="Например: этот вопрос у нас спрашивают про…" oninput="saveCmt('+d.id+',this.value)">'+esc(saved)+'</textarea></div>'
    + '</div>';
}
function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function saveCmt(id,v){ localStorage.setItem('cmt_'+id, v); }
function collect(){
  for(let i=0;i<7;i++){
    const val = document.getElementById('in'+i).value.trim();
    if(!val) continue;
    const words = toks(val);
    let best=null,bs=0;
    DATA.forEach(d=>{
      const qt=toks(d.q); let hit=0,partial=0;
      words.forEach(w=>{ if(qt.some(t=>t===w))hit++; else if(qt.some(t=>t.startsWith(w)))partial++; });
      const sc=hit*2+partial;
      if(hit>0 && sc>bs){bs=sc;best=d;}
    });
    if(best && best.q.toLowerCase()===val.toLowerCase()) state[i]=best.id;
    else if(best && bs>=words.length*2) state[i]=best.id;
    else { state[i]=best?best.id:null; if(!best) alert('В поле '+(i+1)+': совпадение не найдено. Проверьте формулировку или выберите вопрос из банка.'); }
  }
  renderAllCards();
}
function renderAllCards(){ for(let i=0;i<7;i++) renderCard(i); }
function randomTicket(){
  const byTheme={}; DATA.forEach(d=>{ (byTheme[d.theme]=byTheme[d.theme]||[]).push(d.id); });
  const pick=[];
  Object.keys(byTheme).forEach(t=>{ pick.push(byTheme[t][Math.floor(Math.random()*byTheme[t].length)]); });
  const rest=DATA.map(d=>d.id).filter(id=>!pick.includes(id));
  while(pick.length<7 && rest.length){ pick.push(rest.splice(Math.floor(Math.random()*rest.length),1)[0]); }
  for(let i=pick.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pick[i],pick[j]]=[pick[j],pick[i]]; }
  for(let i=0;i<7;i++){ state[i]=(i<pick.length)?pick[i]:null; if(state[i]==null) document.getElementById('in'+i).value=''; else document.getElementById('in'+i).value=DATA[state[i]].q; }
  renderAllCards();
}
function clearAll(){ for(let i=0;i<7;i++){ state[i]=null; document.getElementById('in'+i).value=''; document.getElementById('ans'+i).innerHTML=''; } }
function renderBank(){
  const val = document.getElementById('bankSearch').value.trim();
  const words = toks(val);
  let out=''; let lastTheme='';
  const list = val ? DATA.filter(d=>words.every(w=>toks(d.q).some(t=>t.startsWith(w)))) : DATA;
  list.forEach(d=>{
    if(d.theme!==lastTheme){ out+='<div class="group-title">'+d.theme+'</div>'; lastTheme=d.theme; }
    out+='<div class="qitem" onclick="bankPick('+d.id+')">'+d.q+'<span class="t">'+d.theme+'</span></div>';
  });
  document.getElementById('bankList').innerHTML = out || '<div class="ac-empty">Ничего не найдено</div>';
}
function bankPick(id){
  const free = state.findIndex(s=>s==null);
  const target = free>=0 ? free : 0;
  pick(target,id);
  document.getElementById('in'+target).scrollIntoView({behavior:'smooth',block:'center'});
}
function downloadStatic(){
  const filled = state.filter(s=>s!=null);
  if(!filled.length){ alert('Билет пуст — сначала подберите вопросы.'); return; }
  let cards='';
  state.forEach((id,i)=>{
    if(id==null) return;
    const d=DATA[id]; const saved=localStorage.getItem('cmt_'+id)||'';
    cards+='<div class="card"><span class="chip" style="background:'+THEMES[d.theme]+'">'+d.theme+'</span>'
      +'<div class="q">Вопрос '+(i+1)+'. '+esc(d.q)+'</div>'
      +'<div class="a">'+esc(d.a)+'</div>'
      +'<div class="comment"><span class="ch">💡 Комментарий:</span> '+esc(d.c)+'</div>'
      +(saved?'<div class="comment"><span class="ch">✍️ Заметка:</span> '+esc(saved)+'</div>':'')
      +'</div>';
  });
  const html='<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Билет</title><style>'
    +'body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;margin:0;padding:16px;background:#fff;color:#2c3e50;line-height:1.55}'
    +'h1{text-align:center;font-size:1.4rem}.card{border:1px solid #ddd;border-radius:10px;padding:14px 16px;margin:0 auto 14px;max-width:820px}'
    +'.chip{display:inline-block;font-size:.78rem;padding:3px 10px;border-radius:20px;color:#fff;margin-bottom:8px}'
    +'.q{font-weight:600;font-size:1.05rem;margin-bottom:8px}.a{white-space:pre-wrap;font-size:.97rem}'
    +'.comment{margin-top:12px;background:#fff8e1;border-left:4px solid #f6b93b;border-radius:6px;padding:10px 12px;font-size:.92rem}'
    +'.comment .ch{font-weight:600;color:#b7791f}</style></head><body>'
    +'<h1>Экзаменационный билет</h1>'+cards+'</body></html>';
  const blob=new Blob([html],{type:'text/html'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='билет_с_ответами.html'; a.click(); URL.revokeObjectURL(a.href);
}
renderSlots(); renderBank();