import { FIREBASE } from "./firebase-config.js";
import { getFirebase, demoGet, demoSet, roomCode } from "./firebase-service.js";
import { rounds, events } from "./game.js";

let currentRoom=null, roomData=null, unsubscribe=null;
const $=s=>document.querySelector(s);
const toast=t=>{const x=$("#toast");x.textContent=t;x.classList.remove("hidden");setTimeout(()=>x.classList.add("hidden"),2200)};

async function saveRoom(){
  if(!currentRoom || !roomData) return;
  const f=await getFirebase();
  if(f) await f.set(f.ref(f.db,`rooms/${currentRoom}`),roomData);
  else demoSet(`room:${currentRoom}`,roomData);
  render();
}
async function listen(){
  const f=await getFirebase();
  if(f){
    const r=f.ref(f.db,`rooms/${currentRoom}`);
    unsubscribe=f.onValue(r,s=>{roomData=s.val()||roomData;render()});
  } else {
    window.addEventListener("storage",e=>{
      if(e.key===`adm360:room:${currentRoom}`){roomData=JSON.parse(e.newValue);render()}
    });
  }
}
function render(){
  if(!roomData)return;
  $("#rodada").textContent=`${roomData.round||0}/8`;
  $("#status").textContent=roomData.status||"Aguardando";
  const comps=Object.values(roomData.companies||{});
  $("#qtdEmpresas").textContent=`${comps.length} empresa${comps.length===1?"":"s"}`;
  $("#empresas").classList.remove("empty");
  $("#empresas").innerHTML=comps.length?comps.sort((a,b)=>(b.xp||0)-(a.xp||0)).map(c=>`
    <div class="company-item">
      <div><strong>${c.name}</strong><br><small>${c.segment}</small></div>
      <span>💰 ${Number(c.caixa||0).toLocaleString("pt-BR")}</span>
      <span>🏆 ${c.xp||0} XP</span>
      <span class="hide-sm">⭐ ${c.reputacao||0}</span>
      <span class="hide-sm">👥 ${c.clientes||0}</span>
    </div>`).join(""):"Nenhuma empresa conectada.";
}

$("#criarSala").addEventListener("click",async()=>{
  currentRoom=roomCode();
  roomData={
    code:currentRoom, className:$("#turma").value||"3ª Série — Técnico ADM",
    teacherPassword:$("#senha").value||"", createdAt:Date.now(),
    status:"Aguardando empresas",round:0,currentEvent:null,companies:{},negotiations:{}
  };
  $("#codigoSala").textContent=currentRoom;$("#codigoWrap").classList.remove("hidden");
  await saveRoom();await listen();
  toast(FIREBASE.enabled?"Sala multiplayer criada!":"Sala criada em modo demonstração.");
});
$("#copiarCodigo").addEventListener("click",()=>navigator.clipboard?.writeText(currentRoom));
$("#iniciar").addEventListener("click",async()=>{if(!roomData)return;roomData.status="Em andamento";roomData.round=1;roomData.currentEvent=null;await saveRoom()});
$("#proxima").addEventListener("click",async()=>{if(!roomData)return;roomData.round=Math.min(8,(roomData.round||0)+1);roomData.status=rounds[roomData.round-1]?.name||"Final";roomData.currentEvent=null;await saveRoom()});
$("#pausar").addEventListener("click",async()=>{if(!roomData)return;roomData.status=roomData.status==="Pausado"?"Em andamento":"Pausado";await saveRoom()});
$("#crise").addEventListener("click",()=>{const keys=Object.keys(events);document.querySelector(`[data-event="${keys[Math.floor(Math.random()*keys.length)]}"]`)?.click()});
$("#leilao").addEventListener("click",async()=>{if(!roomData)return;roomData.status="Leilão aberto";roomData.round=Math.max(3,roomData.round||0);await saveRoom();toast("Leilão aberto.")});
$("#mercado").addEventListener("click",async()=>{if(!roomData)return;roomData.status="Mercado de negociações aberto";roomData.round=Math.max(6,roomData.round||0);await saveRoom();toast("Mercado livre aberto.")});
document.querySelectorAll(".event").forEach(b=>b.addEventListener("click",async()=>{
  if(!roomData)return;
  roomData.currentEvent={id:b.dataset.event,nonce:Date.now()};
  roomData.status="Evento de mercado";
  await saveRoom();toast("Evento disparado para as empresas!");
}));
