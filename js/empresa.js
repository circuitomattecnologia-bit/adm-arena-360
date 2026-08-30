import { getFirebase, demoGet, demoSet } from "./firebase-service.js";
import { rounds, events, clampCompany } from "./game.js";

/* ============================================================
   ADM ARENA 360 — PROJETO EMPREENDEDOR — PROF. LEOPOLDO
   EMPRESA.JS — VERSÃO COMPLETA CONSOLIDADA

   REGRA CENTRAL DE ACESSO
   • Primeiro acesso exige autorização do professor.
   • Toda nova entrada exige nova autorização.
   • Acesso Mobile também exige autorização própria.
   • Nenhum progresso é perdido ao sair.
   ============================================================ */

let roomCode = null;
let companyId = null;
let room = null;
let company = null;
let mobileMode = false;
let currentRequestKey = null;
let lastEventNonce = null;
let lastNegotiationSignature = "";
let listenerStarted = false;

const $ = (s) => document.querySelector(s);
const now = () => Date.now();
const money = (v) => Number(v || 0).toLocaleString("pt-BR");

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
    .replace(/^-+|-+$/g, "");

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseComponents(text) {
  return String(text || "")
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function getComponentsText(c = company) {
  if (!c) return "";

  const value =
    c.components ??
    c.componentes ??
    c.members ??
    [];

  if (Array.isArray(value)) {
    return value.join(" • ");
  }

  return String(value || "");
}

function toast(text) {
  const el = $("#toast");

  if (!el) {
    console.log(text);
    return;
  }

  el.textContent = text;
  el.classList.remove("hidden");

  clearTimeout(el._timer);

  el._timer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3500);
}

/* ============================================================
   FIREBASE
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

async function saveWholeRoom(data) {
  const f = await getFirebase();

  if (f) {
    await f.set(
      f.ref(f.db, `rooms/${roomCode}`),
      data
    );
  } else {
    demoSet(`room:${roomCode}`, data);
  }

  room = data;
}

async function saveCompany() {
  if (!roomCode || !companyId || !company) return;

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
    const latest = await getRoom();

    if (!latest) return;

    latest.companies = latest.companies || {};
    latest.companies[companyId] = company;

    await saveWholeRoom(latest);
  }
}

/* ============================================================
   CAMPO DE SENHA
   ============================================================ */

