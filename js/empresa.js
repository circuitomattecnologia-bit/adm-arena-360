import { FIREBASE } from "./firebase-config.js";
import { getFirebase, demoGet, demoSet } from "./firebase-service.js";
import { rounds, events, clampCompany } from "./game.js";

/* ============================================================
   ADM ARENA 360
   DISCIPLINA: PROJETO EMPREENDEDOR
   PROF. LEOPOLDO

   EMPRESA.JS — VERSÃO CONSOLIDADA
   ============================================================ */

let roomCode = null;
let companyId = null;
let room = null;
let company = null;

let lastEventNonce = null;
let lastNegotiationSignature = "";
let currentAccessRequest = null;
let mobileMode = false;

const $ = (s) => document.querySelector(s);

/* ============================================================
   UTILIDADES
   ============================================================ */

const toast = (text) => {
  const box = $("#toast");
  if (!box) return;

  box.textContent = text;
  box.classList.remove("hidden");

  clearTimeout(box._timer);

  box._timer = setTimeout(() => {
    box.classList.add("hidden");
  }, 3000);
};

const normalizeName = (text) =>
  String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const safeId = (text) =>
  String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30) +
  "-" +
  Math.floor(Math.random() * 9999);

const money = (value) =>
  Number(value || 0).toLocaleString("pt-BR");

const now = () => Date.now();

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getComponentsText(c = company) {
  if (!c) return "";

  if (Array.isArray(c.components)) {
    return c.components.join(" • ");
  }

  if (Array.isArray(c.componentes)) {
    return c.componentes.join(" • ");
  }

  return String(
    c.components ||
    c.componentes ||
    c.members ||
    ""
  );
}

function parseComponents(text) {
  return String(text || "")
    .split(/,|;|\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 15);
}

/* ============================================================
   NOMES DE DECISÕES E RECURSOS
   ============================================================ */

const DECISION_LABELS = {
  crescimento: "🚀 Foco em crescimento",
  equilibrio: "⚖️ Gestão equilibrada",
  seguranca: "🛡️ Segurança financeira",

  preco: "💲 Competir por preço",
  qualidade: "💎 Competir por qualidade",
  pessoas: "👥 Investir em pessoas",
  inovacao: "💡 Inovar",

  "quiz-sim": "SIM",
  "quiz-nao": "NÃO",

  "boss-reserva": "🛡️ Usar reserva e renegociar",
  "boss-corte": "✂️ Cortar investimentos",
  "boss-credito": "🏦 Tomar crédito"
};

const RESOURCE_LABELS = {
  campanha: "📣 Campanha Viral",
  escudo: "🛡️ Escudo Financeiro",
  pesquisa: "🔍 Pesquisa de Mercado"
};

/* ============================================================
   NOTIFICAÇÕES
   ============================================================ */

function notify(text) {
  const target = $("#notificacoes");
  if (!target) return;

  const div = document.createElement("div");
  div.className = "notification";
  div.textContent = text;

  target.prepend(div);
}

/* ============================================================
   FIREBASE / SALA
   ============================================================ */

async function getRoom() {
  const f = await getFirebase();

  if (f) {
    const snap = await f.get(
      f.ref(f.db, `rooms/${roomCode}`)
    );

    return snap.val();
  }

  return demoGet(`room:${roomCode}`, null);
}

async function saveCompany() {
  if (!company || !companyId || !roomCode) return;

  company = clampCompany(company);

  const f = await getFirebase();

  if (f) {
    await f.set(
      f.ref(
        f.db,
        `rooms/${roomCode}/companies/${companyId}`
      ),
      company
    );
  } else {
    room = demoGet(`room:${roomCode}`, room) || {};
    room.companies = room.companies || {};
    room.companies[companyId] = company;

    demoSet(`room:${roomCode}`, room);
  }

  render();
}

async function saveWholeRoom(nextRoom) {
  const f = await getFirebase();

  if (f) {
    await f.set(
      f.ref(f.db, `rooms/${roomCode}`),
      nextRoom
    );
  } else {
    demoSet(`room:${roomCode}`, nextRoom);
  }

  room = nextRoom;

  company =
    room?.companies?.[companyId] ||
    company;

  render();
}

async function listen() {
  const f = await getFirebase();

  if (f) {
    f.onValue(
      f.ref(f.db, `rooms/${roomCode}`),
      (snapshot) => {
        room = snapshot.val() || room;

        company =
          room?.companies?.[companyId] ||
          company;

        onRoomChange();
      }
    );
  } else {
    setInterval(() => {
      room =
        demoGet(`room:${roomCode}`, room) ||
        room;

      company =
        room?.companies?.[companyId] ||
        company;

      onRoomChange();
    }, 900);
  }
}

/* ============================================================
   EVENTOS
   ============================================================ */

function eventResponse(nonce) {
  if (!nonce) return null;

  return (
    company?.eventResponses?.[
      String(nonce)
    ] || null
  );
}

function closeEventModal() {
  $("#modalEvento")?.classList.add("hidden");

  if ($("#eventoOpcoes")) {
    $("#eventoOpcoes").innerHTML = "";
  }
}

function shouldReceiveCurrentEvent(currentEvent) {
  if (!currentEvent?.nonce) return false;

  const joinedAt =
    Number(company?.joinedAt || 0);

  const nonce =
    Number(currentEvent.nonce || 0);

  if (
    company?.ignoreEventsBefore &&
    nonce <= Number(company.ignoreEventsBefore)
  ) {
    return false;
  }

  if (
    joinedAt &&
    nonce < joinedAt
  ) {
    return false;
  }

  return true;
}

function showEvent(id, nonce) {
  const ev = events[id];

  if (!ev) return;

  const key = String(
    nonce ||
    room?.currentEvent?.nonce ||
    ""
  );

  if (
    !key ||
    !shouldReceiveCurrentEvent(
      room?.currentEvent
    )
  ) {
    closeEventModal();
    return;
  }

  if (eventResponse(key)) {
    closeEventModal();
    return;
  }

  $("#eventoTitulo").textContent =
    ev.title;

  $("#eventoTexto").textContent =
    ev.text;

  $("#eventoOpcoes").innerHTML =
    ev.options
      .map(
        (option, index) => `
          <button data-o="${index}">
            ${option.label}
          </button>
        `
      )
      .join("");

  $("#modalEvento").classList.remove(
    "hidden"
  );

  document
    .querySelectorAll("[data-o]")
    .forEach((button) => {
      button.onclick = async () => {
        if (eventResponse(key)) {
          closeEventModal();

          toast(
            "Este evento já foi respondido."
          );

          return;
        }

        document
          .querySelectorAll("[data-o]")
          .forEach(
            (x) => (x.disabled = true)
          );

        const index = Number(
          button.dataset.o
        );

        const option =
          ev.options[index];

        if (!option) {
          closeEventModal();
          return;
        }

        Object.entries(
          option.delta || {}
        ).forEach(([field, value]) => {
          company[field] =
            Number(company[field] || 0) +
            Number(value || 0);
        });

        company.eventResponses =
          company.eventResponses || {};

        company.eventResponses[key] = {
          eventId: id,
          eventTitle: ev.title,
          optionIndex: index,
          optionLabel: option.label,
          round: Number(
            room?.round || 0
          ),
          answeredAt: now()
        };

        await saveCompany();

        closeEventModal();

        notify(
          `✅ Evento resolvido: ${ev.title} — ${option.label}`
        );

        toast(
          "Consequências aplicadas."
        );
      };
    });
}

/* ============================================================
   ALTERAÇÃO DA SALA
   ============================================================ */

