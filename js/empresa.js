import { FIREBASE } from "./firebase-config.js";
import { getFirebase, demoGet, demoSet } from "./firebase-service.js";
import { rounds, events, clampCompany } from "./game.js";

let roomCode=null, companyId=null, room=null, company=null, lastEventNonce=null;
const $=s=>document.querySelector(s);
const toast=t=>{const x=$("#toast");x.textContent=t;x.classList.remove("hidden");setTimeout(()=>x.classList.add("hidden"),2400)};
const safeId=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,30)+"-"+Math.floor(Math.random()*999);

async function getRoom(){
  const f=await getFirebase();
  if(f){const s=await f.get(f.ref(f.db,`rooms/${roomCode}`));return s.val()}
  return demoGet(`room:${roomCode}`,null);
}
async function saveCompany(){
  company=clampCompany(company);
  const f=await getFirebase();
  if(f) await f.set(f.ref(f.db,`rooms/${roomCode}/companies/${companyId}`),company);
  else {room=demoGet(`room:${roomCode}`,room);room.companies=room.companies||{};room.companies[companyId]=company;demoSet(`room:${roomCode}`,room)}
  render();
}
async function sendNegotiation(payload){
  const f=await getFirebase();
  const id="n-"+Date.now();
  if(f) await f.set(f.ref(f.db,`rooms/${roomCode}/negotiations/${id}`),payload);
  else {room=demoGet(`room:${roomCode}`,room);room.negotiations=room.negotiations||{};room.negotiations[id]=payload;demoSet(`room:${roomCode}`,room)}
}
async function listen(){
  const f=await getFirebase();
  if(f){
    f.onValue(f.ref(f.db,`rooms/${roomCode}`),s=>{room=s.val()||room;company=room?.companies?.[companyId]||company;onRoomChange()});
  } else {
    setInterval(()=>{room=demoGet(`room:${roomCode}`,room);company=room?.companies?.[companyId]||company;onRoomChange()},900);
  }
}
function onRoomChange(){
  render();
  if(room?.currentEvent?.nonce && room.currentEvent.nonce!==lastEventNonce){
    lastEventNonce=room.currentEvent.nonce;showEvent(room.currentEvent.id);
  }
  const incoming=Object.entries(room?.negotiations||{}).filter(([id,n])=>n.to===company.name && !n.seenBy?.[companyId]);
  incoming.slice(-1).forEach(([id,n])=>notify(`🤝 Proposta de ${n.from}: ${n.message}`));
}
function notify(t){const d=document.createElement("div");d.className="notification";d.textContent=t;$("#notificacoes").prepend(d)}
function render(){
  if(!company||!room)return;
  $("#empresaNome").textContent=company.name;$("#empresaSegmento").textContent=company.segment;
  $("#salaPill").textContent=`Sala ${roomCode}`;$("#fasePill").textContent=room.status||"Aguardando";
  $("#caixa").textContent="ADM$ "+Number(company.caixa).toLocaleString("pt-BR");
  $("#clientes").textContent=company.clientes;$("#reputacao").textContent=company.reputacao;
  $("#equipe").textContent=company.equipe+"%";$("#inovacao").textContent=company.inovacao;$("#xp").textContent=company.xp;
  const r=rounds[(room.round||1)-1];$("#missaoTexto").textContent=r?r.text:"Aguarde o início.";
  $("#decisaoArea").innerHTML=decisionHtml(room.round||0);
  bindDecision();
}
function decisionHtml(r){
  if(r===1)return `<div class="stack"><button data-d="crescimento">🚀 Foco em crescimento</button><button data-d="equilibrio">⚖️ Gestão equilibrada</button><button data-d="seguranca">🛡️ Segurança financeira</button></div>`;
  if(r===2)return `<label>Quanto investir em marketing?</label><input id="valorInvest" type="number" min="0" max="50000" value="10000"><button class="primary" data-d="investir">CONFIRMAR INVESTIMENTO</button>`;
  if(r===4)return `<div class="stack"><button data-d="preco">💲 Competir por preço</button><button data-d="qualidade">💎 Competir por qualidade</button><button data-d="pessoas">👥 Investir em pessoas</button><button data-d="inovacao">💡 Inovar</button></div>`;
  if(r===7)return `<p><b>⚡ BATALHA:</b> Uma empresa pode aumentar as vendas e, ao mesmo tempo, piorar o caixa?</p><div class="stack"><button data-d="quiz-sim">SIM</button><button data-d="quiz-nao">NÃO</button></div>`;
  if(r===8)return `<p><b>👾 BOSS FINAL:</b> Custos +15%, vendas -20%. Escolham a reação principal.</p><div class="stack"><button data-d="boss-reserva">🛡️ Usar reserva e renegociar</button><button data-d="boss-corte">✂️ Cortar investimentos</button><button data-d="boss-credito">🏦 Tomar crédito</button></div>`;
  return `<p class="muted">Esta rodada depende da interação do professor, eventos ou negociações.</p>`;
}
function bindDecision(){
  document.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{
    const d=b.dataset.d;
    if(company.lastDecisionRound===room.round){toast("A decisão desta rodada já foi registrada.");return}
    if(d==="crescimento"){company.caixa-=10000;company.clientes+=8;company.xp+=10}
    if(d==="equilibrio"){company.reputacao+=5;company.xp+=10}
    if(d==="seguranca"){company.escudo=(company.escudo||0)+1;company.xp+=8}
    if(d==="investir"){const v=Math.max(0,Math.min(50000,Number($("#valorInvest").value||0)));company.caixa-=v;company.clientes+=Math.floor(v/2500);company.xp+=Math.min(12,Math.floor(v/2500))}
    if(d==="preco"){company.caixa+=8000;company.clientes+=8;company.reputacao-=2;company.xp+=7}
    if(d==="qualidade"){company.caixa-=7000;company.reputacao+=8;company.xp+=9}
    if(d==="pessoas"){company.caixa-=5000;company.equipe+=10;company.xp+=9}
    if(d==="inovacao"){company.caixa-=9000;company.inovacao+=12;company.xp+=11}
    if(d==="quiz-sim"){company.xp+=10;notify("✅ Correto: vendas não significam necessariamente melhora do caixa.")}
    if(d==="quiz-nao"){company.xp=Math.max(0,company.xp-2);notify("❌ Revejam: faturamento, custos e fluxo de caixa são diferentes.")}
    if(d==="boss-reserva"){company.caixa-=5000;company.reputacao+=6;company.xp+=18}
    if(d==="boss-corte"){company.caixa+=3000;company.equipe-=7;company.inovacao-=2;company.xp+=10}
    if(d==="boss-credito"){company.caixa+=20000;company.xp+=8}
    company.lastDecisionRound=room.round;await saveCompany();toast("Decisão registrada!");
  });
}
function showEvent(id){
  const ev=events[id];if(!ev)return;
  $("#eventoTitulo").textContent=ev.title;$("#eventoTexto").textContent=ev.text;
  $("#eventoOpcoes").innerHTML=ev.options.map((o,i)=>`<button data-o="${i}">${o.label}</button>`).join("");
  $("#modalEvento").classList.remove("hidden");
  document.querySelectorAll("[data-o]").forEach(b=>b.onclick=async()=>{
    const d=ev.options[Number(b.dataset.o)].delta;
    Object.entries(d).forEach(([k,v])=>company[k]=(company[k]||0)+v);
    await saveCompany();$("#modalEvento").classList.add("hidden");notify(`Evento resolvido: ${ev.title}`);toast("Consequências aplicadas.");
  });
}

$("#entrar").addEventListener("click",async()=>{
  roomCode=$("#codigo").value.trim().toUpperCase();const name=$("#nomeEmpresa").value.trim();
  if(!roomCode||!name){toast("Informe o código e o nome da empresa.");return}
  room=await getRoom();
  if(!room){toast("Sala não encontrada. No modo demonstração, crie a sala neste mesmo navegador.");return}
  companyId=safeId(name);
  company={id:companyId,name,segment:$("#segmento").value,caixa:100000,clientes:50,reputacao:50,equipe:100,inovacao:0,xp:0,escudo:0,pesquisa:0,campanha:0,joinedAt:Date.now()};
  await saveCompany();
  $("#entrada").classList.add("hidden");$("#jogo").classList.remove("hidden");await listen();render();
});
$("#enviarProposta").addEventListener("click",async()=>{
  if(!company)return;const to=$("#destino").value.trim(),message=$("#proposta").value.trim();
  if(!to||!message){toast("Informe a empresa e a proposta.");return}
  await sendNegotiation({from:company.name,to,message,createdAt:Date.now()});$("#proposta").value="";toast("Proposta enviada!");
});