function ensureCompanyPasswordField() {
  if ($("#senhaEmpresa")) return;

  const entrar = $("#entrar");

  if (!entrar) return;

  const wrapper = document.createElement("div");

  wrapper.className = "company-password-box";

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
      No primeiro acesso, crie a senha da empresa.
      Em todas as entradas, o professor deverá autorizar o acesso.
    </p>
  `;

  entrar.parentNode.insertBefore(
    wrapper,
    entrar
  );
}

/* ============================================================
   EMPRESA EXISTENTE
   ============================================================ */

function findExistingCompany(name) {
  const target = normalizeName(name);

  return (
    Object.values(room?.companies || {}).find(
      (c) =>
        normalizeName(c?.name) === target
    ) || null
  );
}

/* ============================================================
   TELA DE AUTORIZAÇÃO
   ============================================================ */

function showAuthorizationWaiting(message) {
  $("#jogo")?.classList.add("hidden");

  $("#bloqueioAutorizacao")
    ?.classList.remove("hidden");

  if ($("#empresaAguardando")) {
    $("#empresaAguardando").textContent =
      company?.name ||
      "Empresa";
  }

  if ($("#statusAutorizacao")) {
    $("#statusAutorizacao").textContent =
      message ||
      "🔒 Aguardando autorização do professor...";
  }
}

function hideAuthorizationWaiting() {
  $("#bloqueioAutorizacao")
    ?.classList.add("hidden");

  $("#entrada")?.classList.add("hidden");
  $("#jogo")?.classList.remove("hidden");
}

/* ============================================================
   SOLICITAÇÃO DE ACESSO
   ============================================================ */

function buildRequestKey(source = "empresa") {
  if (source === "mobile") {
    return `${companyId}__mobile`;
  }

  return companyId;
}

async function createAccessRequest({
  source = "empresa",
  firstAccess = false,
  passwordMismatch = false,
  requestedPassword = null
} = {}) {
  const latest = await getRoom();

  if (!latest) {
    toast("Sala não encontrada.");
    return false;
  }

  latest.accessRequests =
    latest.accessRequests || {};

  const requestKey =
    buildRequestKey(source);

  const requestId =
    `req-${companyId}-${source}-${now()}-${Math.floor(
      Math.random() * 99999
    )}`;

  const request = {
    requestId,
    companyId,
    companyName: company.name,
    components: getComponentsText(company),
    segment: company.segment || "",
    requestedAt: now(),
    status: "pending",
    source,
    firstAccess: Boolean(firstAccess),
    passwordMismatch: Boolean(passwordMismatch),
    round: Number(latest.round || 0)
  };

  if (
    passwordMismatch &&
    requestedPassword
  ) {
    request.requestedPassword =
      requestedPassword;
  }

  latest.accessRequests[
    requestKey
  ] = request;

  currentRequestKey =
    requestKey;

  await saveWholeRoom(latest);

  showAuthorizationWaiting(
    source === "mobile"
      ? "📱 Aguardando autorização do professor para a Central Mobile..."
      : "🔒 Solicitação enviada. Aguardando autorização do professor..."
  );

  return true;
}

/* ============================================================
   VERIFICAR AUTORIZAÇÃO
   ============================================================ */

async function checkAccessAuthorization() {
  if (
    !room ||
    !currentRequestKey
  ) {
    return false;
  }

  const request =
    room.accessRequests?.[
      currentRequestKey
    ];

  if (!request) {
    return false;
  }

  if (
    request.companyId !==
    companyId
  ) {
    return false;
  }

  if (
    request.status ===
    "denied"
  ) {
    showAuthorizationWaiting(
      "❌ Acesso negado pelo professor."
    );

    return false;
  }

  if (
    request.status ===
    "expired"
  ) {
    showAuthorizationWaiting(
      "🔒 Esta autorização expirou. Solicite uma nova entrada ao professor."
    );

    return false;
  }

  if (
    request.status !==
    "approved"
  ) {
    showAuthorizationWaiting(
      "🔒 Aguardando autorização do professor..."
    );

    return false;
  }

  if (
    room.status === "Pausado"
  ) {
    showAuthorizationWaiting(
      "⏸️ A Arena está pausada pelo professor."
    );

    return false;
  }

  if (
    request.passwordMismatch
  ) {
    const updated =
      room.companies?.[
        companyId
      ];

    if (updated) {
      company = updated;
    }
  }

  hideAuthorizationWaiting();

  render();

  return true;
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

  room = await getRoom();

  if (!room) {
    toast(
      "Sala não encontrada. Confira o código."
    );

    return;
  }

  if (
    room.status === "Pausado"
  ) {
    toast(
      "A Arena está pausada pelo professor."
    );

    return;
  }

  const existing =
    findExistingCompany(name);

  /* ----------------------------------------------------------
     EMPRESA EXISTENTE
     ---------------------------------------------------------- */

  if (existing) {
    companyId = existing.id;
    company = existing;

    company.eventResponses =
      company.eventResponses || {};

    if (
      components.length &&
      !getComponentsText(company)
    ) {
      company.components =
        components;
    }

    const storedPassword =
      String(
        existing.accessPassword || ""
      );

    const passwordMismatch =
      Boolean(
        storedPassword &&
        storedPassword !== password
      );

    /*
      Empresa antiga/legada:
      se ainda não possui passwordVersion 2,
      o professor poderá validar a atualização
      da senha mediante autorização.
    */

    const legacyPassword =
      Number(
        existing.passwordVersion || 0
      ) < 2;

    if (
      passwordMismatch &&
      !legacyPassword
    ) {
      toast(
        "Senha da empresa incorreta."
      );

      return;
    }

    await saveCompany();

    await createAccessRequest({
      source: "empresa",
      firstAccess: false,
      passwordMismatch:
        passwordMismatch ||
        legacyPassword,
      requestedPassword:
        password
    });

    await listen();

    toast(
      "🔒 Solicitação enviada ao professor."
    );

    return;
  }

  /* ----------------------------------------------------------
     PRIMEIRO CADASTRO
     ---------------------------------------------------------- */

  companyId =
    safeId(name);

  const createdAt =
    now();

  company = {
    id: companyId,
    name,
    segment:
      $("#segmento")
        ?.value || "",
    components,
    accessPassword:
      password,
    passwordVersion:
      2,
    passwordCreatedAt:
      createdAt,

    caixa: 100000,
    clientes: 50,
    reputacao: 50,
    equipe: 100,
    inovacao: 0,
    xp: 0,

    escudo: 0,
    pesquisa: 0,
    campanha: 0,
    campaignActive: false,

    eventResponses: {},

    joinedAt:
      createdAt,

    ignoreEventsBefore:
      Number(
        room?.currentEvent?.nonce ||
        createdAt
      )
  };

  await saveCompany();

  await createAccessRequest({
    source: "empresa",
    firstAccess: true,
    passwordMismatch: false
  });

  await listen();

  toast(
    "🔒 Empresa cadastrada. Aguardando autorização do professor."
  );
}

/* ============================================================
   ESCUTA EM TEMPO REAL
   ============================================================ */

async function listen() {
  if (listenerStarted) return;

  listenerStarted = true;

  const f = await getFirebase();

  if (f) {
    f.onValue(
      f.ref(
        f.db,
        `rooms/${roomCode}`
      ),
      (snapshot) => {
        room =
          snapshot.val();

        onRoomChange();
      }
    );
  } else {
    setInterval(async () => {
      room =
        await getRoom();

      onRoomChange();
    }, 900);
  }
}

async function onRoomChange() {
  if (!room) return;

  if (
    companyId &&
    room.companies?.[
      companyId
    ]
  ) {
    company =
      room.companies[
        companyId
      ];
  }

  const authorized =
    await checkAccessAuthorization();

  if (!authorized) {
    return;
  }

  if (!mobileMode) {
    handleCurrentEvent();
    handleNegotiations();
  }

  renderMobileStrategicFeed();
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
  $("#modalEvento")
    ?.classList.add("hidden");

  if ($("#eventoOpcoes")) {
    $("#eventoOpcoes").innerHTML = "";
  }
}

function shouldReceiveCurrentEvent(currentEvent) {
  if (!currentEvent?.nonce) {
    return false;
  }

  const nonce =
    Number(currentEvent.nonce || 0);

  const joinedAt =
    Number(company?.joinedAt || 0);

  if (
    company?.ignoreEventsBefore &&
    nonce <=
      Number(
        company.ignoreEventsBefore
      )
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

  const key =
    String(nonce || "");

  if (
    !key ||
    eventResponse(key)
  ) {
    closeEventModal();
    return;
  }

  if (
    !shouldReceiveCurrentEvent(
      room?.currentEvent
    )
  ) {
    closeEventModal();
    return;
  }

  if ($("#eventoTitulo")) {
    $("#eventoTitulo").textContent =
      ev.title;
  }

  if ($("#eventoTexto")) {
    $("#eventoTexto").textContent =
      ev.text;
  }

  if (!$("#eventoOpcoes")) {
    return;
  }

  $("#eventoOpcoes").innerHTML =
    ev.options
      .map(
        (option, index) => `
          <button
            type="button"
            data-event-option="${index}"
          >
            ${escapeHtml(option.label)}
          </button>
        `
      )
      .join("");

  $("#modalEvento")
    ?.classList.remove("hidden");

  document
    .querySelectorAll(
      "[data-event-option]"
    )
    .forEach((button) => {
      button.onclick =
        async () => {
          if (
            eventResponse(key)
          ) {
            closeEventModal();
            return;
          }

          const option =
            ev.options[
              Number(
                button.dataset
                  .eventOption
              )
            ];

          if (!option) return;

          Object.entries(
            option.delta || {}
          ).forEach(
            ([field, value]) => {
              company[field] =
                Number(
                  company[field] || 0
                ) +
                Number(value || 0);
            }
          );

          company.eventResponses =
            company.eventResponses ||
            {};

          company.eventResponses[
            key
          ] = {
            eventId: id,
            eventTitle:
              ev.title,
            optionLabel:
              option.label,
            round:
              Number(
                room.round || 0
              ),
            answeredAt:
              now()
          };

          await saveCompany();

          closeEventModal();

          toast(
            "✅ Evento respondido e consequências aplicadas."
          );

          render();
        };
    });
}

function handleCurrentEvent() {
  const currentEvent =
    room?.currentEvent;

  if (
    !currentEvent?.nonce
  ) {
    lastEventNonce = null;
    closeEventModal();
    return;
  }

  const nonce =
    String(
      currentEvent.nonce
    );

  if (
    !shouldReceiveCurrentEvent(
      currentEvent
    )
  ) {
    lastEventNonce =
      currentEvent.nonce;

    closeEventModal();
    return;
  }

  if (
    eventResponse(nonce)
  ) {
    lastEventNonce =
      currentEvent.nonce;

    closeEventModal();
    return;
  }

  if (
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

/* ============================================================
   DECISÕES
   ============================================================ */

const DECISION_LABELS = {
  crescimento:
    "🚀 Foco em crescimento",

  equilibrio:
    "⚖️ Gestão equilibrada",

  seguranca:
    "🛡️ Segurança financeira",

  preco:
    "💲 Competir por preço",

  qualidade:
    "💎 Competir por qualidade",

  pessoas:
    "👥 Investir em pessoas",

  inovacao:
    "💡 Inovar",

  "quiz-sim":
    "✅ SIM",

  "quiz-nao":
    "❌ NÃO",

  "boss-reserva":
    "🛡️ Usar reserva e renegociar",

  "boss-corte":
    "✂️ Cortar investimentos",

  "boss-credito":
    "🏦 Tomar crédito"
};

function confirmedDecisionHtml() {
  return `
    <div class="notification">
      <strong>
        ✅ Decisão confirmada
      </strong>

      <br>

      ${
        company.lastDecisionLabel ||
        "Decisão registrada"
      }

      <br>

      <span class="muted">
        Aguarde o professor avançar.
      </span>
    </div>
  `;
}

function investmentHtml() {
  if (
    company.lastDecisionRound ===
    room.round
  ) {
    return confirmedDecisionHtml();
  }

  const saved =
    company.investmentPlan || {};

  return `
    <div class="stack">

      <label>
        🏢 Estrutura
      </label>

      <input
        id="invEstrutura"
        type="number"
        min="0"
        step="1000"
        value="${saved.estrutura || 0}"
      >

      <label>
        👥 Pessoas
      </label>

      <input
        id="invPessoas"
        type="number"
        min="0"
        step="1000"
        value="${saved.pessoas || 0}"
      >

      <label>
        📣 Marketing
      </label>

      <input
        id="invMarketing"
        type="number"
        min="0"
        step="1000"
        value="${saved.marketing || 0}"
      >

      <label>
        💻 Tecnologia
      </label>

      <input
        id="invTecnologia"
        type="number"
        min="0"
        step="1000"
        value="${saved.tecnologia || 0}"
      >

      <label>
        📦 Estoque
      </label>

      <input
        id="invEstoque"
        type="number"
        min="0"
        step="1000"
        value="${saved.estoque || 0}"
      >

      <label>
        🛟 Reserva
      </label>

      <input
        id="invReserva"
        type="number"
        min="0"
        step="1000"
        value="${saved.reserva || 0}"
      >

      <div
        id="investmentSummary"
        class="notification"
      >
        Total alocado: ADM$ 0
      </div>

      <button
        id="confirmarPlanoInvest"
        class="primary"
        type="button"
      >
        💰 CONFIRMAR PLANO
      </button>

    </div>
  `;
}

function bindInvestmentPlan() {
  const button =
    $("#confirmarPlanoInvest");

  if (!button) return;

  const values = () => ({
    estrutura:
      Math.max(
        0,
        Number(
          $("#invEstrutura")
            ?.value || 0
        )
      ),

    pessoas:
      Math.max(
        0,
        Number(
          $("#invPessoas")
            ?.value || 0
        )
      ),

    marketing:
      Math.max(
        0,
        Number(
          $("#invMarketing")
            ?.value || 0
        )
      ),

    tecnologia:
      Math.max(
        0,
        Number(
          $("#invTecnologia")
            ?.value || 0
        )
      ),

    estoque:
      Math.max(
        0,
        Number(
          $("#invEstoque")
            ?.value || 0
        )
      ),

    reserva:
      Math.max(
        0,
        Number(
          $("#invReserva")
            ?.value || 0
        )
      )
  });

  const updateSummary =
    () => {
      const v = values();

      const total =
        Object.values(v)
          .reduce(
            (a, b) => a + b,
            0
          );

      const gasto =
        v.estrutura +
        v.pessoas +
        v.marketing +
        v.tecnologia +
        v.estoque;

      if (
        $("#investmentSummary")
      ) {
        $("#investmentSummary")
          .textContent =
          `Total alocado: ADM$ ${money(total)} • ` +
          `Saída real: ADM$ ${money(gasto)}`;
      }
    };

  [
    "#invEstrutura",
    "#invPessoas",
    "#invMarketing",
    "#invTecnologia",
    "#invEstoque",
    "#invReserva"
  ].forEach((selector) => {
    $(selector)
      ?.addEventListener(
        "input",
        updateSummary
      );
  });

  updateSummary();

  button.onclick =
    async () => {
      if (
        company.lastDecisionRound ===
        room.round
      ) {
        toast(
          "Esta rodada já foi respondida."
        );
        return;
      }

      const v = values();

      const total =
        Object.values(v)
          .reduce(
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
        Number(
          company.caixa || 0
        );

      if (total <= 0) {
        toast(
          "Distribua algum valor."
        );
        return;
      }

      if (total > caixaAtual) {
        toast(
          "O total não pode ultrapassar o caixa disponível."
        );
        return;
      }

      company.investmentPlan =
        v;

      company.reservaFinanceira =
        v.reserva;

      company.caixa =
        caixaAtual -
        gasto;

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

      company.escudo =
        Number(
          company.escudo || 0
        ) +
        Math.floor(
          v.reserva / 20000
        );

      company.xp +=
        6 +
        Object.values(v)
          .filter(
            (x) => x > 0
          ).length;

      company.lastDecisionRound =
        room.round;

      company.lastDecisionLabel =
        "💰 Plano de investimentos confirmado";

      company.lastDecisionAt =
        now();

      await saveCompany();

      toast(
        "✅ Plano de investimentos registrado."
      );

      render();
    };
}

/* ============================================================
   LEILÃO
   ============================================================ */

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
    auction.bids?.[
      companyId
    ];

  if (
    auction.status ===
    "open"
  ) {
    return `
      <div class="stack">

        <div class="notification">

          <strong>
            ${escapeHtml(
              auction.title ||
              "🔨 Leilão"
            )}
          </strong>

          <br>

          ${escapeHtml(
            auction.description ||
            ""
          )}

          <br><br>

          Lance mínimo:
          <strong>
            ADM$ ${money(
              auction.minBid
            )}
          </strong>

        </div>

        <input
          id="valorLance"
          type="number"
          min="${Number(
            auction.minBid || 0
          )}"
          value="${
            myBid
              ? Number(
                  myBid.amount || 0
                )
              : Number(
                  auction.minBid || 0
                )
          }"
        >

        <button
          id="enviarLance"
          class="primary"
          type="button"
        >
          🔒 ENVIAR LANCE
        </button>

        ${
          myBid
            ? `
                <div class="notification">
                  ✅ Lance atual:
                  ADM$ ${money(myBid.amount)}
                </div>
              `
            : ""
        }

      </div>
    `;
  }

  if (
    auction.status ===
    "closed"
  ) {
    if (
      auction.winnerId ===
      companyId
    ) {
      return `
        <div class="notification">
          🏆
          <strong>
            SUA EMPRESA VENCEU!
          </strong>

          <br>

          ADM$ ${money(
            auction.winningBid
          )}
        </div>
      `;
    }

    return `
      <div class="notification">
        Leilão encerrado.

        <br>

        ${
          auction.winnerName
            ? `Vencedora: ${escapeHtml(
                auction.winnerName
              )}`
            : "Sem vencedor."
        }
      </div>
    `;
  }

  return "";
}

function bindAuction() {
  const button =
    $("#enviarLance");

  if (!button) return;

  button.onclick =
    async () => {
      const value =
        Math.floor(
          Number(
            $("#valorLance")
              ?.value || 0
          )
        );

      const auction =
        room?.auction;

      if (
        !auction ||
        auction.status !==
          "open"
      ) {
        toast(
          "O leilão não está aberto."
        );
        return;
      }

      if (
        value <
        Number(
          auction.minBid || 0
        )
      ) {
        toast(
          `Lance mínimo: ADM$ ${money(
            auction.minBid
          )}.`
        );
        return;
      }

      if (
        value >
        Number(
          company.caixa || 0
        )
      ) {
        toast(
          "Saldo insuficiente."
        );
        return;
      }

      const f =
        await getFirebase();

      const payload = {
        companyId,
        companyName:
          company.name,
        amount:
          value,
        createdAt:
          now()
      };

      if (f) {
        await f.set(
          f.ref(
            f.db,
            `rooms/${roomCode}/auction/bids/${companyId}`
          ),
          payload
        );
      } else {
        const latest =
          await getRoom();

        latest.auction.bids =
          latest.auction.bids ||
          {};

        latest.auction.bids[
          companyId
        ] = payload;

        await saveWholeRoom(
          latest
        );
      }

      toast(
        "🔒 Lance enviado."
      );
    };
}

/* ============================================================
   CAMPANHA VIRAL
   ============================================================ */

function ensureCampaignButton() {
  const line =
    $("#campanha")
      ?.parentElement;

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
      "inventory-action";

    line.appendChild(
      button
    );
  }

  const quantity =
    Number(
      company.campanha || 0
    );

  if (quantity <= 0) {
    button.textContent =
      "🔒 SEM CAMPANHA";

    button.disabled =
      true;

    return;
  }

  if (
    company.campaignActive
  ) {
    button.textContent =
      "✅ CAMPANHA ATIVA";

    button.disabled =
      true;

    return;
  }

  button.textContent =
    "📣 ATIVAR CAMPANHA VIRAL";

  button.disabled =
    false;

  button.onclick =
    activateViralCampaign;
}

async function activateViralCampaign() {
  if (
    Number(
      company.campanha || 0
    ) <= 0
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
    Number(
      company.clientes || 0
    ) + 15;

  company.reputacao =
    Number(
      company.reputacao || 0
    ) + 10;

  company.xp =
    Number(
      company.xp || 0
    ) + 10;

  company.campaignActive =
    true;

  company.campaignActivatedAt =
    now();

  await saveCompany();

  toast(
    "📣 Campanha Viral ativada: +15 clientes, +10 reputação e +10 XP."
  );

  render();
}

/* ============================================================
   RODADAS
   ============================================================ */

function decisionHtml(
  roundNumber
) {
  if (
    company?.lastDecisionRound ===
      roundNumber &&
    [1, 2, 4, 7, 8]
      .includes(roundNumber)
  ) {
    return confirmedDecisionHtml();
  }

  if (
    roundNumber === 1
  ) {
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

  if (
    roundNumber === 2
  ) {
    return investmentHtml();
  }

  if (
    roundNumber === 3
  ) {
    return auctionHtml();
  }

  if (
    roundNumber === 4
  ) {
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

  if (
    roundNumber === 7
  ) {
    return `
      <p>
        Uma empresa pode aumentar
        as vendas e piorar o caixa?
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

  if (
    roundNumber === 8
  ) {
    return `
      <p>
        👾 BOSS FINAL:
        custos +15% e vendas -20%.
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
      Aguarde a ação do professor.
    </p>
  `;
}

