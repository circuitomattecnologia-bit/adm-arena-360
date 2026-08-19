import { FIREBASE } from "./firebase-config.js";
import { getFirebase, demoSet, roomCode } from "./firebase-service.js";
import { rounds, events } from "./game.js";

let currentRoom = null;
let roomData = null;
let unsubscribe = null;

const $ = s => document.querySelector(s);

function toast(text, type = "ok") {
  const x = $("#toast");
  if (!x) return;
  x.textContent = text;
  x.style.borderColor = type === "error" ? "#ff5b6e" : "";
  x.classList.remove("hidden");
  setTimeout(() => x.classList.add("hidden"), 3500);
}

function setBusy(busy) {
  const b = $("#criarSala");
  if (!b) return;
  b.disabled = busy;
  b.textContent = busy ? "CRIANDO SALA..." : "CRIAR SALA";
}

async function saveRoom() {
  if (!currentRoom || !roomData) return;

  const f = await getFirebase();

  if (f) {
    await f.set(f.ref(f.db, `rooms/${currentRoom}`), roomData);
  } else {
    demoSet(`room:${currentRoom}`, roomData);
  }

  render();
}

async function listen() {
  const f = await getFirebase();

  if (unsubscribe) unsubscribe();

  if (f) {
    const r = f.ref(f.db, `rooms/${currentRoom}`);
    unsubscribe = f.onValue(r, s => {
      roomData = s.val() || roomData;
      render();
    });
  }
}

function render() {
  if (!roomData) return;

  $("#rodada").textContent = `${roomData.round || 0}/8`;
  $("#status").textContent = roomData.status || "Aguardando";

  const comps = Object.values(roomData.companies || {});
  $("#qtdEmpresas").textContent = `${comps.length} empresa${comps.length === 1 ? "" : "s"}`;
  $("#empresas").classList.remove("empty");

  $("#empresas").innerHTML = comps.length
    ? comps
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .map(c => `
          <div class="company-item">
            <div><strong>${c.name}</strong><br><small>${c.segment}</small></div>
            <span>💰 ${Number(c.caixa || 0).toLocaleString("pt-BR")}</span>
            <span>🏆 ${c.xp || 0} XP</span>
            <span class="hide-sm">⭐ ${c.reputacao || 0}</span>
            <span class="hide-sm">👥 ${c.clientes || 0}</span>
          </div>
        `).join("")
    : "Nenhuma empresa conectada.";
}

$("#criarSala").addEventListener("click", async () => {
  const turma = $("#turma").value.trim();
  const senha = $("#senha").value.trim();

  if (!turma) {
    toast("Digite o nome da turma.", "error");
    $("#turma").focus();
    return;
  }

  if (!senha) {
    toast("Crie uma senha para o professor.", "error");
    $("#senha").focus();
    return;
  }

  setBusy(true);

  try {
    currentRoom = roomCode();

    roomData = {
      code: currentRoom,
      className: turma,
      teacherPassword: senha,
      createdAt: Date.now(),
      status: "Aguardando empresas",
      round: 0,
      currentEvent: null,
      companies: {},
      negotiations: {}
    };

    await saveRoom();

    $("#codigoSala").textContent = currentRoom;
    $("#codigoWrap").classList.remove("hidden");

    await listen();

    toast(FIREBASE.enabled
      ? `Sala ${currentRoom} criada e conectada ao Firebase!`
      : `Sala ${currentRoom} criada em modo demonstração.`
    );
  } catch (err) {
    console.error(err);
    currentRoom = null;
    roomData = null;
    toast(`Não foi possível criar a sala: ${err.message}`, "error");
  } finally {
    setBusy(false);
  }
});

$("#copiarCodigo").addEventListener("click", async () => {
  if (!currentRoom) return;
  try {
    await navigator.clipboard.writeText(currentRoom);
    toast("Código copiado.");
  } catch {
    toast(`Código da sala: ${currentRoom}`);
  }
});

$("#iniciar").addEventListener("click", async () => {
  if (!roomData) return toast("Crie uma sala primeiro.", "error");
  roomData.status = "Em andamento";
  roomData.round = 1;
  roomData.currentEvent = null;
  try { await saveRoom(); } catch (e) { toast(e.message, "error"); }
});

$("#proxima").addEventListener("click", async () => {
  if (!roomData) return toast("Crie uma sala primeiro.", "error");
  roomData.round = Math.min(8, (roomData.round || 0) + 1);
  roomData.status = rounds[roomData.round - 1]?.name || "Final";
  roomData.currentEvent = null;
  try { await saveRoom(); } catch (e) { toast(e.message, "error"); }
});

$("#pausar").addEventListener("click", async () => {
  if (!roomData) return toast("Crie uma sala primeiro.", "error");
  roomData.status = roomData.status === "Pausado" ? "Em andamento" : "Pausado";
  try { await saveRoom(); } catch (e) { toast(e.message, "error"); }
});

$("#crise").addEventListener("click", () => {
  if (!roomData) return toast("Crie uma sala primeiro.", "error");
  const keys = Object.keys(events);
  document.querySelector(`[data-event="${keys[Math.floor(Math.random() * keys.length)]}"]`)?.click();
});

$("#leilao").addEventListener("click", async () => {
  if (!roomData) return toast("Crie uma sala primeiro.", "error");
  roomData.status = "Leilão aberto";
  roomData.round = Math.max(3, roomData.round || 0);
  try {
    await saveRoom();
    toast("Leilão aberto.");
  } catch (e) { toast(e.message, "error"); }
});

$("#mercado").addEventListener("click", async () => {
  if (!roomData) return toast("Crie uma sala primeiro.", "error");
  roomData.status = "Mercado de negociações aberto";
  roomData.round = Math.max(6, roomData.round || 0);
  try {
    await saveRoom();
    toast("Mercado livre aberto.");
  } catch (e) { toast(e.message, "error"); }
});

document.querySelectorAll(".event").forEach(b => {
  b.addEventListener("click", async () => {
    if (!roomData) return toast("Crie uma sala primeiro.", "error");
    roomData.currentEvent = { id: b.dataset.event, nonce: Date.now() };
    roomData.status = "Evento de mercado";
    try {
      await saveRoom();
      toast("Evento disparado para as empresas!");
    } catch (e) {
      toast(e.message, "error");
    }
  });
});

console.log("ADM Arena 360 — Painel do Professor carregado.");
