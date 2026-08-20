import { FIREBASE } from "./firebase-config.js";
import { getFirebase, demoGet, demoSet } from "./firebase-service.js";
import { rounds, events, clampCompany } from "./game.js";

let roomCode=null, companyId=null, room=null, company=null, lastEventNonce=null;
const $=s=>document.querySelector(s);

const toast=t=>{
  const x=$("#toast");
  if(!x) return;
  x.textContent=t;
  x.classList.remove("hidden");
  setTimeout(()=>x.classList.add("hidden"),2400)
};

const safeId=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,30)+"-"+Math.floor(Math.random()*999);

async function getRoom(){
  const f=await getFirebase();
  if(f){
    const s=await f.get(f.ref(f.db,`rooms/${roomCode}`));
    return s.val();
  }
  return demoGet(`room:${roomCode}`,null);
}

async function saveCompany(){
  company=clampCompany(company);
  const f=await getFirebase();

  if(f) {
    await f.set(f.ref(f.db,`rooms/${roomCode}/companies/${companyId}`),company);
  } else {
    room=demoGet(`room:${roomCode}`,room);
    room.companies=room.companies||{};
    room.companies[companyId]=company;
    demoSet(`room:${roomCode}`,room);
  }
  render();
}

async function sendNegotiation(payload){
  const f=await getFirebase();
  const id="n-"+Date.now();
  if(f) await f.set(f.ref(f.db,`rooms/${roomCode}/negotiations/${id}`),payload);
  else {
    room=demoGet(`room:${roomCode}`,room);
    room.negotiations=room.negotiations||{};
    room.negotiations[id]=payload;
    demoSet(`room:${roomCode}`,room);
  }
}

async function listen(){
  const f=await getFirebase();
  if(f){
    f.onValue(f.ref(f.db,`rooms/${roomCode}`),s=>{
      room=s.val()||room;
      company=room?.companies?.[companyId]||company;
      onRoomChange();
    });
  } else {
    setInterval(()=>{
      room=demoGet(`room:${roomCode}`,room);
      company=room?.companies?.[companyId]||company;
      onRoomChange();
    },900);
  }
}

function onRoomChange(){
  render();

  if(room?.currentEvent?.nonce && room.currentEvent.nonce!==lastEventNonce){
    lastEventNonce=room.currentEvent.nonce;
    showEvent(room.currentEvent.id);
  }

  const incoming=Object.entries(room?.negotiations||{})
    .filter(([id,n])=>n.to===company.name && !n.seenBy?.[companyId]);

  incoming.slice(-1).forEach(([id,n])=>notify(`🤝 Proposta de ${n.from}: ${n.message}`));
}

function notify(t){
  const d=document.createElement("div");
  d.className="notification";
  d.textContent=t;
  $("#notificacoes").prepend(d);
}

function investmentHtml(){
  const saved = company.investmentPlan || {
    estrutura: 0,
    pessoas: 0,
    marketing: 0,
    tecnologia: 0,
    estoque: 0,
    reserva: 0
  };

  return `
    <div class="stack">
      <p class="muted">
        Distribua os ADM$ 100.000 entre as seis áreas. O total não pode ultrapassar o caixa disponível.
        A Reserva Financeira permanece no caixa e melhora a proteção da empresa.
      </p>

      <label>🏢 Estrutura</label>
      <input id="invEstrutura" type="number" min="0" step="1000" value="${saved.estrutura || 0}">

      <label>👥 Funcionários / Pessoas</label>
      <input id="invPessoas" type="number" min="0" step="1000" value="${saved.pessoas || 0}">

      <label>📣 Marketing</label>
      <input id="invMarketing" type="number" min="0" step="1000" value="${saved.marketing || 0}">

      <label>💻 Tecnologia</label>
      <input id="invTecnologia" type="number" min="0" step="1000" value="${saved.tecnologia || 0}">

      <label>📦 Estoque / Produção</label>
      <input id="invEstoque" type="number" min="0" step="1000" value="${saved.estoque || 0}">

      <label>🛟 Reserva Financeira</label>
      <input id="invReserva" type="number" min="0" step="1000" value="${saved.reserva || 0}">

      <div class="notification" id="investmentSummary">
        Total alocado: ADM$ 0 • Saída real do caixa: ADM$ 0 • Saldo projetado: ADM$ ${Number(company.caixa||0).toLocaleString("pt-BR")}
      </div>

      <button class="primary" id="confirmarPlanoInvest">CONFIRMAR PLANO DE INVESTIMENTOS</button>
    </div>
  `;
}

