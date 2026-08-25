import { FIREBASE } from "./firebase-config.js";
import {
  getFirebase,
  demoGet,
  demoSet,
  roomCode
} from "./firebase-service.js";

import { rounds, events } from "./game.js";

let currentRoom = null;
let roomData = null;
let unsubscribe = null;

const AUCTION_ITEMS = [
  {
    id: "pesquisa",
    title: "🔍 Pesquisa de Mercado Premium",
    description: "Entrega 1 Pesquisa de Mercado ao inventário da empresa vencedora.",
    field: "pesquisa",
    qty: 1,
    minBid: 5000
  },
  {
    id: "escudo",
    title: "🛡️ Escudo Financeiro",
    description: "Entrega 1 Escudo Financeiro ao inventário da empresa vencedora.",
    field: "escudo",
    qty: 1,
    minBid: 6000
  },
  {
    id: "campanha",
    title: "📣 Campanha Viral",
    description: "Entrega 1 Campanha Viral ao inventário da empresa vencedora.",
    field: "campanha",
    qty: 1,
    minBid: 7000
  }
];

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

function getUsedEvents() {
  const used = {
    ...(roomData?.usedEvents || {})
  };

  /*
    Compatibilidade com partidas antigas:
    se uma empresa já respondeu a um evento antes desta atualização,
    ele também será considerado utilizado.
  */
  Object.values(roomData?.companies || {}).forEach(company => {
    Object.values(company?.eventResponses || {}).forEach(response => {
      if (!response?.eventId) return;

      const eventId = response.eventId;

      if (!used[eventId]) {
        used[eventId] = {
          eventId,
          title: response.eventTitle || events[eventId]?.title || eventId,
          round: Number(response.round || 0),
          usedAt: Number(response.answeredAt || 0),
          recoveredFromHistory: true
        };
      }
    });
  });

  return used;
}

function renderEventButtons() {
  const usedEvents = getUsedEvents();

  document.querySelectorAll(".event").forEach(button => {
    const eventId = button.dataset.event;

    if (!eventId) return;

    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent.trim();
    }

    const originalLabel = button.dataset.originalLabel;
    const used = usedEvents[eventId];

    if (used) {
      const roundText = used.round ? ` • R${used.round}` : "";

      button.disabled = true;
      button.textContent = `✅ ${originalLabel} — UTILIZADO${roundText}`;
      button.style.opacity = "0.58";
      button.style.cursor = "not-allowed";
      button.style.filter = "grayscale(0.55)";
      button.setAttribute(
        "title",
        used.round
          ? `Evento utilizado na Rodada ${used.round}`
          : "Evento já utilizado nesta partida"
      );
    } else {
      button.disabled = false;
      button.textContent = originalLabel;
      button.style.opacity = "";
      button.style.cursor = "";
      button.style.filter = "";
      button.removeAttribute("title");
    }
  });
}

async function saveRoom() {
  if (!currentRoom || !roomData) return;

  const f = await getFirebase();

  if (f) {
    await f.set(
      f.ref(f.db, `rooms/${currentRoom}`),
      roomData
    );
  } else {
    demoSet(`room:${currentRoom}`, roomData);
  }

  render();
}

async function listen() {
  const f = await getFirebase();

  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  if (f) {
    const r = f.ref(f.db, `rooms/${currentRoom}`);

    unsubscribe = f.onValue(r, snapshot => {
      roomData = snapshot.val() || roomData;
      render();
    });
  }
}

function ensureAuctionPanel() {
  let panel = $("#auctionTeacherPanel");

  if (panel) return panel;

  panel = document.createElement("section");
  panel.id = "auctionTeacherPanel";
  panel.className = "card glass hidden";

  panel.innerHTML = `
    <div class="section-title">
      <h2>🔨 Central do Leilão</h2>
      <span id="auctionBidCount">0 lances</span>
    </div>

    <div id="auctionTeacherInfo"></div>

    <div
      id="auctionTeacherBids"
      class="company-list">
    </div>

    <div style="margin-top:16px">
      <button
        id="encerrarLeilao"
        class="primary">
        ENCERRAR LEILÃO E DEFINIR VENCEDOR
      </button>
    </div>
  `;

  const companiesSection =
    $("#empresas")?.closest("section");

  if (companiesSection) {
    companiesSection.before(panel);
  } else {
    document.querySelector("main")?.appendChild(panel);
  }

  $("#encerrarLeilao")
    ?.addEventListener("click", closeAuction);

  return panel;
}

