import { FIREBASE } from "./firebase-config.js";
import { getFirebase, demoGet, demoSet, roomCode } from "./firebase-service.js";
import { rounds, events } from "./game.js";

let currentRoom = null;
let roomData = null;
let unsubscribe = null;

const AUCTION_ITEMS = [
  { id:"pesquisa", title:"🔍 Pesquisa de Mercado Premium", description:"Entrega 1 Pesquisa de Mercado ao inventário da empresa vencedora.", field:"pesquisa", qty:1, minBid:5000 },
  { id:"escudo", title:"🛡️ Escudo Financeiro", description:"Entrega 1 Escudo Financeiro ao inventário da empresa vencedora.", field:"escudo", qty:1, minBid:6000 },
  { id:"campanha", title:"📣 Campanha Viral", description:"Entrega 1 Campanha Viral ao inventário da empresa vencedora.", field:"campanha", qty:1, minBid:7000 }
];

const $ = s => document.querySelector(s);
function toast(text, type="ok"){ const x=$("#toast"); if(!x)return; x.textContent=text; x.style.borderColor=type==="error"?"#ff5b6e":""; x.classList.remove("hidden"); setTimeout(()=>x.classList.add("hidden"),3500); }
function setBusy(busy){ const b=$("#criarSala"); if(!b)return; b.disabled=busy; b.textContent=busy?"CRIANDO SALA...":"CRIAR SALA"; }

async function saveRoom(){
  if(!currentRoom||!roomData)return;
  const f=await getFirebase();
  if(f) await f.set(f.ref(f.db,`rooms/${currentRoom}`),roomData);
  else demoSet(`room:${currentRoom}`,roomData);
  render();
}

async function listen(){
  const f=await getFirebase();
  if(unsubscribe)unsubscribe();
  if(f){
    const r=f.ref(f.db,`rooms/${currentRoom}`);
    unsubscribe=f.onValue(r,s=>{ roomData=s.val()||roomData; render(); });
  }
}

function ensureAuctionPanel(){
  let panel=$("#auctionTeacherPanel");
  if(panel)return panel;
  panel=document.createElement("section");
  panel.id="auctionTeacherPanel";
  panel.className="card glass hidden";
  panel.innerHTML=`
    <div class="section-title"><h2>🔨 Central do Leilão</h2><span id="auctionBidCount">0 lances</span></div>
    <div id="auctionTeacherInfo"></div>
    <div id="auctionTeacherBids" class="company-list"></div>
    <div style="margin-top:16px"><button id="encerrarLeilao" class="primary">ENCERRAR LEILÃO E DEFINIR VENCEDOR</button></div>`;
  const companiesSection=$("#empresas")?.closest("section");
  if(companiesSection)companiesSection.before(panel); else document.querySelector("main")?.appendChild(panel);
  $("#encerrarLeilao").addEventListener("click",closeAuction);
  return panel;
}

function renderAuctionTeacher(){
  const panel=ensureAuctionPanel(), a=roomData?.auction;
  if(!a){ panel.classList.add("hidden"); return; }
  panel.classList.remove("hidden");
  const bids=Object.values(a.bids||{});
  $("#auctionBidCount").textContent=`${bids.length} lance${bids.length===1?"":"s"}`;
  $("#auctionTeacherInfo").innerHTML=`
    <p><strong>${a.title||"Item em disputa"}</strong></p>
    <p class="muted">${a.description||""}</p>
    <p><strong>Lance mínimo:</strong> ADM$ ${Number(a.minBid||0).toLocaleString("pt-BR")} • <strong>Status:</strong> ${a.status==="open"?"ABERTO":"ENCERRADO"}</p>
    ${a.status==="closed" ? (a.winnerName ? `<p><strong>🏆 Vencedora:</strong> ${a.winnerName} — ADM$ ${Number(a.winningBid||0).toLocaleString("pt-BR")}</p>` : `<p><strong>Leilão encerrado sem lances válidos.</strong></p>`) : ""}`;
  $("#auctionTeacherBids").innerHTML=bids.length ? bids.sort((x,y)=>Number(y.amount||0)-Number(x.amount||0)).map(b=>`
    <div class="company-item"><div><strong>${b.companyName}</strong><br><small>Lance secreto recebido</small></div><span>💰 ADM$ ${Number(b.amount||0).toLocaleString("pt-BR")}</span></div>`).join("") : `<p class="muted">Nenhum lance recebido ainda.</p>`;
  const btn=$("#encerrarLeilao");
  btn.disabled=a.status!=="open";
  btn.textContent=a.status==="open"?"ENCERRAR LEILÃO E DEFINIR VENCEDOR":"LEILÃO ENCERRADO";
}