function bindInvestmentPlan(){
  const ids = ["invEstrutura","invPessoas","invMarketing","invTecnologia","invEstoque","invReserva"];
  const inputs = ids.map(id=>$("#"+id)).filter(Boolean);
  if(!inputs.length) return;

  const values = () => ({
    estrutura: Math.max(0, Number($("#invEstrutura")?.value || 0)),
    pessoas: Math.max(0, Number($("#invPessoas")?.value || 0)),
    marketing: Math.max(0, Number($("#invMarketing")?.value || 0)),
    tecnologia: Math.max(0, Number($("#invTecnologia")?.value || 0)),
    estoque: Math.max(0, Number($("#invEstoque")?.value || 0)),
    reserva: Math.max(0, Number($("#invReserva")?.value || 0))
  });

  const updateSummary = () => {
    const v = values();
    const total = Object.values(v).reduce((a,b)=>a+b,0);
    const gasto = v.estrutura + v.pessoas + v.marketing + v.tecnologia + v.estoque;
    const saldo = Number(company.caixa||0) - gasto;
    const box = $("#investmentSummary");
    if(box){
      box.textContent = `Total alocado: ADM$ ${total.toLocaleString("pt-BR")} • Saída real do caixa: ADM$ ${gasto.toLocaleString("pt-BR")} • Saldo projetado: ADM$ ${saldo.toLocaleString("pt-BR")}`;
    }
  };

  inputs.forEach(i=>i.addEventListener("input", updateSummary));
  updateSummary();

  const btn = $("#confirmarPlanoInvest");
  if(!btn) return;

  btn.onclick = async()=>{
    if(company.lastDecisionRound===room.round){
      toast("A decisão desta rodada já foi registrada.");
      return;
    }

    const v = values();
    const total = Object.values(v).reduce((a,b)=>a+b,0);
    const gasto = v.estrutura + v.pessoas + v.marketing + v.tecnologia + v.estoque;
    const caixaAtual = Number(company.caixa || 0);

    if(total <= 0){
      toast("Distribua algum valor entre as áreas.");
      return;
    }
    if(total > caixaAtual){
      toast("O total alocado não pode ultrapassar o caixa disponível.");
      return;
    }

    company.investmentPlan = v;
    company.reservaFinanceira = v.reserva;
    company.caixa = caixaAtual - gasto;

    company.reputacao += Math.floor(v.estrutura / 10000) * 2;
    company.equipe += Math.floor(v.pessoas / 10000) * 5;
    company.clientes += Math.floor(v.marketing / 5000) * 2;
    company.inovacao += Math.floor(v.tecnologia / 5000) * 3;
    company.clientes += Math.floor(v.estoque / 10000);
    company.reputacao += Math.floor(v.estoque / 20000);

    company.escudo = (company.escudo || 0) + Math.floor(v.reserva / 20000);

    const areasUsadas = Object.values(v).filter(x=>x>0).length;
    company.xp += 6 + areasUsadas;
    company.lastDecisionRound = room.round;

    await saveCompany();
    notify(
      `💰 Plano de investimentos confirmado. Estrutura ${v.estrutura.toLocaleString("pt-BR")}, Pessoas ${v.pessoas.toLocaleString("pt-BR")}, Marketing ${v.marketing.toLocaleString("pt-BR")}, Tecnologia ${v.tecnologia.toLocaleString("pt-BR")}, Estoque ${v.estoque.toLocaleString("pt-BR")}, Reserva ${v.reserva.toLocaleString("pt-BR")}.`
    );
    toast("Plano de investimentos registrado!");
  };
}