function renderAuctionTeacher() {
  const panel = ensureAuctionPanel();
  const auction = roomData?.auction;

  if (!auction) {
    panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");

  const bids = Object.values(
    auction.bids || {}
  );

  $("#auctionBidCount").textContent =
    `${bids.length} lance${bids.length === 1 ? "" : "s"}`;

  $("#auctionTeacherInfo").innerHTML = `
    <p>
      <strong>
        ${auction.title || "Item em disputa"}
      </strong>
    </p>

    <p class="muted">
      ${auction.description || ""}
    </p>

    <p>
      <strong>Lance mínimo:</strong>
      ADM$ ${Number(auction.minBid || 0).toLocaleString("pt-BR")}
      •
      <strong>Status:</strong>
      ${auction.status === "open" ? "ABERTO" : "ENCERRADO"}
    </p>

    ${
      auction.status === "closed"
        ? (
            auction.winnerName
              ? `
                <p>
                  <strong>🏆 Vencedora:</strong>
                  ${auction.winnerName}
                  —
                  ADM$
                  ${Number(auction.winningBid || 0).toLocaleString("pt-BR")}
                </p>
              `
              : `
                <p>
                  <strong>
                    Leilão encerrado sem lances válidos.
                  </strong>
                </p>
              `
          )
        : ""
    }
  `;

  $("#auctionTeacherBids").innerHTML =
    bids.length
      ? bids
          .sort(
            (a, b) =>
              Number(b.amount || 0) -
              Number(a.amount || 0)
          )
          .map(
            bid => `
              <div class="company-item">
                <div>
                  <strong>${bid.companyName}</strong>
                  <br>
                  <small>
                    Lance secreto recebido
                  </small>
                </div>

                <span>
                  💰 ADM$
                  ${Number(bid.amount || 0).toLocaleString("pt-BR")}
                </span>
              </div>
            `
          )
          .join("")
      : `
          <p class="muted">
            Nenhum lance recebido ainda.
          </p>
        `;

  const btn = $("#encerrarLeilao");

  if (btn) {
    btn.disabled =
      auction.status !== "open";

    btn.textContent =
      auction.status === "open"
        ? "ENCERRAR LEILÃO E DEFINIR VENCEDOR"
        : "LEILÃO ENCERRADO";
  }
}

async function excluirEmpresa(
  companyId,
  companyName
) {
  if (!currentRoom || !roomData) return;

  const confirmar = confirm(
    `Excluir a empresa "${companyName}" desta sala?`
  );

  if (!confirmar) return;

  try {
    const f = await getFirebase();

    if (f) {
      await f.remove(
        f.ref(
          f.db,
          `rooms/${currentRoom}/companies/${companyId}`
        )
      );
    } else {
      if (roomData.companies?.[companyId]) {
        delete roomData.companies[companyId];

        demoSet(
          `room:${currentRoom}`,
          roomData
        );

        render();
      }
    }

    toast(
      `Empresa "${companyName}" excluída.`
    );
  } catch (e) {
    console.error(e);

    toast(
      `Erro ao excluir empresa: ${e.message}`,
      "error"
    );
  }
}

function render() {
  if (!roomData) return;

  $("#rodada").textContent =
    `${roomData.round || 0}/8`;

  $("#status").textContent =
    roomData.status || "Aguardando";

  const companies =
    Object.values(
      roomData.companies || {}
    );

  $("#qtdEmpresas").textContent =
    `${companies.length} empresa${
      companies.length === 1 ? "" : "s"
    }`;

  $("#empresas")
    ?.classList.remove("empty");

  $("#empresas").innerHTML =
    companies.length
      ? companies
          .sort(
            (a, b) =>
              (b.xp || 0) -
              (a.xp || 0)
          )
          .map(
            company => `
              <div class="company-item">

                <div>
                  <strong>
                    ${company.name}
                  </strong>
                  <br>
                  <small>
                    ${company.segment}
                  </small>
                </div>

                <span>
                  💰
                  ${Number(company.caixa || 0)
                    .toLocaleString("pt-BR")}
                </span>

                <span>
                  🏆
                  ${company.xp || 0} XP
                </span>

                <span class="hide-sm">
                  ⭐
                  ${company.reputacao || 0}
                </span>

                <span class="hide-sm">
                  👥
                  ${company.clientes || 0}
                </span>

                <button
                  type="button"
                  class="delete-company"
                  data-company-id="${company.id}"
                  data-company-name="${company.name}">
                  🗑️ Excluir
                </button>

              </div>
            `
          )
          .join("")
      : "Nenhuma empresa conectada.";

  document
    .querySelectorAll(".delete-company")
    .forEach(btn => {
      btn.addEventListener(
        "click",
        () => {
          excluirEmpresa(
            btn.dataset.companyId,
            btn.dataset.companyName
          );
        }
      );
    });

  renderAuctionTeacher();
  renderEventButtons();
}

async function closeAuction() {
  if (
    !currentRoom ||
    !roomData?.auction ||
    roomData.auction.status !== "open"
  ) {
    return toast(
      "Não há leilão aberto.",
      "error"
    );
  }

  try {
    const f = await getFirebase();

    let latest = roomData;

    if (f) {
      const snapshot = await f.get(
        f.ref(
          f.db,
          `rooms/${currentRoom}`
        )
      );

      latest =
        snapshot.val() || roomData;
    }

    const auction =
      latest.auction ||
      roomData.auction;

    const bids =
      Object.values(
        auction.bids || {}
      )
        .filter(
          bid =>
            Number(bid.amount || 0) >=
            Number(auction.minBid || 0)
        )
        .sort(
          (a, b) =>
            Number(b.amount || 0) -
              Number(a.amount || 0) ||
            Number(a.createdAt || 0) -
              Number(b.createdAt || 0)
        );

    if (!bids.length) {
      auction.status = "closed";
      auction.closedAt = Date.now();
      auction.winnerName = null;
      auction.winningBid = 0;

      latest.status =
        "Leilão encerrado — sem lances";

      latest.auction = auction;
      roomData = latest;

      await saveRoom();

      return toast(
        "Leilão encerrado sem lances."
      );
    }

    const winner = bids[0];

    const company =
      latest.companies?.[
        winner.companyId
      ];

    if (!company) {
      return toast(
        "Empresa vencedora não encontrada.",
        "error"
      );
    }

    const value =
      Number(winner.amount || 0);

    if (
      Number(company.caixa || 0) <
      value
    ) {
      return toast(
        "O maior lance ultrapassa o caixa atual da empresa.",
        "error"
      );
    }

    company.caixa =
      Number(company.caixa || 0) -
      value;

    company[auction.field] =
      Number(
        company[auction.field] || 0
      ) +
      Number(auction.qty || 1);

    company.xp =
      Number(company.xp || 0) + 8;

    auction.status = "closed";
    auction.closedAt = Date.now();
    auction.winnerId =
      winner.companyId;
    auction.winnerName =
      winner.companyName;
    auction.winningBid =
      value;

    latest.companies[
      winner.companyId
    ] = company;

    latest.auction = auction;

    latest.status =
      `Leilão encerrado — ` +
      `${winner.companyName} venceu`;

    roomData = latest;

    await saveRoom();

    toast(
      `🏆 ${winner.companyName} venceu por ` +
      `ADM$ ${value.toLocaleString("pt-BR")}!`
    );
  } catch (e) {
    console.error(e);

    toast(
      `Erro ao encerrar leilão: ${e.message}`,
      "error"
    );
  }
}

async function acessarSalaExistente() {
  const codigo =
    ($("#codigoExistente")?.value || "")
      .trim()
      .toUpperCase();

  const senha =
    ($("#senhaExistente")?.value || "")
      .trim();

  if (!codigo) {
    toast(
      "Digite o código da sala.",
      "error"
    );

    $("#codigoExistente")?.focus();
    return;
  }

  if (!senha) {
    toast(
      "Digite a senha do professor.",
      "error"
    );

    $("#senhaExistente")?.focus();
    return;
  }

  try {
    const f = await getFirebase();

    let data = null;

    if (f) {
      const snapshot = await f.get(
        f.ref(
          f.db,
          `rooms/${codigo}`
        )
      );

      data = snapshot.val();
    } else {
      data = demoGet(
        `room:${codigo}`,
        null
      );
    }

    if (!data) {
      toast(
        "Sala não encontrada.",
        "error"
      );
      return;
    }

    if (
      String(data.teacherPassword || "") !==
      senha
    ) {
      toast(
        "Senha do professor incorreta.",
        "error"
      );
      return;
    }

    currentRoom = codigo;
    roomData = data;

    roomData.usedEvents =
      getUsedEvents();

    $("#codigoSala").textContent =
      currentRoom;

    $("#codigoWrap")
      ?.classList.remove("hidden");

    if ($("#turma")) {
      $("#turma").value =
        roomData.className || "";
    }

    await listen();

    render();

    toast(
      `Sala ${currentRoom} recuperada com sucesso.`
    );
  } catch (e) {
    console.error(e);

    toast(
      `Não foi possível acessar a sala: ${e.message}`,
      "error"
    );
  }
}

$("#acessarSala")
  ?.addEventListener(
    "click",
    acessarSalaExistente
  );

$("#criarSala")
  ?.addEventListener(
    "click",
    async () => {
      const turma =
        $("#turma")?.value.trim();

      const senha =
        $("#senha")?.value.trim();

      if (!turma) {
        toast(
          "Digite o nome da turma.",
          "error"
        );

        $("#turma")?.focus();
        return;
      }

      if (!senha) {
        toast(
          "Crie uma senha para o professor.",
          "error"
        );

        $("#senha")?.focus();
        return;
      }

      setBusy(true);

      try {
        currentRoom =
          roomCode();

        roomData = {
          code: currentRoom,
          className: turma,
          teacherPassword: senha,
          createdAt: Date.now(),
          status: "Aguardando empresas",
          round: 0,
          currentEvent: null,
          usedEvents: {},
          companies: {},
          negotiations: {},
          auction: null
        };

        await saveRoom();

        $("#codigoSala")
          .textContent =
          currentRoom;

        $("#codigoWrap")
          ?.classList.remove("hidden");

        await listen();

        toast(
          FIREBASE.enabled
            ? `Sala ${currentRoom} criada e conectada ao Firebase!`
            : `Sala ${currentRoom} criada em modo demonstração.`
        );
      } catch (err) {
        console.error(err);

        currentRoom = null;
        roomData = null;

        toast(
          `Não foi possível criar a sala: ${err.message}`,
          "error"
        );
      } finally {
        setBusy(false);
      }
    }
  );

$("#copiarCodigo")
  ?.addEventListener(
    "click",
    async () => {
      if (!currentRoom) return;

      try {
        await navigator.clipboard
          .writeText(currentRoom);

        toast(
          "Código copiado."
        );
      } catch {
        toast(
          `Código da sala: ${currentRoom}`
        );
      }
    }
  );

$("#iniciar")
  ?.addEventListener(
    "click",
    async () => {
      if (!roomData) {
        return toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );
      }

      roomData.status =
        "Em andamento";

      roomData.round = 1;
      roomData.currentEvent = null;

      try {
        await saveRoom();
      } catch (e) {
        toast(
          e.message,
          "error"
        );
      }
    }
  );