async function excluirEmpresa(companyId, companyName) {
  if (!currentRoom || !roomData) return;

  const confirmar = confirm(`Excluir a empresa "${companyName}" desta sala?`);
  if (!confirmar) return;

  try {
    const f = await getFirebase();

    if (f) {
      await f.remove(
        f.ref(f.db, `rooms/${currentRoom}/companies/${companyId}`)
      );
    } else {
      if (roomData.companies?.[companyId]) {
        delete roomData.companies[companyId];
        demoSet(`room:${currentRoom}`, roomData);
        render();
      }
    }

    toast(`Empresa "${companyName}" excluída.`);
  } catch (e) {
    console.error(e);
    toast(`Erro ao excluir empresa: ${e.message}`, "error");
  }
}

function render(){
  if(!roomData)return;
  $("#rodada").textContent=`${roomData.round||0}/8`;
  $("#status").textContent=roomData.status||"Aguardando";
  const comps=Object.values(roomData.companies||{});
  $("#qtdEmpresas").textContent=`${comps.length} empresa${comps.length===1?"":"s"}`;
  $("#empresas").classList.remove("empty");
  $("#empresas").innerHTML=comps.length ? comps.sort((a,b)=>(b.xp||0)-(a.xp||0)).map(c=>`
    <div class="company-item">
      <div><strong>${c.name}</strong><br><small>${c.segment}</small></div>
      <span>💰 ${Number(c.caixa||0).toLocaleString("pt-BR")}</span>
      <span>🏆 ${c.xp||0} XP</span>
      <span class="hide-sm">⭐ ${c.reputacao||0}</span>
      <span class="hide-sm">👥 ${c.clientes||0}</span>
      <button type="button" class="delete-company" data-company-id="${c.id}" data-company-name="${c.name}">🗑️ Excluir</button>
    </div>`).join("") : "Nenhuma empresa conectada.";

  document.querySelectorAll(".delete-company").forEach(btn=>{
    btn.addEventListener("click",()=>{
      excluirEmpresa(btn.dataset.companyId,btn.dataset.companyName);
    });
  });

  renderAuctionTeacher();
}

async function closeAuction(){
  if(!currentRoom||!roomData?.auction||roomData.auction.status!=="open") return toast("Não há leilão aberto.","error");
  try{
    const f=await getFirebase();
    let latest=roomData;
    if(f){ const s=await f.get(f.ref(f.db,`rooms/${currentRoom}`)); latest=s.val()||roomData; }
    const a=latest.auction||roomData.auction;
    const bids=Object.values(a.bids||{}).filter(b=>Number(b.amount||0)>=Number(a.minBid||0)).sort((x,y)=>Number(y.amount||0)-Number(x.amount||0)||Number(x.createdAt||0)-Number(y.createdAt||0));
    if(!bids.length){
      a.status="closed"; a.closedAt=Date.now(); a.winnerName=null; a.winningBid=0;
      latest.status="Leilão encerrado — sem lances"; latest.auction=a; roomData=latest; await saveRoom(); return toast("Leilão encerrado sem lances.");
    }
    const win=bids[0], c=latest.companies?.[win.companyId];
    if(!c)return toast("Empresa vencedora não encontrada.","error");
    const v=Number(win.amount||0);
    if(Number(c.caixa||0)<v)return toast("O maior lance ultrapassa o caixa atual da empresa.","error");
    c.caixa=Number(c.caixa||0)-v; c[a.field]=Number(c[a.field]||0)+Number(a.qty||1); c.xp=Number(c.xp||0)+8;
    a.status="closed"; a.closedAt=Date.now(); a.winnerId=win.companyId; a.winnerName=win.companyName; a.winningBid=v;
    latest.companies[win.companyId]=c; latest.auction=a; latest.status=`Leilão encerrado — ${win.companyName} venceu`;
    roomData=latest; await saveRoom(); toast(`🏆 ${win.companyName} venceu por ADM$ ${v.toLocaleString("pt-BR")}!`);
  }catch(e){ console.error(e); toast(`Erro ao encerrar leilão: ${e.message}`,"error"); }
}