function bindDecision() {
  document
    .querySelectorAll(
      "[data-d]"
    )
    .forEach((button) => {
      button.onclick =
        async () => {
          if (
            company.lastDecisionRound ===
            room.round
          ) {
            toast(
              "Esta rodada já foi respondida."
            );
            return;
          }

          const d =
            button.dataset.d;

          if (
            d === "crescimento"
          ) {
            company.caixa -=
              10000;

            company.clientes +=
              8;

            company.xp +=
              10;
          }

          if (
            d === "equilibrio"
          ) {
            company.reputacao +=
              5;

            company.xp +=
              10;
          }

          if (
            d === "seguranca"
          ) {
            company.escudo =
              Number(
                company.escudo ||
                0
              ) + 1;

            company.xp +=
              8;
          }

          if (
            d === "preco"
          ) {
            company.caixa +=
              8000;

            company.clientes +=
              8;

            company.reputacao -=
              2;

            company.xp +=
              7;
          }

          if (
            d === "qualidade"
          ) {
            company.caixa -=
              7000;

            company.reputacao +=
              8;

            company.xp +=
              9;
          }

          if (
            d === "pessoas"
          ) {
            company.caixa -=
              5000;

            company.equipe +=
              10;

            company.xp +=
              9;
          }

          if (
            d === "inovacao"
          ) {
            company.caixa -=
              9000;

            company.inovacao +=
              12;

            company.xp +=
              11;
          }

          if (
            d === "quiz-sim"
          ) {
            company.xp +=
              10;
          }

          if (
            d === "quiz-nao"
          ) {
            company.xp =
              Math.max(
                0,
                company.xp - 2
              );
          }

          if (
            d ===
            "boss-reserva"
          ) {
            company.caixa -=
              5000;

            company.reputacao +=
              6;

            company.xp +=
              18;
          }

          if (
            d ===
            "boss-corte"
          ) {
            company.caixa +=
              3000;

            company.equipe -=
              7;

            company.inovacao -=
              2;

            company.xp +=
              10;
          }

          if (
            d ===
            "boss-credito"
          ) {
            company.caixa +=
              20000;

            company.xp +=
              8;
          }

          company.lastDecisionRound =
            room.round;

          company.lastDecisionCode =
            d;

          company.lastDecisionLabel =
            DECISION_LABELS[d] ||
            d;

          company.lastDecisionAt =
            now();

          await saveCompany();

          toast(
            "✅ Decisão registrada."
          );

          render();
        };
    });
}