$("#proxima")
  ?.addEventListener(
    "click",
    async () => {
      if (!roomData) {
        return toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );
      }

      roomData.round =
        Math.min(
          8,
          (roomData.round || 0) + 1
        );

      roomData.status =
        rounds[
          roomData.round - 1
        ]?.name || "Final";

      roomData.currentEvent = null;

      try {
        await saveRoom();
      } catch (e) {
        toast(
          e.message,
          "error"
        );
      }
    }
  );

$("#pausar")
  ?.addEventListener(
    "click",
    async () => {
      if (!roomData) {
        return toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );
      }

      roomData.status =
        roomData.status === "Pausado"
          ? "Em andamento"
          : "Pausado";

      try {
        await saveRoom();
      } catch (e) {
        toast(
          e.message,
          "error"
        );
      }
    }
  );

$("#crise")
  ?.addEventListener(
    "click",
    async () => {
      if (!roomData) {
        return toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );
      }

      const used =
        getUsedEvents();

      const available =
        Object.keys(events)
          .filter(
            eventId =>
              !used[eventId]
          );

      if (!available.length) {
        toast(
          "Todos os eventos desta partida já foram utilizados.",
          "error"
        );
        return;
      }

      const eventId =
        available[
          Math.floor(
            Math.random() *
            available.length
          )
        ];

      await dispararEvento(
        eventId
      );
    }
  );