async function submitAuctionBid(amount){
  if(!room?.auction || room.auction.status!=="open"){
    toast("O leilão não está aberto.");
    return;
  }

  const value=Math.floor(Number(amount||0));
  const min=Number(room.auction.minBid||0);

  if(!Number.isFinite(value) || value<=0){
    toast("Digite um lance válido.");
    return;
  }
  if(value<min){
    toast(`O lance mínimo é ADM$ ${min.toLocaleString("pt-BR")}.`);
    return;
  }
  if(value>Number(company.caixa||0)){
    toast("O lance não pode ultrapassar o caixa da empresa.");
    return;
  }

  const payload={
    companyId,
    companyName:company.name,
    amount:value,
    createdAt:Date.now()
  };

  const f=await getFirebase();
  if(f){
    await f.set(
      f.ref(f.db,`rooms/${roomCode}/auction/bids/${companyId}`),
      payload
    );
  } else {
    room=demoGet(`room:${roomCode}`,room);
    room.auction=room.auction||{};
    room.auction.bids=room.auction.bids||{};
    room.auction.bids[companyId]=payload;
    demoSet(`room:${roomCode}`,room);
  }

  toast("🔒 Lance secreto enviado ao professor!");
  notify(`🔨 Lance de ADM$ ${value.toLocaleString("pt-BR")} registrado. As outras empresas não veem o seu valor.`);
}

function auctionHtml(){
  const a=room?.auction;
  if(!a) return `<p class="muted">Aguardem o professor abrir o leilão.</p>`;

  const myBid=a.bids?.[companyId];
  const min=Number(a.minBid||0).toLocaleString("pt-BR");

  if(a.status==="open"){
    return `
      <div class="stack">
        <div class="notification">
          <strong>${a.title||"🔨 Item em disputa"}</strong><br>
          ${a.description||""}<br><br>
          <strong>Lance mínimo:</strong> ADM$ ${min}<br>
          <strong>Seu caixa atual:</strong> ADM$ ${Number(company.caixa||0).toLocaleString("pt-BR")}
        </div>
        <label>Seu lance secreto</label>
        <input id="valorLance" type="number" min="${Number(a.minBid||0)}" max="${Number(company.caixa||0)}"
          value="${myBid ? Number(myBid.amount||0) : Number(a.minBid||0)}">
        <button class="primary" id="enviarLance">
          ${myBid ? "ATUALIZAR LANCE SECRETO" : "ENVIAR LANCE SECRETO"}
        </button>
        <p class="muted">🔒 Apenas o professor verá os valores dos lances. Você pode atualizar o seu lance enquanto o leilão estiver aberto.</p>
        ${myBid ? `<p><strong>✅ Lance registrado:</strong> ADM$ ${Number(myBid.amount||0).toLocaleString("pt-BR")}</p>` : ""}
      </div>
    `;
  }

  if(a.status==="closed"){
    if(a.winnerId===companyId){
      return `
        <div class="notification">
          🏆 <strong>SUA EMPRESA VENCEU O LEILÃO!</strong><br>
          ${a.title||""}<br>
          Valor pago: <strong>ADM$ ${Number(a.winningBid||0).toLocaleString("pt-BR")}</strong><br>
          O prêmio já foi colocado no Inventário Estratégico.
        </div>
      `;
    }
    return `
      <div class="notification">
        🔨 <strong>Leilão encerrado.</strong><br>
        ${a.winnerName
          ? `Vencedora: <strong>${a.winnerName}</strong> — ADM$ ${Number(a.winningBid||0).toLocaleString("pt-BR")}`
          : "Não houve lance vencedor."}
      </div>
    `;
  }

  return `<p class="muted">Aguardem instruções do professor.</p>`;
}

function render(){
  if(!company||!room)return;

  $("#empresaNome").textContent=company.name;
  $("#empresaSegmento").textContent=company.segment;
  $("#salaPill").textContent=`Sala ${roomCode}`;
  $("#fasePill").textContent=room.status||"Aguardando";

  $("#caixa").textContent="ADM$ "+Number(company.caixa).toLocaleString("pt-BR");
  $("#clientes").textContent=company.clientes;
  $("#reputacao").textContent=company.reputacao;
  $("#equipe").textContent=company.equipe+"%";
  $("#inovacao").textContent=company.inovacao;
  $("#xp").textContent=company.xp;

  if($("#escudo")) $("#escudo").textContent=company.escudo||0;
  if($("#pesquisa")) $("#pesquisa").textContent=company.pesquisa||0;
  if($("#campanha")) $("#campanha").textContent=company.campanha||0;

  const r=rounds[(room.round||1)-1];
  $("#missaoTexto").textContent=r?r.text:"Aguarde o início.";
  $("#decisaoArea").innerHTML=decisionHtml(room.round||0);

  bindDecision();
  bindInvestmentPlan();
  bindAuction();
}