function onRoomChange() {
  if (!room) return;

  checkAccessAuthorization();

  if (
    company &&
    !$("#jogo")?.classList.contains(
      "hidden"
    )
  ) {
    render();
  }

  const currentEvent =
    room?.currentEvent;

  if (!currentEvent?.nonce) {
    lastEventNonce = null;
    closeEventModal();
  } else if (company) {
    const nonce = String(
      currentEvent.nonce
    );

    const answered =
      eventResponse(nonce);

    if (
      !shouldReceiveCurrentEvent(
        currentEvent
      )
    ) {
      lastEventNonce =
        currentEvent.nonce;

      closeEventModal();
    } else if (answered) {
      lastEventNonce =
        currentEvent.nonce;

      closeEventModal();
    } else if (
      currentEvent.nonce !==
      lastEventNonce
    ) {
      lastEventNonce =
        currentEvent.nonce;

      showEvent(
        currentEvent.id,
        currentEvent.nonce
      );
    }
  }

  renderNegotiations();
  renderMobileFeed();
}

/* ============================================================
   DECISÃO CONFIRMADA
   ============================================================ */

function confirmedDecisionHtml() {
  const label =
    company?.lastDecisionLabel ||
    "Decisão registrada";

  return `
    <div class="notification">
      <strong>✅ Decisão confirmada</strong>
      <br>
      ${label}
      <br>
      <span class="muted">
        Aguarde o professor avançar para a próxima rodada.
      </span>
    </div>
  `;
}

/* ============================================================
   RODADA 2 — INVESTIMENTOS
   ============================================================ */