$("#leilao")
  ?.addEventListener(
    "click",
    async () => {
      if (!roomData) {
        return toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );
      }

      const item =
        AUCTION_ITEMS[
          Math.floor(
            Math.random() *
            AUCTION_ITEMS.length
          )
        ];

      roomData.round =
        Math.max(
          3,
          roomData.round || 0
        );

      roomData.status =
        "Leilão aberto";

      roomData.auction = {
        status: "open",
        itemId: item.id,
        title: item.title,
        description: item.description,
        field: item.field,
        qty: item.qty,
        minBid: item.minBid,
        openedAt: Date.now(),
        bids: {}
      };

      try {
        await saveRoom();

        toast(
          `Leilão aberto: ${item.title}`
        );
      } catch (e) {
        toast(
          e.message,
          "error"
        );
      }
    }
  );

$("#mercado")
  ?.addEventListener(
    "click",
    async () => {
      if (!roomData) {
        return toast(
          "Crie ou acesse uma sala primeiro.",
          "error"
        );
      }

      roomData.status =
        "Mercado de negociações aberto";

      roomData.round =
        Math.max(
          6,
          roomData.round || 0
        );

      try {
        await saveRoom();

        toast(
          "Mercado livre aberto."
        );
      } catch (e) {
        toast(
          e.message,
          "error"
        );
      }
    }
  );