function decisionHtml(r){
  if(r===1)return `<div class="stack"><button data-d="crescimento">🚀 Foco em crescimento</button><button data-d="equilibrio">⚖️ Gestão equilibrada</button><button data-d="seguranca">🛡️ Segurança financeira</button></div>`;
  if(r===2)return investmentHtml();
  if(r===3)return auctionHtml();
  if(r===4)return `<div class="stack"><button data-d="preco">💲 Competir por preço</button><button data-d="qualidade">💎 Competir por qualidade</button><button data-d="pessoas">👥 Investir em pessoas</button><button data-d="inovacao">💡 Inovar</button></div>`;
  if(r===7)return `<p><b>⚡ BATALHA:</b> Uma empresa pode aumentar as vendas e, ao mesmo tempo, piorar o caixa?</p><div class="stack"><button data-d="quiz-sim">SIM</button><button data-d="quiz-nao">NÃO</button></div>`;
  if(r===8)return `<p><b>👾 BOSS FINAL:</b> Custos +15%, vendas -20%. Escolham a reação principal.</p><div class="stack"><button data-d="boss-reserva">🛡️ Usar reserva e renegociar</button><button data-d="boss-corte">✂️ Cortar investimentos</button><button data-d="boss-credito">🏦 Tomar crédito</button></div>`;
  return `<p class="muted">Esta rodada depende da interação do professor, eventos ou negociações.</p>`;
}

function bindAuction(){
  const b=$("#enviarLance");
  if(!b)return;

  b.onclick=async()=>{
    b.disabled=true;
    try{
      await submitAuctionBid($("#valorLance")?.value);
    }catch(e){
      console.error(e);
      toast(`Não foi possível enviar o lance: ${e.message}`);
    }finally{
      b.disabled=false;
    }
  };
}

function bindDecision(){
  document.querySelectorAll("[data-d]").forEach(b=>b.onclick=async()=>{
    const d=b.dataset.d;

    if(company.lastDecisionRound===room.round){
      toast("A decisão desta rodada já foi registrada.");
      return;
    }

    if(d==="crescimento"){company.caixa-=10000;company.clientes+=8;company.xp+=10}
    if(d==="equilibrio"){company.reputacao+=5;company.xp+=10}
    if(d==="seguranca"){company.escudo=(company.escudo||0)+1;company.xp+=8}
    if(d==="preco"){company.caixa+=8000;company.clientes+=8;company.reputacao-=2;company.xp+=7}
    if(d==="qualidade"){company.caixa-=7000;company.reputacao+=8;company.xp+=9}
    if(d==="pessoas"){company.caixa-=5000;company.equipe+=10;company.xp+=9}
    if(d==="inovacao"){company.caixa-=9000;company.inovacao+=12;company.xp+=11}
    if(d==="quiz-sim"){company.xp+=10;notify("✅ Correto: vendas não significam necessariamente melhora do caixa.")}
    if(d==="quiz-nao"){company.xp=Math.max(0,company.xp-2);notify("❌ Revejam: faturamento, custos e fluxo de caixa são diferentes.")}
    if(d==="boss-reserva"){company.caixa-=5000;company.reputacao+=6;company.xp+=18}
    if(d==="boss-corte"){company.caixa+=3000;company.equipe-=7;company.inovacao-=2;company.xp+=10}
    if(d==="boss-credito"){company.caixa+=20000;company.xp+=8}

    company.lastDecisionRound=room.round;
    await saveCompany();
    toast("Decisão registrada!");
  });
}