async function acessarSalaExistente() {
  const codigo = ($("#codigoExistente")?.value || "").trim().toUpperCase();
  const senha = ($("#senhaExistente")?.value || "").trim();

  if (!codigo) {
    toast("Digite o código da sala.", "error");
    $("#codigoExistente")?.focus();
    return;
  }
  if (!senha) {
    toast("Digite a senha do professor.", "error");
    $("#senhaExistente")?.focus();
    return;
  }

  try {
    const f = await getFirebase();
    let data = null;

    if (f) {
      const snap = await f.get(f.ref(f.db, `rooms/${codigo}`));
      data = snap.val();
    } else {
      data = demoGet(`room:${codigo}`, null);
    }

    if (!data) {
      toast("Sala não encontrada.", "error");
      return;
    }

    if (String(data.teacherPassword || "") !== senha) {
      toast("Senha do professor incorreta.", "error");
      return;
    }

    currentRoom = codigo;
    roomData = data;

    $("#codigoSala").textContent = currentRoom;
    $("#codigoWrap").classList.remove("hidden");
    if ($("#turma")) $("#turma").value = roomData.className || "";

    await listen();
    render();
    toast(`Sala ${currentRoom} recuperada com sucesso.`);
  } catch (e) {
    console.error(e);
    toast(`Não foi possível acessar a sala: ${e.message}`, "error");
  }
}

$("#acessarSala")?.addEventListener("click", acessarSalaExistente);

$("#criarSala").addEventListener("click",async()=>{
  const turma=$("#turma").value.trim(), senha=$("#senha").value.trim();
  if(!turma){toast("Digite o nome da turma.","error");$("#turma").focus();return}
  if(!senha){toast("Crie uma senha para o professor.","error");$("#senha").focus();return}
  setBusy(true);
  try{
    currentRoom=roomCode();
    roomData={code:currentRoom,className:turma,teacherPassword:senha,createdAt:Date.now(),status:"Aguardando empresas",round:0,currentEvent:null,companies:{},negotiations:{},auction:null};
    await saveRoom(); $("#codigoSala").textContent=currentRoom; $("#codigoWrap").classList.remove("hidden"); await listen();
    toast(FIREBASE.enabled?`Sala ${currentRoom} criada e conectada ao Firebase!`:`Sala ${currentRoom} criada em modo demonstração.`);
  }catch(err){console.error(err);currentRoom=null;roomData=null;toast(`Não foi possível criar a sala: ${err.message}`,"error")}finally{setBusy(false)}
});
$("#copiarCodigo").addEventListener("click",async()=>{if(!currentRoom)return;try{await navigator.clipboard.writeText(currentRoom);toast("Código copiado.")}catch{toast(`Código da sala: ${currentRoom}`)}});
$("#iniciar").addEventListener("click",async()=>{if(!roomData)return toast("Crie ou acesse uma sala primeiro.","error");roomData.status="Em andamento";roomData.round=1;roomData.currentEvent=null;try{await saveRoom()}catch(e){toast(e.message,"error")}});
$("#proxima").addEventListener("click",async()=>{if(!roomData)return toast("Crie ou acesse uma sala primeiro.","error");roomData.round=Math.min(8,(roomData.round||0)+1);roomData.status=rounds[roomData.round-1]?.name||"Final";roomData.currentEvent=null;try{await saveRoom()}catch(e){toast(e.message,"error")}});
$("#pausar").addEventListener("click",async()=>{if(!roomData)return toast("Crie ou acesse uma sala primeiro.","error");roomData.status=roomData.status==="Pausado"?"Em andamento":"Pausado";try{await saveRoom()}catch(e){toast(e.message,"error")}});
$("#crise").addEventListener("click",()=>{if(!roomData)return toast("Crie ou acesse uma sala primeiro.","error");const keys=Object.keys(events);document.querySelector(`[data-event="${keys[Math.floor(Math.random()*keys.length)]}"]`)?.click()});
$("#leilao").addEventListener("click",async()=>{
  if(!roomData)return toast("Crie ou acesse uma sala primeiro.","error");
  const item=AUCTION_ITEMS[Math.floor(Math.random()*AUCTION_ITEMS.length)];
  roomData.round=Math.max(3,roomData.round||0); roomData.status="Leilão aberto";
  roomData.auction={status:"open",itemId:item.id,title:item.title,description:item.description,field:item.field,qty:item.qty,minBid:item.minBid,openedAt:Date.now(),bids:{}};
  try{await saveRoom();toast(`Leilão aberto: ${item.title}`)}catch(e){toast(e.message,"error")}
});
$("#mercado").addEventListener("click",async()=>{if(!roomData)return toast("Crie ou acesse uma sala primeiro.","error");roomData.status="Mercado de negociações aberto";roomData.round=Math.max(6,roomData.round||0);try{await saveRoom();toast("Mercado livre aberto.")}catch(e){toast(e.message,"error")}});
document.querySelectorAll(".event").forEach(b=>b.addEventListener("click",async()=>{if(!roomData)return toast("Crie ou acesse uma sala primeiro.","error");roomData.currentEvent={id:b.dataset.event,nonce:Date.now()};roomData.status="Evento de mercado";try{await saveRoom();toast("Evento disparado para as empresas!")}catch(e){toast(e.message,"error")}}));
console.log("ADM Arena 360 — Painel do Professor carregado.");