async function dispararEvento(
  eventId
) {
  if (!roomData) {
    return toast(
      "Crie ou acesse uma sala primeiro.",
      "error"
    );
  }

  if (!events[eventId]) {
    return toast(
      "Evento não encontrado.",
      "error"
    );
  }

  const used =
    getUsedEvents();

  if (used[eventId]) {
    const round =
      used[eventId].round;

    toast(
      round
        ? `Este evento já foi utilizado na Rodada ${round}.`
        : "Este evento já foi utilizado nesta partida.",
      "error"
    );

    renderEventButtons();
    return;
  }

  const now = Date.now();

  roomData.usedEvents =
    roomData.usedEvents || {};

  roomData.usedEvents[eventId] = {
    eventId,
    title:
      events[eventId]?.title ||
      eventId,
    round:
      Number(
        roomData.round || 0
      ),
    usedAt: now
  };

  roomData.currentEvent = {
    id: eventId,
    nonce: now,
    round:
      Number(
        roomData.round || 0
      )
  };

  roomData.status =
    "Evento de mercado";

  try {
    await saveRoom();

    toast(
      `✅ Evento disparado e marcado como utilizado: ${events[eventId].title}`
    );
  } catch (e) {
    /*
      Se a gravação falhar, não deixamos
      o evento marcado apenas localmente.
    */
    delete roomData.usedEvents[eventId];

    toast(
      e.message,
      "error"
    );
  }
}

document
  .querySelectorAll(".event")
  .forEach(button => {
    button.addEventListener(
      "click",
      async () => {
        const eventId =
          button.dataset.event;

        await dispararEvento(
          eventId
        );
      }
    );
  });

console.log(
  "ADM Arena 360 — Painel do Professor carregado com controle de eventos utilizados."
);