function showEvent(id){
  const ev=events[id];
  if(!ev)return;

  $("#eventoTitulo").textContent=ev.title;
  $("#eventoTexto").textContent=ev.text;
  $("#eventoOpcoes").innerHTML=ev.options.map((o,i)=>`<button data-o="${i}">${o.label}</button>`).join("");
  $("#modalEvento").classList.remove("hidden");

  document.querySelectorAll("[data-o]").forEach(b=>b.onclick=async()=>{
    const d=ev.options[Number(b.dataset.o)].delta;
    Object.entries(d).forEach(([k,v])=>company[k]=(company[k]||0)+v);
    await saveCompany();
    $("#modalEvento").classList.add("hidden");
    notify(`Evento resolvido: ${ev.title}`);
    toast("Consequências aplicadas.");
  });
}

function normalizeName(s){
  return String(s||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
}

function findExistingCompany(name){
  const target=normalizeName(name);
  return Object.values(room?.companies||{}).find(c=>normalizeName(c?.name)===target)||null;
}

function ensureCompanyAccessFields(){
  const entrada=$("#entrada");
  if(!entrada || $("#senhaEmpresa")) return;
  const entrar=$("#entrar");
  if(!entrar) return;

  const wrap=document.createElement("div");
  wrap.className="stack company-access-extra";
  wrap.innerHTML=`
    <label for="senhaEmpresa">Senha da empresa</label>
    <input id="senhaEmpresa" type="password" autocomplete="current-password" placeholder="Crie ou digite a senha da empresa" minlength="4" maxlength="30">
    <p class="muted" style="margin:0">Primeiro acesso: crie uma senha. Nos próximos acessos, use a mesma sala, o mesmo nome da empresa e esta senha.</p>`;
  entrar.parentNode.insertBefore(wrap,entrar);
}

function rememberAccess(){
  try{
    localStorage.setItem("adm360:lastCompanyAccess",JSON.stringify({
      roomCode,
      companyId,
      name:company?.name||""
    }));
  }catch{}
}

async function enterCompany(){
  roomCode=$("#codigo")?.value.trim().toUpperCase();
  const name=$("#nomeEmpresa")?.value.trim();
  const password=$("#senhaEmpresa")?.value.trim();

  if(!roomCode||!name||!password){
    toast("Informe o código da sala, o nome e a senha da empresa.");
    return;
  }

  if(password.length<4){
    toast("A senha da empresa deve ter pelo menos 4 caracteres.");
    return;
  }

  room=await getRoom();

  if(!room){
    toast("Sala não encontrada. Confira o código informado.");
    return;
  }

  const existing=findExistingCompany(name);

  if(existing){
    if(!existing.accessPassword){
      existing.accessPassword=password;
      existing.passwordCreatedAt=Date.now();
    } else if(String(existing.accessPassword)!==password){
      toast("Senha da empresa incorreta.");
      return;
    }

    companyId=existing.id;
    company=existing;

    await saveCompany();
    toast(`Empresa ${company.name} recuperada. Progresso mantido.`);
  } else {
    companyId=safeId(name);

    company={
      id:companyId,
      name,
      segment:$("#segmento")?.value||"",
      accessPassword:password,
      passwordCreatedAt:Date.now(),
      caixa:100000,
      clientes:50,
      reputacao:50,
      equipe:100,
      inovacao:0,
      xp:0,
      escudo:0,
      pesquisa:0,
      campanha:0,
      joinedAt:Date.now()
    };

    await saveCompany();
    toast(`Empresa ${company.name} criada. Guarde a senha para retornar.`);
  }

  rememberAccess();

  $("#entrada")?.classList.add("hidden");
  $("#jogo")?.classList.remove("hidden");

  await listen();
  render();
}

ensureCompanyAccessFields();

$("#entrar")?.addEventListener("click",async()=>{
  const b=$("#entrar");
  if(b) b.disabled=true;

  try{
    await enterCompany();
  }catch(e){
    console.error(e);
    toast(`Não foi possível entrar: ${e.message}`);
  }finally{
    if(b) b.disabled=false;
  }
});

$("#enviarProposta").addEventListener("click",async()=>{
  if(!company)return;

  const to=$("#destino").value.trim();
  const message=$("#proposta").value.trim();

  if(!to||!message){
    toast("Informe a empresa e a proposta.");
    return;
  }

  await sendNegotiation({
    from:company.name,
    to,
    message,
    createdAt:Date.now()
  });

  $("#proposta").value="";
  toast("Proposta enviada!");
});