/* ============================================================
   NEGOCIAÇÕES
   ============================================================ */

function ensureNegotiationFields() {
  if ($("#negTipo")) return;

  const proposta =
    $("#proposta");

  if (!proposta) return;

  const box =
    document.createElement(
      "div"
    );

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
        💰 Valor pedido
      </label>

      <input
        id="negValor"
        type="number"
        min="1"
        step="1000"
      >
    </div>

    <div
      id="negHistorico"
      class="notifications"
    ></div>
  `;

  proposta.parentNode
    .insertBefore(
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

function findCompanyByName(name) {
  const target =
    normalizeName(name);

  return (
    Object.values(
      room?.companies || {}
    ).find(
      (c) =>
        normalizeName(
          c.name
        ) === target
    ) || null
  );
}

async function sendNegotiation(
  payload
) {
  const latest =
    await getRoom();

  latest.negotiations =
    latest.negotiations ||
    {};

  const id =
    `n-${now()}-${Math.floor(
      Math.random() * 9999
    )}`;

  latest.negotiations[
    id
  ] = {
    id,
    status: "pending",
    createdAt: now(),
    history: [],
    ...payload
  };

  await saveWholeRoom(
    latest
  );

  return id;
}

async function sendProposalFromForm() {
  const destination =
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

  if (!destination) {
    toast(
      "Informe a empresa destinatária."
    );
    return;
  }

  const target =
    findCompanyByName(
      destination
    );

  if (!target) {
    toast(
      "Empresa não encontrada."
    );
    return;
  }

  if (
    target.id ===
    companyId
  ) {
    toast(
      "Não negocie com sua própria empresa."
    );
    return;
  }

  if (
    type ===
    "venda-campanha"
  ) {
    if (
      Number(
        company.campanha || 0
      ) <= 0
    ) {
      toast(
        "Sua empresa não possui Campanha Viral."
      );
      return;
    }

    const value =
      Math.floor(
        Number(
          $("#negValor")
            ?.value || 0
        )
      );

    if (value <= 0) {
      toast(
        "Informe um valor válido."
      );
      return;
    }

    await sendNegotiation({
      from:
        company.name,

      fromId:
        companyId,

      to:
        target.name,

      toId:
        target.id,

      type:
        "venda-campanha",

      resource:
        "campanha",

      value,

      message:
        message ||
        `Venda de Campanha Viral por ADM$ ${money(value)}`
    });

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

      fromId:
        companyId,

      to:
        target.name,

      toId:
        target.id,

      type:
        "mensagem",

      message
    });
  }

  if ($("#proposta")) {
    $("#proposta").value =
      "";
  }

  if ($("#negValor")) {
    $("#negValor").value =
      "";
  }

  toast(
    "🤝 Proposta enviada."
  );
}

function negotiationCard(
  id,
  n
) {
  const incoming =
    n.toId ===
      companyId ||
    normalizeName(n.to) ===
      normalizeName(
        company.name
      );

  const outgoing =
    n.fromId ===
      companyId ||
    normalizeName(n.from) ===
      normalizeName(
        company.name
      );

  if (
    !incoming &&
    !outgoing
  ) {
    return "";
  }

  const statusLabel = {
    pending:
      "🟡 PENDENTE",

    accepted:
      "✅ ACEITA",

    refused:
      "❌ RECUSADA",

    countered:
      "↩️ CONTRAPROPOSTA"
  }[n.status] ||
  n.status;

  let actions = "";

  if (
    incoming &&
    n.status ===
      "pending"
  ) {
    actions = `
      <div class="negotiation-actions">

        <button
          type="button"
          data-neg-action="accept"
          data-neg-id="${id}"
        >
          ✅ ACEITAR
        </button>

        <button
          type="button"
          data-neg-action="refuse"
          data-neg-id="${id}"
        >
          ❌ RECUSAR
        </button>

        <button
          type="button"
          data-neg-action="counter"
          data-neg-id="${id}"
        >
          ↩️ CONTRAPROPOSTA
        </button>

      </div>
    `;
  }

  return `
    <div class="notification">

      <strong>
        ${
          incoming
            ? "📥 Recebida de"
            : "📤 Enviada para"
        }
        ${escapeHtml(
          incoming
            ? n.from
            : n.to
        )}
      </strong>

      <br><br>

      ${
        n.type ===
        "venda-campanha"
          ? `
              📣 Campanha Viral
              <br>
              💰 ADM$ ${money(
                n.value
              )}
            `
          : escapeHtml(
              n.message ||
              ""
            )
      }

      ${
        n.counterMessage
          ? `
              <br><br>
              ↩️ ${escapeHtml(
                n.counterMessage
              )}
            `
          : ""
      }

      <br><br>

      <small>
        ${statusLabel}
      </small>

      ${actions}

    </div>
  `;
}

function handleNegotiations() {
  ensureNegotiationFields();

  const box =
    $("#negHistorico");

  if (!box) return;

  const entries =
    Object.entries(
      room?.negotiations ||
      {}
    )
      .filter(
        ([, n]) =>
          n.toId ===
            companyId ||
          n.fromId ===
            companyId ||
          normalizeName(n.to) ===
            normalizeName(
              company.name
            ) ||
          normalizeName(n.from) ===
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
      .slice(0, 20)
      .map(
        ([id, n]) =>
          negotiationCard(
            id,
            n
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
      button.onclick =
        () =>
          handleNegotiationAction(
            button.dataset.negId,
            button.dataset.negAction
          );
    });
}

async function handleNegotiationAction(
  id,
  action
) {
  const latest =
    await getRoom();

  const n =
    latest?.negotiations?.[
      id
    ];

  if (!n) return;

  if (
    action === "refuse"
  ) {
    n.status =
      "refused";

    n.updatedAt =
      now();

    latest.negotiations[
      id
    ] = n;

    await saveWholeRoom(
      latest
    );

    toast(
      "❌ Proposta recusada."
    );
    return;
  }

  if (
    action === "counter"
  ) {
    let counterMessage =
      "";

    let newValue =
      n.value;

    if (
      n.type ===
      "venda-campanha"
    ) {
      const typed =
        prompt(
          `Valor atual: ADM$ ${money(
            n.value
          )}\nDigite o novo valor:`
        );

      if (typed === null) {
        return;
      }

      newValue =
        Math.floor(
          Number(typed)
        );

      if (
        !Number.isFinite(
          newValue
        ) ||
        newValue <= 0
      ) {
        toast(
          "Valor inválido."
        );
        return;
      }

      counterMessage =
        `Contraproposta: ADM$ ${money(
          newValue
        )}`;
    } else {
      const typed =
        prompt(
          "Digite a contraproposta:"
        );

      if (!typed) return;

      counterMessage =
        typed.trim();
    }

    n.status =
      "countered";

    n.counterMessage =
      counterMessage;

    n.updatedAt =
      now();

    latest.negotiations[
      id
    ] = n;

    await saveWholeRoom(
      latest
    );

    await sendNegotiation({
      from:
        company.name,

      fromId:
        companyId,

      to:
        n.from,

      toId:
        n.fromId,

      type:
        n.type,

      resource:
        n.resource,

      value:
        newValue,

      message:
        n.message,

      counterMessage,

      parentId:
        id
    });

    toast(
      "↩️ Contraproposta enviada."
    );

    return;
  }

  if (
    action === "accept"
  ) {
    if (
      n.type ===
      "venda-campanha"
    ) {
      const seller =
        latest.companies?.[
          n.fromId
        ];

      const buyer =
        latest.companies?.[
          n.toId
        ];

      if (
        !seller ||
        !buyer
      ) {
        toast(
          "Empresa não encontrada."
        );
        return;
      }

      const value =
        Number(
          n.value || 0
        );

      if (
        Number(
          buyer.caixa || 0
        ) < value
      ) {
        toast(
          "A empresa compradora não possui caixa suficiente."
        );
        return;
      }

      if (
        Number(
          seller.campanha ||
          0
        ) <= 0
      ) {
        toast(
          "A empresa vendedora não possui mais Campanha Viral."
        );
        return;
      }

      buyer.caixa =
        Number(
          buyer.caixa || 0
        ) -
        value;

      seller.caixa =
        Number(
          seller.caixa || 0
        ) +
        value;

      seller.campanha =
        Number(
          seller.campanha || 0
        ) - 1;

      buyer.campanha =
        Number(
          buyer.campanha || 0
        ) + 1;

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
      }

      buyer.campaignActive =
        false;

      latest.companies[
        seller.id
      ] = seller;

      latest.companies[
        buyer.id
      ] = buyer;
    }

    n.status =
      "accepted";

    n.updatedAt =
      now();

    n.completedAt =
      now();

    latest.negotiations[
      id
    ] = n;

    await saveWholeRoom(
      latest
    );

    toast(
      "✅ Negociação concluída."
    );
  }
}

/* ============================================================
   CENTRAL MOBILE
   ============================================================ */

function generateMobileCode() {
  return String(
    Math.floor(
      100000 +
      Math.random() *
        900000
    )
  );
}

function generateMobileToken() {
  return (
    now().toString(36) +
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
      "Entre na empresa primeiro."
    );
    return;
  }

  const latest =
    await getRoom();

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
    status: "active",
    createdAt:
      existing?.createdAt ||
      now(),
    updatedAt:
      now()
  };

  await saveWholeRoom(
    latest
  );

  if ($("#codigoMobile")) {
    $("#codigoMobile").textContent =
      code;
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

    const div =
      document.createElement(
        "div"
      );

    div.id =
      "mobileDirectLink";

    div.innerHTML = `
      <p class="muted">
        Abra no celular:
      </p>

      <a
        class="primary"
        href="${url.toString()}"
      >
        📱 ABRIR CENTRAL MOBILE
      </a>
    `;

    card.insertBefore(
      div,
      $("#fecharMobile")
    );
  }
}

async function bootMobileMode() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  if (
    params.get("mode") !==
    "mobile"
  ) {
    return false;
  }

  mobileMode =
    true;

  roomCode =
    String(
      params.get("room") ||
      ""
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
    room.mobileConnections?.[
      companyId
    ];

  if (
    !connection ||
    connection.token !== token ||
    connection.status !==
      "active"
  ) {
    toast(
      "Central Mobile inválida."
    );
    return true;
  }

  company =
    room.companies?.[
      companyId
    ];

  if (!company) {
    toast(
      "Empresa não encontrada."
    );
    return true;
  }

  document.body
    .classList.add(
      "mobile-only-mode"
    );

  await createAccessRequest({
    source:
      "mobile",
    firstAccess:
      false
  });

  await listen();

  return true;
}

function renderMobileStrategicFeed() {
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

  Object.values(
    room?.mobileMessages ||
    {}
  )
    .filter(
      (m) =>
        m.target === "all" ||
        m.companyId ===
          companyId
    )
    .forEach((m) => {
      items.push({
        text:
          m.text ||
          "Informação estratégica",
        at:
          m.createdAt ||
          0
      });
    });

  if (
    room?.auction?.status ===
    "open"
  ) {
    items.push({
      text:
        `🔨 Leilão aberto: ${
          room.auction.title ||
          ""
        }`,
      at:
        room.auction.openedAt ||
        0
    });
  }

  Object.values(
    room?.negotiations ||
    {}
  )
    .filter(
      (n) =>
        n.toId ===
          companyId &&
        n.status ===
          "pending"
    )
    .forEach((n) => {
      items.push({
        text:
          `🤝 Nova proposta de ${n.from}.`,
        at:
          n.createdAt ||
          0
      });
    });

  items.sort(
    (a, b) =>
      Number(b.at) -
      Number(a.at)
  );

  if (!items.length) {
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
    items
      .slice(0, 12)
      .map(
        (item) => `
          <div class="notification">
            ${escapeHtml(
              item.text
            )}
          </div>
        `
      )
      .join("");
}

/* ============================================================
   RENDER
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
      company.name ||
      "—";
  }

  if (
    $("#empresaSegmento")
  ) {
    $("#empresaSegmento").textContent =
      company.segment ||
      "—";
  }

  if (
    $("#empresaComponentes")
  ) {
    $("#empresaComponentes").textContent =
      getComponentsText(
        company
      ) ||
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
      `ADM$ ${money(
        company.caixa
      )}`;
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
      `${Number(
        company.equipe || 0
      )}%`;
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

  ensureCampaignButton();
  ensureNegotiationFields();

  handleNegotiations();
  renderMobileStrategicFeed();

  if (mobileMode) {
    document
      .querySelectorAll(
        ".main-action-grid, .business-grid, .access-security-card"
      )
      .forEach((el) => {
        el.style.display =
          "none";
      });

    if ($("#centralMobile")) {
      $("#centralMobile").style.display =
        "block";
    }
  }
}

/* ============================================================
   BOTÕES
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
  ensureCompanyPasswordField();
  ensureNegotiationFields();
  bindStaticButtons();

  await bootMobileMode();

  console.log(
    "ADM Arena 360 — Projeto Empreendedor — Prof. Leopoldo"
  );

  console.log(
    "empresa.js completo: toda entrada exige autorização do professor."
  );
}

init();
