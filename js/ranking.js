import { FIREBASE } from "./firebase-config.js";
import { getFirebase, demoGet } from "./firebase-service.js";
const $=s=>document.querySelector(s);
const params=new URLSearchParams(location.search);const code=(params.get("sala")||"").toUpperCase();

function render(room){
  const comps=Object.values(room?.companies||{}).sort((a,b)=>(b.xp||0)-(a.xp||0));
  $("#sub").textContent=room?`${room.className||""} • ${room.status||""} • Rodada ${room.round||0}/8`:"Informe ?sala=ADM-0000 no endereço.";
  $("#ranking").innerHTML=comps.length?comps.map((c,i)=>`<div class="rank-row"><b>${i+1}º</b><span>${c.name}<br><small>${c.segment}</small></span><strong>${c.xp||0} XP</strong></div>`).join(""):`<div class="rank-row"><b>—</b><span>Aguardando empresas</span><strong>0 XP</strong></div>`;
}
async function start(){
  if(!code){render(null);return}
  const f=await getFirebase();
  if(f) f.onValue(f.ref(f.db,`rooms/${code}`),s=>render(s.val()));
  else setInterval(()=>render(demoGet(`room:${code}`,null)),800);
}
start();