function investmentHtml() {
  if (
    company.lastDecisionRound ===
    room.round
  ) {
    return confirmedDecisionHtml();
  }

  const saved =
    company.investmentPlan || {
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
        Distribua os recursos da empresa entre as áreas estratégicas.
        A reserva permanece no caixa.
      </p>

      <label>🏢 Estrutura</label>
      <input
        id="invEstrutura"
        type="number"
        min="0"
        step="1000"
        value="${saved.estrutura || 0}"
      >

      <label>👥 Pessoas</label>
      <input
        id="invPessoas"
        type="number"
        min="0"
        step="1000"
        value="${saved.pessoas || 0}"
      >

      <label>📣 Marketing</label>
      <input
        id="invMarketing"
        type="number"
        min="0"
        step="1000"
        value="${saved.marketing || 0}"
      >

      <label>💻 Tecnologia</label>
      <input
        id="invTecnologia"
        type="number"
        min="0"
        step="1000"
        value="${saved.tecnologia || 0}"
      >

      <label>📦 Estoque / Produção</label>
      <input
        id="invEstoque"
        type="number"
        min="0"
        step="1000"
        value="${saved.estoque || 0}"
      >

      <label>🛟 Reserva Financeira</label>
      <input
        id="invReserva"
        type="number"
        min="0"
        step="1000"
        value="${saved.reserva || 0}"
      >

      <div
        class="notification"
        id="investmentSummary"
      >
        Total alocado: ADM$ 0
      </div>

      <button
        class="primary"
        id="confirmarPlanoInvest"
      >
        💰 CONFIRMAR PLANO DE INVESTIMENTOS
      </button>

    </div>
  `;
}

function bindInvestmentPlan() {
  const ids = [
    "invEstrutura",
    "invPessoas",
    "invMarketing",
    "invTecnologia",
    "invEstoque",
    "invReserva"
  ];

  const inputs = ids
    .map((id) => $("#" + id))
    .filter(Boolean);

  if (!inputs.length) return;

  const values = () => ({
    estrutura: Math.max(
      0,
      Number($("#invEstrutura")?.value || 0)
    ),

    pessoas: Math.max(
      0,
      Number($("#invPessoas")?.value || 0)
    ),

    marketing: Math.max(
      0,
      Number($("#invMarketing")?.value || 0)
    ),

    tecnologia: Math.max(
      0,
      Number($("#invTecnologia")?.value || 0)
    ),

    estoque: Math.max(
      0,
      Number($("#invEstoque")?.value || 0)
    ),

    reserva: Math.max(
      0,
      Number($("#invReserva")?.value || 0)
    )
  });

  const updateSummary = () => {
    const v = values();

    const total =
      Object.values(v).reduce(
        (a, b) => a + b,
        0
      );

    const gasto =
      v.estrutura +
      v.pessoas +
      v.marketing +
      v.tecnologia +
      v.estoque;

    const saldo =
      Number(company.caixa || 0) -
      gasto;

    const box =
      $("#investmentSummary");

    if (box) {
      box.textContent =
        `Total alocado: ADM$ ${money(total)} • ` +
        `Saída real: ADM$ ${money(gasto)} • ` +
        `Saldo projetado: ADM$ ${money(saldo)}`;
    }
  };

  inputs.forEach((input) => {
    input.addEventListener(
      "input",
      updateSummary
    );
  });

  updateSummary();

  const button =
    $("#confirmarPlanoInvest");

  if (!button) return;

  button.onclick = async () => {
    if (
      company.lastDecisionRound ===
      room.round
    ) {
      toast(
        "A decisão desta rodada já foi registrada."
      );

      return;
    }

    const v = values();

    const total =
      Object.values(v).reduce(
        (a, b) => a + b,
        0
      );

    const gasto =
      v.estrutura +
      v.pessoas +
      v.marketing +
      v.tecnologia +
      v.estoque;

    const caixaAtual =
      Number(company.caixa || 0);

    if (total <= 0) {
      toast(
        "Distribua algum valor entre as áreas."
      );
      return;
    }

    if (total > caixaAtual) {
      toast(
        "O total não pode ultrapassar o caixa disponível."
      );
      return;
    }

    company.investmentPlan = v;

    company.reservaFinanceira =
      v.reserva;

    company.caixa =
      caixaAtual - gasto;

    company.reputacao +=
      Math.floor(
        v.estrutura / 10000
      ) * 2;

    company.equipe +=
      Math.floor(
        v.pessoas / 10000
      ) * 5;

    company.clientes +=
      Math.floor(
        v.marketing / 5000
      ) * 2;

    company.inovacao +=
      Math.floor(
        v.tecnologia / 5000
      ) * 3;

    company.clientes +=
      Math.floor(
        v.estoque / 10000
      );

    company.reputacao +=
      Math.floor(
        v.estoque / 20000
      );

    company.escudo =
      Number(company.escudo || 0) +
      Math.floor(
        v.reserva / 20000
      );

    const areasUsadas =
      Object.values(v).filter(
        (x) => x > 0
      ).length;

    company.xp +=
      6 + areasUsadas;

    company.lastDecisionRound =
      room.round;

    company.lastDecisionLabel =
      "💰 Plano de investimentos confirmado";

    company.lastDecisionAt =
      now();

    await saveCompany();

    notify(
      "💰 Plano de investimentos confirmado."
    );

    toast(
      "Plano registrado!"
    );
  };
}

/* ============================================================
   LEILÃO
   ============================================================ */

async function submitAuctionBid(amount) {
  if (
    !room?.auction ||
    room.auction.status !== "open"
  ) {
    toast(
      "O leilão não está aberto."
    );
    return;
  }

  const value =
    Math.floor(Number(amount || 0));

  const minimum =
    Number(
      room.auction.minBid || 0
    );

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    toast(
      "Digite um lance válido."
    );
    return;
  }

  if (value < minimum) {
    toast(
      `O lance mínimo é ADM$ ${money(minimum)}.`
    );
    return;
  }

  if (
    value >
    Number(company.caixa || 0)
  ) {
    toast(
      "O lance não pode ultrapassar o caixa."
    );
    return;
  }

  const payload = {
    companyId,
    companyName: company.name,
    amount: value,
    createdAt: now()
  };

  const f = await getFirebase();

  if (f) {
    await f.set(
      f.ref(
        f.db,
        `rooms/${roomCode}/auction/bids/${companyId}`
      ),
      payload
    );
  } else {
    room =
      demoGet(
        `room:${roomCode}`,
        room
      ) || {};

    room.auction =
      room.auction || {};

    room.auction.bids =
      room.auction.bids || {};

    room.auction.bids[
      companyId
    ] = payload;

    demoSet(
      `room:${roomCode}`,
      room
    );
  }

  toast(
    "🔒 Lance secreto enviado ao professor!"
  );

  notify(
    `🔨 Lance de ADM$ ${money(value)} registrado.`
  );
}

function auctionHtml() {
  const auction =
    room?.auction;

  if (!auction) {
    return `
      <p class="muted">
        Aguarde o professor abrir o leilão.
      </p>
    `;
  }

  const myBid =
    auction.bids?.[companyId];

  if (
    auction.status === "open"
  ) {
    return `
      <div class="stack">

        <div class="notification">
          <strong>
            ${auction.title || "🔨 Item em disputa"}
          </strong>

          <br>

          ${auction.description || ""}

          <br><br>

          Lance mínimo:
          <strong>
            ADM$ ${money(auction.minBid)}
          </strong>

          <br>

          Caixa atual:
          <strong>
            ADM$ ${money(company.caixa)}
          </strong>
        </div>

        <label>
          💰 Seu lance secreto
        </label>

        <input
          id="valorLance"
          type="number"
          min="${Number(auction.minBid || 0)}"
          max="${Number(company.caixa || 0)}"
          value="${
            myBid
              ? Number(myBid.amount || 0)
              : Number(auction.minBid || 0)
          }"
        >

        <button
          class="primary"
          id="enviarLance"
        >
          ${
            myBid
              ? "🔄 ATUALIZAR LANCE"
              : "🔒 ENVIAR LANCE SECRETO"
          }
        </button>

        ${
          myBid
            ? `
              <div class="notification">
                ✅ Seu lance registrado:
                <strong>
                  ADM$ ${money(myBid.amount)}
                </strong>
              </div>
            `
            : ""
        }

      </div>
    `;
  }

  if (
    auction.status === "closed"
  ) {
    if (
      auction.winnerId ===
      companyId
    ) {
      return `
        <div class="notification">
          🏆
          <strong>
            SUA EMPRESA VENCEU O LEILÃO!
          </strong>

          <br>

          ${auction.title || ""}

          <br>

          Valor pago:
          <strong>
            ADM$ ${money(auction.winningBid)}
          </strong>

          <br>

          O recurso foi adicionado ao inventário.
        </div>
      `;
    }

    return `
      <div class="notification">
        🔨
        <strong>
          Leilão encerrado.
        </strong>

        <br>

        ${
          auction.winnerName
            ? `Vencedora: <strong>${escapeHtml(auction.winnerName)}</strong> — ADM$ ${money(auction.winningBid)}`
            : "Não houve vencedor."
        }
      </div>
    `;
  }

  return `
    <p class="muted">
      Aguarde instruções do professor.
    </p>
  `;
}

function bindAuction() {
  const button =
    $("#enviarLance");

  if (!button) return;

  button.onclick = async () => {
    button.disabled = true;

    try {
      await submitAuctionBid(
        $("#valorLance")?.value
      );
    } catch (error) {
      console.error(error);

      toast(
        "Não foi possível enviar o lance."
      );
    } finally {
      button.disabled = false;
    }
  };
}

/* ============================================================
   CAMPANHA VIRAL
   ============================================================ */

function ensureInventoryButtons() {
  const line =
    $("#campanha")?.parentElement;

  if (!line) return;

  let button =
    $("#usarCampanha");

  if (!button) {
    button =
      document.createElement(
        "button"
      );

    button.id =
      "usarCampanha";

    button.type =
      "button";

    button.className =
      "inventory-action campaign-action";

    line.appendChild(button);
  }

  const quantity =
    Number(
      company?.campanha || 0
    );

  const active =
    Boolean(
      company?.campaignActive
    );

  if (quantity <= 0) {
    button.textContent =
      "🔒 SEM CAMPANHA";

    button.disabled = true;
  } else if (active) {
    button.textContent =
      "✅ CAMPANHA ATIVA";

    button.disabled = true;
  } else {
    button.textContent =
      "📣 ATIVAR CAMPANHA VIRAL";

    button.disabled = false;

    button.onclick =
      activateViralCampaign;
  }
}

async function activateViralCampaign() {
  if (
    Number(company.campanha || 0) <= 0
  ) {
    toast(
      "Sua empresa não possui Campanha Viral."
    );
    return;
  }

  if (
    company.campaignActive
  ) {
    toast(
      "A Campanha Viral já está ativa."
    );
    return;
  }

  company.clientes =
    Number(company.clientes || 0) +
    15;

  company.reputacao =
    Number(company.reputacao || 0) +
    10;

  company.xp =
    Number(company.xp || 0) +
    10;

  company.campaignActive =
    true;

  company.campaignActivatedAt =
    now();

  company.campaignBonus = {
    clientes: 15,
    reputacao: 10,
    xp: 10
  };

  await saveCompany();

  notify(
    "📣 Campanha Viral ativada: +15 clientes, +10 reputação e +10 XP."
  );

  addMobileLocalMessage(
    "📣 Campanha Viral ativada com sucesso."
  );

  toast(
    "Campanha Viral ativada!"
  );
}

/* ============================================================
   RODADAS / DECISÕES
   ============================================================ */

function decisionHtml(roundNumber) {
  if (
    company?.lastDecisionRound ===
      roundNumber &&
    [1, 2, 4, 7, 8].includes(
      roundNumber
    )
  ) {
    return confirmedDecisionHtml();
  }

  if (roundNumber === 1) {
    return `
      <div class="stack">

        <button data-d="crescimento">
          🚀 Foco em crescimento
        </button>

        <button data-d="equilibrio">
          ⚖️ Gestão equilibrada
        </button>

        <button data-d="seguranca">
          🛡️ Segurança financeira
        </button>

      </div>
    `;
  }

  if (roundNumber === 2) {
    return investmentHtml();
  }

  if (roundNumber === 3) {
    return auctionHtml();
  }

  if (roundNumber === 4) {
    return `
      <div class="stack">

        <button data-d="preco">
          💲 Competir por preço
        </button>

        <button data-d="qualidade">
          💎 Competir por qualidade
        </button>

        <button data-d="pessoas">
          👥 Investir em pessoas
        </button>

        <button data-d="inovacao">
          💡 Inovar
        </button>

      </div>
    `;
  }

  if (roundNumber === 7) {
    return `
      <p>
        <strong>
          ⚡ BATALHA ADM:
        </strong>

        Uma empresa pode aumentar as vendas
        e, ao mesmo tempo, piorar o caixa?
      </p>

      <div class="stack">

        <button data-d="quiz-sim">
          ✅ SIM
        </button>

        <button data-d="quiz-nao">
          ❌ NÃO
        </button>

      </div>
    `;
  }

  if (roundNumber === 8) {
    return `
      <p>
        <strong>
          👾 BOSS FINAL:
        </strong>

        Custos +15% e vendas -20%.
        Qual será a reação principal?
      </p>

      <div class="stack">

        <button data-d="boss-reserva">
          🛡️ Usar reserva e renegociar
        </button>

        <button data-d="boss-corte">
          ✂️ Cortar investimentos
        </button>

        <button data-d="boss-credito">
          🏦 Tomar crédito
        </button>

      </div>
    `;
  }

  return `
    <p class="muted">
      Esta rodada depende da interação do professor,
      eventos, mercado ou negociações.
    </p>
  `;
}

function bindDecision() {
  document
    .querySelectorAll("[data-d]")
    .forEach((button) => {
      button.onclick = async () => {
        const decision =
          button.dataset.d;

        if (
          company.lastDecisionRound ===
          room.round
        ) {
          toast(
            "A decisão desta rodada já foi registrada."
          );
          return;
        }

        document
          .querySelectorAll("[data-d]")
          .forEach(
            (x) => (x.disabled = true)
          );

        if (
          decision ===
          "crescimento"
        ) {
          company.caixa -= 10000;
          company.clientes += 8;
          company.xp += 10;
        }

        if (
          decision ===
          "equilibrio"
        ) {
          company.reputacao += 5;
          company.xp += 10;
        }

        if (
          decision ===
          "seguranca"
        ) {
          company.escudo =
            Number(
              company.escudo || 0
            ) + 1;

          company.xp += 8;
        }

        if (
          decision ===
          "preco"
        ) {
          company.caixa += 8000;
          company.clientes += 8;
          company.reputacao -= 2;
          company.xp += 7;
        }

        if (
          decision ===
          "qualidade"
        ) {
          company.caixa -= 7000;
          company.reputacao += 8;
          company.xp += 9;
        }

        if (
          decision ===
          "pessoas"
        ) {
          company.caixa -= 5000;
          company.equipe += 10;
          company.xp += 9;
        }

        if (
          decision ===
          "inovacao"
        ) {
          company.caixa -= 9000;
          company.inovacao += 12;
          company.xp += 11;
        }

        if (
          decision ===
          "quiz-sim"
        ) {
          company.xp += 10;

          notify(
            "✅ Correto: aumento das vendas não garante melhoria do caixa."
          );
        }

        if (
          decision ===
          "quiz-nao"
        ) {
          company.xp =
            Math.max(
              0,
              company.xp - 2
            );

          notify(
            "❌ Revejam os conceitos de faturamento, custos e fluxo de caixa."
          );
        }

        if (
          decision ===
          "boss-reserva"
        ) {
          company.caixa -= 5000;
          company.reputacao += 6;
          company.xp += 18;
        }

        if (
          decision ===
          "boss-corte"
        ) {
          company.caixa += 3000;
          company.equipe -= 7;
          company.inovacao -= 2;
          company.xp += 10;
        }

        if (
          decision ===
          "boss-credito"
        ) {
          company.caixa += 20000;
          company.xp += 8;
        }

        company.lastDecisionRound =
          room.round;

        company.lastDecisionCode =
          decision;

        company.lastDecisionLabel =
          DECISION_LABELS[
            decision
          ] || decision;

        company.lastDecisionAt =
          now();

        await saveCompany();

        notify(
          `✅ Decisão confirmada: ${
            DECISION_LABELS[
              decision
            ] || decision
          }`
        );

        addMobileLocalMessage(
          `🎯 Decisão registrada: ${
            DECISION_LABELS[
              decision
            ] || decision
          }`
        );

        toast(
          "Decisão registrada!"
        );
      };
    });
}

/* ============================================================
   EMPRESAS
   ============================================================ */

function findExistingCompany(name) {
  const target =
    normalizeName(name);

  return (
    Object.values(
      room?.companies || {}
    ).find(
      (c) =>
        normalizeName(c?.name) ===
        target
    ) || null
  );
}

function findCompanyByName(name) {
  return findExistingCompany(name);
}

function findCompanyInRoom(
  targetRoom,
  name
) {
  const target =
    normalizeName(name);

  return (
    Object.values(
      targetRoom?.companies || {}
    ).find(
      (c) =>
        normalizeName(c?.name) ===
        target
    ) || null
  );
}

/* ============================================================
   SENHA DA EMPRESA
   ============================================================ */

function ensureCompanyAccessFields() {
  const entrada =
    $("#entrada");

  if (
    !entrada ||
    $("#senhaEmpresa")
  ) {
    return;
  }

  const entrar =
    $("#entrar");

  if (!entrar) return;

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "company-password-box";

  wrapper.innerHTML = `
    <label for="senhaEmpresa">
      🔐 Senha da empresa
    </label>

    <input
      id="senhaEmpresa"
      type="password"
      autocomplete="current-password"
      placeholder="Crie ou digite a senha da empresa"
      minlength="4"
      maxlength="30"
    >

    <p class="muted">
      Primeiro acesso: crie uma senha.
      Nos próximos acessos, use a mesma empresa e a mesma senha.
    </p>
  `;

  entrar.parentNode.insertBefore(
    wrapper,
    entrar
  );
}

/* ============================================================
   AUTORIZAÇÃO DE REENTRADA
   ============================================================ */

async function createAccessRequest() {
  const latest =
    await getRoom();

  if (!latest) return false;

  latest.accessRequests =
    latest.accessRequests || {};

  const request = {
    companyId,
    companyName:
      company.name,

    components:
      getComponentsText(company),

    requestedAt:
      now(),

    status:
      "pending",

    source:
      mobileMode
        ? "mobile"
        : "empresa",

    round:
      Number(
        latest.round || 0
      )
  };

  latest.accessRequests[
    companyId
  ] = request;

  currentAccessRequest =
    request;

  await saveWholeRoom(
    latest
  );

  showAuthorizationWaiting();

  return true;
}

function showAuthorizationWaiting() {
  $("#entrada")?.classList.add(
    "hidden"
  );

  $("#jogo")?.classList.add(
    "hidden"
  );

  $("#bloqueioAutorizacao")
    ?.classList.remove(
      "hidden"
    );

  if ($("#empresaAguardando")) {
    $("#empresaAguardando").textContent =
      company?.name || "—";
  }
}

function hideAuthorizationWaiting() {
  $("#bloqueioAutorizacao")
    ?.classList.add(
      "hidden"
    );
}

function checkAccessAuthorization() {
  if (
    !room ||
    !companyId
  ) {
    return;
  }

  const request =
    room?.accessRequests?.[
      companyId
    ];

  if (!request) return;

  if (
    request.status ===
    "approved"
  ) {
    hideAuthorizationWaiting();

    $("#entrada")
      ?.classList.add(
        "hidden"
      );

    $("#jogo")
      ?.classList.remove(
        "hidden"
      );

    if (
      $("#statusAutorizacao")
    ) {
      $("#statusAutorizacao").textContent =
        "✅ Acesso autorizado pelo professor";
    }

    try {
      sessionStorage.setItem(
        `adm360:authorized:${roomCode}:${companyId}`,
        String(
          request.approvedAt ||
          request.updatedAt ||
          now()
        )
      );
    } catch {}

    render();
    return;
  }

  if (
    request.status ===
    "denied"
  ) {
    showAuthorizationWaiting();

    const card =
      $(".authorization-card");

    if (card) {
      const p =
        card.querySelector("p");

      if (p) {
        p.textContent =
          "O professor não autorizou esta entrada. Aguarde novas orientações.";
      }
    }

    if (
      $("#statusAutorizacao")
    ) {
      $("#statusAutorizacao").textContent =
        "❌ Acesso não autorizado";
    }

    return;
  }

  if (
    request.status ===
    "pending"
  ) {
    showAuthorizationWaiting();

    if (
      $("#statusAutorizacao")
    ) {
      $("#statusAutorizacao").textContent =
        "⏳ Aguardando autorização";
    }
  }
}

/* ============================================================
   MEMÓRIA LOCAL DO ACESSO
   ============================================================ */

function rememberAccess() {
  try {
    localStorage.setItem(
      "adm360:lastCompanyAccess",
      JSON.stringify({
        roomCode,
        companyId,
        name:
          company?.name || ""
      })
    );
  } catch {}
}

/* ============================================================
   ENTRAR NA EMPRESA
   ============================================================ */

async function enterCompany() {
  roomCode =
    $("#codigo")
      ?.value
      .trim()
      .toUpperCase();

  const name =
    $("#nomeEmpresa")
      ?.value
      .trim();

  const password =
    $("#senhaEmpresa")
      ?.value
      .trim();

  const components =
    parseComponents(
      $("#componentes")
        ?.value || ""
    );

  if (
    !roomCode ||
    !name ||
    !password
  ) {
    toast(
      "Informe código da sala, nome e senha da empresa."
    );
    return;
  }

  if (
    password.length < 4
  ) {
    toast(
      "A senha deve ter pelo menos 4 caracteres."
    );
    return;
  }

  room =
    await getRoom();

  if (!room) {
    toast(
      "Sala não encontrada. Confira o código."
    );
    return;
  }

  const existing =
    findExistingCompany(name);

  /* ----------------------------------------------------------
     EMPRESA EXISTENTE = REENTRADA
     ---------------------------------------------------------- */

  if (existing) {
    if (
      !existing.accessPassword
    ) {
      existing.accessPassword =
        password;

      existing.passwordCreatedAt =
        now();
    } else if (
      String(
        existing.accessPassword
      ) !== password
    ) {
      toast(
        "Senha da empresa incorreta."
      );
      return;
    }

    companyId =
      existing.id;

    company =
      existing;

    company.eventResponses =
      company.eventResponses || {};

    if (
      components.length &&
      !getComponentsText(
        company
      )
    ) {
      company.components =
        components;
    }

    await saveCompany();

    rememberAccess();

    await listen();

    await createAccessRequest();

    toast(
      "🔒 Solicitação enviada ao professor."
    );

    return;
  }

  /* ----------------------------------------------------------
     NOVA EMPRESA
     ---------------------------------------------------------- */

  companyId =
    safeId(name);

  const createdAt =
    now();

  company = {
    id:
      companyId,

    name,

    segment:
      $("#segmento")
        ?.value || "",

    components,

    accessPassword:
      password,

    passwordCreatedAt:
      createdAt,

    caixa:
      100000,

    clientes:
      50,

    reputacao:
      50,

    equipe:
      100,

    inovacao:
      0,

    xp:
      0,

    escudo:
      0,

    pesquisa:
      0,

    campanha:
      0,

    campaignActive:
      false,

    eventResponses:
      {},

    joinedAt:
      createdAt,

    ignoreEventsBefore:
      Number(
        room?.currentEvent
          ?.nonce ||
        createdAt
      )
  };

  await saveCompany();

  rememberAccess();

  $("#entrada")
    ?.classList.add(
      "hidden"
    );

  $("#jogo")
    ?.classList.remove(
      "hidden"
    );

  hideAuthorizationWaiting();

  ensureNegotiationFields();

  await listen();

  render();

  notify(
    "🚀 Empresa cadastrada com sucesso na ADM Arena 360."
  );

  toast(
    `Empresa ${company.name} criada!`
  );
}

/* ============================================================
   NEGOCIAÇÕES
   ============================================================ */

function ensureNegotiationFields() {
  if ($("#negTipo")) {
    return;
  }

  const proposta =
    $("#proposta");

  if (!proposta) return;

  const box =
    document.createElement("div");

  box.className =
    "negotiation-extra";

  box.innerHTML = `
    <label>
      📑 Tipo de proposta
    </label>

    <select id="negTipo">

      <option value="mensagem">
        🤝 Acordo / parceria
      </option>

      <option value="venda-campanha">
        📣 Vender Campanha Viral
      </option>

    </select>

    <div
      id="negVendaCampos"
      class="hidden"
    >
      <label>
        💰 Valor pedido (ADM$)
      </label>

      <input
        id="negValor"
        type="number"
        min="1"
        step="1000"
        placeholder="Ex.: 8000"
      >
    </div>

    <div
      id="negHistorico"
      class="notifications negotiation-history"
    ></div>
  `;

  proposta.parentNode.insertBefore(
    box,
    proposta
  );

  $("#negTipo")
    ?.addEventListener(
      "change",
      () => {
        $("#negVendaCampos")
          ?.classList.toggle(
            "hidden",
            $("#negTipo").value !==
              "venda-campanha"
          );
      }
    );
}

async function sendNegotiation(
  payload
) {
  const f =
    await getFirebase();

  const id =
    "n-" +
    now() +
    "-" +
    Math.floor(
      Math.random() * 9999
    );

  const data = {
    id,

    status:
      "pending",

    createdAt:
      now(),

    seenBy:
      {},

    history: [
      {
        action:
          "created",

        by:
          company.name,

        at:
          now()
      }
    ],

    ...payload
  };

  if (f) {
    await f.set(
      f.ref(
        f.db,
        `rooms/${roomCode}/negotiations/${id}`
      ),
      data
    );
  } else {
    room =
      demoGet(
        `room:${roomCode}`,
        room
      ) || {};

    room.negotiations =
      room.negotiations || {};

    room.negotiations[id] =
      data;

    demoSet(
      `room:${roomCode}`,
      room
    );
  }

  return id;
}

async function updateNegotiation(
  id,
  changes
) {
  const latest =
    await getRoom();

  if (
    !latest?.negotiations?.[
      id
    ]
  ) {
    return false;
  }

  const negotiation =
    latest.negotiations[id];

  Object.assign(
    negotiation,
    changes
  );

  negotiation.updatedAt =
    now();

  negotiation.history =
    negotiation.history || [];

  latest.negotiations[id] =
    negotiation;

  await saveWholeRoom(
    latest
  );

  return true;
}

function negotiationCard(
  id,
  negotiation
) {
  const incoming =
    normalizeName(
      negotiation.to
    ) ===
    normalizeName(
      company.name
    );

  const outgoing =
    normalizeName(
      negotiation.from
    ) ===
    normalizeName(
      company.name
    );

  if (
    !incoming &&
    !outgoing
  ) {
    return "";
  }

  const statusLabels = {
    pending:
      "🟡 PENDENTE",

    accepted:
      "🟢 ACEITA",

    refused:
      "🔴 RECUSADA",

    countered:
      "🔵 CONTRAPROPOSTA"
  };

  const status =
    statusLabels[
      negotiation.status
    ] ||
    negotiation.status ||
    "PENDENTE";

  let actions = "";

  if (
    incoming &&
    negotiation.status ===
      "pending"
  ) {
    actions = `
      <div class="negotiation-actions">

        <button
          class="neg-accept"
          data-neg-action="accept"
          data-neg-id="${id}"
        >
          ✅ ACEITAR
        </button>

        <button
          class="neg-refuse"
          data-neg-action="refuse"
          data-neg-id="${id}"
        >
          ❌ RECUSAR
        </button>

        <button
          class="neg-counter"
          data-neg-action="counter"
          data-neg-id="${id}"
        >
          ↩️ CONTRAPROPOSTA
        </button>

      </div>
    `;
  }

  return `
    <div class="notification negotiation-item">

      <strong>
        ${
          incoming
            ? "📥 Recebida de"
            : "📤 Enviada para"
        }

        ${escapeHtml(
          incoming
            ? negotiation.from
            : negotiation.to
        )}
      </strong>

      <br><br>

      ${
        negotiation.type ===
        "venda-campanha"
          ? `
            📣 Campanha Viral
            <br>
            💰 Valor:
            <strong>
              ADM$ ${money(negotiation.value)}
            </strong>
          `
          : escapeHtml(
              negotiation.message ||
              "Proposta comercial"
            )
      }

      ${
        negotiation.counterMessage
          ? `
            <br><br>
            ↩️ <strong>Contraproposta:</strong>
            ${escapeHtml(
              negotiation.counterMessage
            )}
          `
          : ""
      }

      <br><br>

      <small>
        Status:
        <strong>
          ${status}
        </strong>
      </small>

      ${actions}

    </div>
  `;
}

function renderNegotiations() {
  ensureNegotiationFields();

  const box =
    $("#negHistorico");

  if (
    !box ||
    !company ||
    !room
  ) {
    return;
  }

  const entries =
    Object.entries(
      room.negotiations || {}
    )
      .filter(
        ([, negotiation]) =>
          normalizeName(
            negotiation.to
          ) ===
            normalizeName(
              company.name
            ) ||
          normalizeName(
            negotiation.from
          ) ===
            normalizeName(
              company.name
            )
      )
      .sort(
        (a, b) =>
          Number(
            b[1].updatedAt ||
            b[1].createdAt ||
            0
          ) -
          Number(
            a[1].updatedAt ||
            a[1].createdAt ||
            0
          )
      );

  box.innerHTML =
    entries
      .slice(0, 12)
      .map(
        ([id, negotiation]) =>
          negotiationCard(
            id,
            negotiation
          )
      )
      .join("") ||
    `
      <p class="muted">
        Nenhuma negociação registrada.
      </p>
    `;

  document
    .querySelectorAll(
      "[data-neg-action]"
    )
    .forEach((button) => {
      button.onclick = () =>
        handleNegotiationAction(
          button.dataset.negId,
          button.dataset.negAction
        );
    });

  const signature =
    entries
      .map(
        ([id, n]) =>
          `${id}:${n.status}:${n.updatedAt || n.createdAt}`
      )
      .join("|");

  if (
    signature !==
    lastNegotiationSignature
  ) {
    lastNegotiationSignature =
      signature;

    const incoming =
      entries.find(
        ([, n]) =>
          normalizeName(n.to) ===
          normalizeName(
            company.name
          )
      );

    if (incoming) {
      const [, n] =
        incoming;

      if (
        n.status ===
        "pending"
      ) {
        notify(
          `🤝 Nova proposta de ${n.from}.`
        );
      }

      if (
        n.status ===
        "accepted"
      ) {
        notify(
          "✅ Negociação concluída."
        );
      }

      if (
        n.status ===
        "refused"
      ) {
        notify(
          "❌ Negociação recusada."
        );
      }

      if (
        n.status ===
        "countered"
      ) {
        notify(
          "↩️ Contraproposta registrada."
        );
      }
    }
  }
}

/* ============================================================
   TRANSFERÊNCIA CAMPANHA VIRAL
   ============================================================ */

async function completeCampaignSale(
  negotiationId,
  negotiation
) {
  const latest =
    await getRoom();

  const seller =
    findCompanyInRoom(
      latest,
      negotiation.from
    );

  const buyer =
    findCompanyInRoom(
      latest,
      negotiation.to
    );

  if (
    !seller ||
    !buyer
  ) {
    toast(
      "Empresa compradora ou vendedora não encontrada."
    );
    return false;
  }

  const value =
    Number(
      negotiation.value || 0
    );

  if (
    value <= 0
  ) {
    toast(
      "Valor inválido."
    );
    return false;
  }

  if (
    Number(
      buyer.caixa || 0
    ) < value
  ) {
    toast(
      "A empresa compradora não possui caixa suficiente."
    );
    return false;
  }

  if (
    Number(
      seller.campanha || 0
    ) <= 0
  ) {
    toast(
      "A empresa vendedora não possui Campanha Viral."
    );
    return false;
  }

  buyer.caixa =
    Number(
      buyer.caixa || 0
    ) - value;

  seller.caixa =
    Number(
      seller.caixa || 0
    ) + value;

  seller.campanha =
    Number(
      seller.campanha || 0
    ) - 1;

  buyer.campanha =
    Number(
      buyer.campanha || 0
    ) + 1;

  /*
     Se a campanha estava ativa no vendedor:
     - perde 15 clientes
     - perde 10 reputação
     - NÃO perde XP já conquistado
  */

  if (
    seller.campaignActive
  ) {
    seller.clientes =
      Math.max(
        0,
        Number(
          seller.clientes || 0
        ) - 15
      );

    seller.reputacao =
      Math.max(
        0,
        Number(
          seller.reputacao || 0
        ) - 10
      );

    seller.campaignActive =
      false;

    seller.campaignSoldAfterActivation =
      true;

    seller.campaignSoldAt =
      now();
  }

  /*
     Comprador recebe a campanha
     inicialmente INATIVA.
  */

  buyer.campaignActive =
    false;

  buyer.campaignReceivedAt =
    now();

  latest.companies[
    seller.id
  ] = seller;

  latest.companies[
    buyer.id
  ] = buyer;

  const updated =
    latest.negotiations[
      negotiationId
    ];

  updated.status =
    "accepted";

  updated.completedAt =
    now();

  updated.finalValue =
    value;

  updated.history =
    updated.history || [];

  updated.history.push({
    action:
      "accepted-and-transferred",

    by:
      buyer.name,

    at:
      now(),

    value
  });

  latest.negotiations[
    negotiationId
  ] = updated;

  await saveWholeRoom(
    latest
  );

  return true;
}

/* ============================================================
   AÇÕES DA NEGOCIAÇÃO
   ============================================================ */

async function handleNegotiationAction(
  id,
  action
) {
  const negotiation =
    room?.negotiations?.[
      id
    ];

  if (!negotiation) {
    return;
  }

  if (
    action ===
    "refuse"
  ) {
    await updateNegotiation(
      id,
      {
        status:
          "refused",

        respondedBy:
          company.name,

        respondedAt:
          now()
      }
    );

    toast(
      "Proposta recusada."
    );

    return;
  }

  if (
    action ===
    "counter"
  ) {
    let newValue = null;
    let counterText = "";

    if (
      negotiation.type ===
      "venda-campanha"
    ) {
      const typed =
        prompt(
          `Valor atual: ADM$ ${money(negotiation.value)}\n\nDigite o novo valor da contraproposta:`
        );

      if (
        typed === null
      ) {
        return;
      }

      newValue =
        Math.floor(
          Number(
            String(typed)
              .replace(/\./g, "")
              .replace(",", ".")
          )
        );

      if (
        !Number.isFinite(
          newValue
        ) ||
        newValue <= 0
      ) {
        toast(
          "Digite um valor válido."
        );

        return;
      }

      counterText =
        `Contraproposta de ADM$ ${money(newValue)}.`;
    } else {
      const typed =
        prompt(
          "Digite sua contraproposta:"
        );

      if (!typed) return;

      counterText =
        typed.trim();
    }

    const latest =
      await getRoom();

    const original =
      latest?.negotiations?.[
        id
      ];

    if (!original) return;

    /*
       Marca a proposta anterior
       como contraposta.
    */

    original.status =
      "countered";

    original.counterMessage =
      counterText;

    original.counteredBy =
      company.name;

    original.updatedAt =
      now();

    original.history =
      original.history || [];

    original.history.push({
      action:
        "countered",

      by:
        company.name,

      at:
        now(),

      value:
        newValue
    });

    latest.negotiations[
      id
    ] = original;

    await saveWholeRoom(
      latest
    );

    /*
       Nova proposta volta ao remetente original.
    */

    await sendNegotiation({
      from:
        company.name,

      to:
        original.from,

      type:
        original.type,

      resource:
        original.resource,

      value:
        newValue ??
        original.value,

      message:
        original.message,

      counterMessage:
        counterText,

      parentId:
        id,

      originId:
        original.originId || id
    });

    toast(
      "↩️ Contraproposta enviada."
    );

    return;
  }

  if (
    action ===
    "accept"
  ) {
    if (
      negotiation.type ===
      "venda-campanha"
    ) {
      const ok =
        await completeCampaignSale(
          id,
          negotiation
        );

      if (ok) {
        toast(
          "✅ Compra concluída. Campanha Viral transferida."
        );

        notify(
          "📣 Campanha Viral recebida. Agora ela pode ser ativada."
        );
      }

      return;
    }

    await updateNegotiation(
      id,
      {
        status:
          "accepted",

        respondedBy:
          company.name,

        respondedAt:
          now()
      }
    );

    toast(
      "✅ Proposta aceita."
    );
  }
}

/* ============================================================
   ENVIAR NOVA PROPOSTA
   ============================================================ */

async function sendProposalFromForm() {
  if (!company) return;

  const to =
    $("#destino")
      ?.value
      .trim();

  const message =
    $("#proposta")
      ?.value
      .trim();

  const type =
    $("#negTipo")
      ?.value ||
    "mensagem";

  if (!to) {
    toast(
      "Informe a empresa destinatária."
    );

    return;
  }

  const target =
    findCompanyByName(to);

  if (!target) {
    toast(
      "Empresa destinatária não encontrada nesta sala."
    );

    return;
  }

  if (
    target.id ===
    companyId
  ) {
    toast(
      "Não é possível negociar com a própria empresa."
    );

    return;
  }

  if (
    type ===
    "venda-campanha"
  ) {
    const value =
      Math.floor(
        Number(
          $("#negValor")
            ?.value || 0
        )
      );

    if (
      Number(
        company.campanha || 0
      ) <= 0
    ) {
      toast(
        "Sua empresa não possui Campanha Viral para vender."
      );

      return;
    }

    if (
      !value ||
      value <= 0
    ) {
      toast(
        "Informe o valor da Campanha Viral."
      );

      return;
    }

    await sendNegotiation({
      from:
        company.name,

      to:
        target.name,

      type:
        "venda-campanha",

      resource:
        "campanha",

      value,

      message:
        message ||
        `Venda de Campanha Viral por ADM$ ${money(value)}`
    });

    toast(
      "📣 Proposta de venda enviada."
    );
  } else {
    if (!message) {
      toast(
        "Digite a proposta."
      );

      return;
    }

    await sendNegotiation({
      from:
        company.name,

      to:
        target.name,

      type:
        "mensagem",

      message
    });

    toast(
      "🤝 Proposta enviada."
    );
  }

  if ($("#proposta")) {
    $("#proposta").value =
      "";
  }

  if ($("#negValor")) {
    $("#negValor").value =
      "";
  }
}

/* ============================================================
   CENTRAL ESTRATÉGICA MOBILE
   ============================================================ */

function generateMobileCode() {
  return String(
    Math.floor(
      100000 +
      Math.random() * 900000
    )
  );
}

function generateMobileToken() {
  return (
    Date.now().toString(36) +
    Math.random()
      .toString(36)
      .slice(2, 12)
  );
}

async function connectMobile() {
  if (
    !company ||
    !roomCode
  ) {
    toast(
      "Entre na empresa antes de conectar o celular."
    );

    return;
  }

  const latest =
    await getRoom();

  if (!latest) return;

  latest.mobileConnections =
    latest.mobileConnections ||
    {};

  const existing =
    latest.mobileConnections[
      companyId
    ];

  const code =
    existing?.code ||
    generateMobileCode();

  const token =
    existing?.token ||
    generateMobileToken();

  latest.mobileConnections[
    companyId
  ] = {
    companyId,

    companyName:
      company.name,

    code,

    token,

    status:
      "active",

    createdAt:
      existing?.createdAt ||
      now(),

    updatedAt:
      now()
  };

  await saveWholeRoom(
    latest
  );

  if (
    $("#codigoMobile")
  ) {
    $("#codigoMobile").textContent =
      code;
  }

  if (
    $("#statusCelular")
  ) {
    $("#statusCelular").textContent =
      "📡 Central Mobile preparada";
  }

  $("#modalMobile")
    ?.classList.remove(
      "hidden"
    );

  const card =
    $(".mobile-modal-card");

  if (
    card &&
    !$("#mobileDirectLink")
  ) {
    const url =
      new URL(
        window.location.href
      );

    url.search = "";

    url.searchParams.set(
      "mode",
      "mobile"
    );

    url.searchParams.set(
      "room",
      roomCode
    );

    url.searchParams.set(
      "company",
      companyId
    );

    url.searchParams.set(
      "token",
      token
    );

    const linkBox =
      document.createElement(
        "div"
      );

    linkBox.id =
      "mobileDirectLink";

    linkBox.className =
      "mobile-direct-link";

    linkBox.innerHTML = `
      <p class="muted">
        No celular da empresa, abra este endereço:
      </p>

      <a
        class="primary mobile-open-link"
        href="${url.toString()}"
      >
        📱 ABRIR CENTRAL MOBILE NESTE APARELHO
      </a>

      <p class="muted">
        O código ${code} identifica esta conexão estratégica.
      </p>
    `;

    card.insertBefore(
      linkBox,
      $("#fecharMobile")
    );
  }
}

function addMobileLocalMessage(
  text
) {
  try {
    const key =
      `adm360:mobilefeed:${roomCode}:${companyId}`;

    const saved =
      JSON.parse(
        localStorage.getItem(
          key
        ) || "[]"
      );

    saved.unshift({
      text,
      at:
        now()
    });

    localStorage.setItem(
      key,
      JSON.stringify(
        saved.slice(0, 20)
      )
    );
  } catch {}

  renderMobileFeed();
}

function getRoomMobileMessages() {
  const messages =
    room?.mobileMessages || {};

  return Object.entries(messages)
    .map(([id, item]) => ({
      id,
      ...item
    }))
    .filter((item) => {
      if (
        item.target ===
        "all"
      ) {
        return true;
      }

      if (
        item.companyId ===
        companyId
      ) {
        return true;
      }

      if (
        normalizeName(
          item.companyName
        ) ===
        normalizeName(
          company?.name
        )
      ) {
        return true;
      }

      return false;
    })
    .sort(
      (a, b) =>
        Number(
          b.createdAt || 0
        ) -
        Number(
          a.createdAt || 0
        )
    );
}

function renderMobileFeed() {
  if (!company) return;

  const feed =
    $("#mobileStrategicFeed");

  const box =
    $("#mobileMessages");

  if (
    !feed ||
    !box
  ) {
    return;
  }

  const items = [];

  /*
     Mensagens liberadas pelo professor.
  */

  getRoomMobileMessages()
    .slice(0, 10)
    .forEach((message) => {
      items.push({
        text:
          message.text ||
          message.message ||
          "Informação estratégica.",

        at:
          message.createdAt || 0
      });
    });

  /*
     Evento atual.
  */

  if (
    room?.currentEvent?.id &&
    shouldReceiveCurrentEvent(
      room.currentEvent
    )
  ) {
    const ev =
      events[
        room.currentEvent.id
      ];

    if (ev) {
      items.push({
        text:
          `⚠️ Mercado: ${ev.title} — ${ev.text}`,

        at:
          room.currentEvent.nonce || 0
      });
    }
  }

  /*
     Leilão.
  */

  if (
    room?.auction?.status ===
    "open"
  ) {
    items.push({
      text:
        `🔨 Leilão aberto: ${room.auction.title || "recurso estratégico"}. Lance mínimo ADM$ ${money(room.auction.minBid)}.`,

      at:
        room.auction.openedAt || 0
    });
  }

  /*
     Negociação recebida.
  */

  Object.values(
    room?.negotiations || {}
  )
    .filter(
      (n) =>
        normalizeName(
          n.to
        ) ===
          normalizeName(
            company.name
          ) &&
        n.status ===
          "pending"
    )
    .forEach((n) => {
      items.push({
        text:
          `🤝 Nova proposta recebida de ${n.from}.`,

        at:
          n.createdAt || 0
      });
    });

  /*
     Mensagens locais deste aparelho.
  */

  try {
    const local =
      JSON.parse(
        localStorage.getItem(
          `adm360:mobilefeed:${roomCode}:${companyId}`
        ) || "[]"
      );

    local.forEach((item) =>
      items.push(item)
    );
  } catch {}

  const unique = [];

  const seen =
    new Set();

  items
    .sort(
      (a, b) =>
        Number(b.at || 0) -
        Number(a.at || 0)
    )
    .forEach((item) => {
      if (
        !seen.has(
          item.text
        )
      ) {
        seen.add(
          item.text
        );

        unique.push(
          item
        );
      }
    });

  if (!unique.length) {
    feed.classList.add(
      "hidden"
    );

    box.textContent =
      "Aguardando informações estratégicas...";

    return;
  }

  feed.classList.remove(
    "hidden"
  );

  box.innerHTML =
    unique
      .slice(0, 12)
      .map(
        (item) => `
          <div class="notification mobile-message">
            ${escapeHtml(item.text)}
          </div>
        `
      )
      .join("");
}

/* ============================================================
   MODO MOBILE
   ============================================================ */

async function bootMobileMode() {
  const params =
    new URLSearchParams(
      location.search
    );

  if (
    params.get("mode") !==
    "mobile"
  ) {
    return false;
  }

  mobileMode = true;

  roomCode =
    String(
      params.get("room") || ""
    ).toUpperCase();

  companyId =
    params.get("company");

  const token =
    params.get("token");

  if (
    !roomCode ||
    !companyId ||
    !token
  ) {
    toast(
      "Conexão Mobile inválida."
    );

    return true;
  }

  room =
    await getRoom();

  if (!room) {
    toast(
      "Sala não encontrada."
    );

    return true;
  }

  const connection =
    room?.mobileConnections?.[
      companyId
    ];

  if (
    !connection ||
    connection.token !==
      token ||
    connection.status !==
      "active"
  ) {
    toast(
      "Central Mobile não autorizada."
    );

    return true;
  }

  company =
    room?.companies?.[
      companyId
    ];

  if (!company) {
    toast(
      "Empresa não encontrada."
    );

    return true;
  }

  $("#entrada")
    ?.classList.add(
      "hidden"
    );

  $("#jogo")
    ?.classList.remove(
      "hidden"
    );

  document.body.classList.add(
    "mobile-only-mode"
  );

  await listen();

  render();

  renderMobileFeed();

  return true;
}

/* ============================================================
   RENDERIZAÇÃO
   ============================================================ */

function render() {
  if (
    !company ||
    !room
  ) {
    return;
  }

  if ($("#empresaNome")) {
    $("#empresaNome").textContent =
      company.name || "—";
  }

  if ($("#empresaSegmento")) {
    $("#empresaSegmento").textContent =
      company.segment || "—";
  }

  if ($("#empresaComponentes")) {
    $("#empresaComponentes").textContent =
      getComponentsText(company) ||
      "Componentes não informados";
  }

  if ($("#salaPill")) {
    $("#salaPill").textContent =
      `Sala ${roomCode}`;
  }

  if ($("#fasePill")) {
    $("#fasePill").textContent =
      room.status ||
      "Aguardando";
  }

  if ($("#caixa")) {
    $("#caixa").textContent =
      "ADM$ " +
      money(company.caixa);
  }

  if ($("#clientes")) {
    $("#clientes").textContent =
      Number(
        company.clientes || 0
      );
  }

  if ($("#reputacao")) {
    $("#reputacao").textContent =
      Number(
        company.reputacao || 0
      );
  }

  if ($("#equipe")) {
    $("#equipe").textContent =
      Number(
        company.equipe || 0
      ) + "%";
  }

  if ($("#inovacao")) {
    $("#inovacao").textContent =
      Number(
        company.inovacao || 0
      );
  }

  if ($("#xp")) {
    $("#xp").textContent =
      Number(
        company.xp || 0
      );
  }

  if ($("#escudo")) {
    $("#escudo").textContent =
      Number(
        company.escudo || 0
      );
  }

  if ($("#pesquisa")) {
    $("#pesquisa").textContent =
      Number(
        company.pesquisa || 0
      );
  }

  if ($("#campanha")) {
    $("#campanha").textContent =
      Number(
        company.campanha || 0
      );
  }

  const roundNumber =
    Number(
      room.round || 0
    );

  const round =
    rounds[
      Math.max(
        0,
        roundNumber - 1
      )
    ];

  if ($("#missaoTexto")) {
    $("#missaoTexto").textContent =
      round
        ? round.text
        : "Aguarde o professor iniciar a partida.";
  }

  if ($("#decisaoArea")) {
    $("#decisaoArea").innerHTML =
      decisionHtml(
        roundNumber
      );
  }

  bindDecision();
  bindInvestmentPlan();
  bindAuction();

  ensureInventoryButtons();
  ensureNegotiationFields();

  renderNegotiations();
  renderMobileFeed();

  if (
    room?.mobileConnections?.[
      companyId
    ]?.status === "active"
  ) {
    if (
      $("#statusCelular")
    ) {
      $("#statusCelular").textContent =
        "📡 Central Mobile ativa";
    }
  }

  /*
     No celular estratégico,
     escondemos controles administrativos
     da empresa e deixamos a central mobile.
  */

  if (mobileMode) {
    document
      .querySelectorAll(
        ".main-action-grid, .business-grid, .access-security-card"
      )
      .forEach((el) => {
        el.style.display =
          "none";
      });

    const central =
      $("#centralMobile");

    if (central) {
      central.style.display =
        "block";
    }

    if (
      $("#statusCelular")
    ) {
      $("#statusCelular").textContent =
        "📡 CELULAR ESTRATÉGICO CONECTADO";
    }
  }
}

/* ============================================================
   BOTÕES GERAIS
   ============================================================ */

function bindStaticButtons() {
  $("#entrar")
    ?.addEventListener(
      "click",
      async () => {
        const button =
          $("#entrar");

        if (button) {
          button.disabled =
            true;
        }

        try {
          await enterCompany();
        } catch (error) {
          console.error(
            error
          );

          toast(
            `Não foi possível entrar: ${error.message}`
          );
        } finally {
          if (button) {
            button.disabled =
              false;
          }
        }
      }
    );

  $("#enviarProposta")
    ?.addEventListener(
      "click",
      async () => {
        try {
          await sendProposalFromForm();
        } catch (error) {
          console.error(
            error
          );

          toast(
            "Não foi possível enviar a proposta."
          );
        }
      }
    );

  $("#conectarCelular")
    ?.addEventListener(
      "click",
      async () => {
        try {
          await connectMobile();
        } catch (error) {
          console.error(
            error
          );

          toast(
            "Não foi possível preparar a Central Mobile."
          );
        }
      }
    );

  $("#fecharMobile")
    ?.addEventListener(
      "click",
      () => {
        $("#modalMobile")
          ?.classList.add(
            "hidden"
          );
      }
    );
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

async function init() {
  ensureCompanyAccessFields();
  ensureNegotiationFields();

  bindStaticButtons();

  const isMobile =
    await bootMobileMode();

  if (!isMobile) {
    /*
      Tela normal de entrada.
    */
  }

  console.log(
    "ADM Arena 360 — Projeto Empreendedor — Prof. Leopoldo"
  );

  console.log(
    "Empresa carregada com eventos, leilão, negociações, Campanha Viral, autorização de reentrada, componentes e Central Estratégica Mobile."
  );
}

init();
