import { getFirebase, demoGet, demoSet } from "./firebase-service.js";
import { rounds, events, clampCompany } from "./game.js";

/* ============================================================
   ADM ARENA 360
   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   REGRA CENTRAL DE ACESSO
   ------------------------------------------------------------
   • PRIMEIRA entrada: exige autorização do professor.
   • TODA reentrada: exige nova autorização do professor.
   • Nenhuma empresa entra diretamente.
   • Central Mobile também exige autorização própria.
   • Dados e progresso da empresa permanecem salvos.
   ============================================================ */

let roomCode = null;
let companyId = null;
let room = null;
let company = null;

let lastEventNonce = null;
let lastNegotiationSignature = "";
let mobileMode = false;
let currentRequestKey = null;

const $ = s => document.querySelector(s);

const now = () => Date.now();

const money = value =>
  Number(value || 0).toLocaleString("pt-BR");

const normalizeName = text =>
  String(text || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const escapeHtml = text =>
  String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const safeId = text =>
  String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 28) +
  "-" +
  Math.floor(Math.random() * 9999);


/* ============================================================
   MENSAGENS
   ============================================================ */

function toast(text) {
  const box = $("#toast");

  if (!box) return;

  box.textContent = text;
  box.classList.remove("hidden");

  clearTimeout(box._timer);

  box._timer = setTimeout(
    () => box.classList.add("hidden"),
    3200
  );
}


function notify(text) {
  const box = $("#notificacoes");

  if (!box) return;

  const div = document.createElement("div");

  div.className = "notification";
  div.textContent = text;

  box.prepend(div);
}


/* ============================================================
   COMPONENTES
   ============================================================ */

function parseComponents(text) {
  return String(text || "")
    .split(/,|;|\n/)
    .map(x => x.trim())
    .filter(Boolean)
    .slice(0, 20);
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

  return demoGet(
    `room:${roomCode}`,
    null
  );
}


async function saveCompany() {
  if (
    !roomCode ||
    !companyId ||
    !company
  ) {
    return;
  }

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
    room =
      demoGet(
        `room:${roomCode}`,
        room
      ) || {};

    room.companies =
      room.companies || {};

    room.companies[companyId] =
      company;

    demoSet(
      `room:${roomCode}`,
      room
    );
  }
}


async function saveWholeRoom(nextRoom) {
  const f = await getFirebase();

  if (f) {
    await f.set(
      f.ref(
        f.db,
        `rooms/${roomCode}`
      ),
      nextRoom
    );
  } else {
    demoSet(
      `room:${roomCode}`,
      nextRoom
    );
  }

  room = nextRoom;

  if (companyId) {
    company =
      room?.companies?.[companyId] ||
      company;
  }
}


async function listen() {
  const f = await getFirebase();

  if (f) {
    f.onValue(
      f.ref(
        f.db,
        `rooms/${roomCode}`
      ),
      snapshot => {
        room =
          snapshot.val() ||
          room;

        company =
          room?.companies?.[companyId] ||
          company;

        onRoomChange();
      }
    );
  } else {
    setInterval(() => {
      room =
        demoGet(
          `room:${roomCode}`,
          room
        ) || room;

      company =
        room?.companies?.[companyId] ||
        company;

      onRoomChange();
    }, 900);
  }
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
      c =>
        normalizeName(c?.name) ===
        target
    ) || null
  );
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
      c =>
        normalizeName(c?.name) ===
        target
    ) || null
  );
}


/* ============================================================
   SENHA
   ============================================================ */

function ensureCompanyPasswordField() {
  if ($("#senhaEmpresa")) return;

  const entrar = $("#entrar");

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
      minlength="4"
      maxlength="30"
      autocomplete="current-password"
      placeholder="Crie ou digite a senha da empresa"
    >

    <p class="muted">
      A senha identifica a empresa. Toda entrada ainda dependerá
      da autorização do professor.
    </p>
  `;

  entrar.parentNode.insertBefore(
    wrapper,
    entrar
  );
}


/* ============================================================
   AUTORIZAÇÃO — REGRA PRINCIPAL
   ============================================================ */

function accessRequestKey(
  id = companyId,
  source = "empresa"
) {
  return source === "mobile"
    ? `${id}__mobile`
    : id;
}


async function createAccessRequest({
  source = "empresa",
  firstAccess = false,
  enteredPassword = "",
  passwordMismatch = false
} = {}) {

  const latest =
    await getRoom();

  if (!latest) {
    toast(
      "Não foi possível localizar a sala."
    );
    return false;
  }

  latest.accessRequests =
    latest.accessRequests || {};

  const key =
    accessRequestKey(
      companyId,
      source
    );

  currentRequestKey = key;

  latest.accessRequests[key] = {
    requestKey: key,

    companyId,

    companyName:
      company.name,

    components:
      getComponentsText(company),

    segment:
      company.segment || "",

    source,

    firstAccess,

    requestedAt:
      now(),

    round:
      Number(
        latest.round || 0
      ),

    status:
      "pending",

    passwordMismatch,

    /*
      Só é utilizado pelo professor caso ele aprove
      uma redefinição de senha.
    */
    requestedPassword:
      passwordMismatch
        ? enteredPassword
        : null
  };

  await saveWholeRoom(latest);

  showAuthorizationWaiting(
    source
  );

  return true;
}


function showAuthorizationWaiting(
  source = "empresa"
) {
  $("#entrada")
    ?.classList.add("hidden");

  $("#jogo")
    ?.classList.add("hidden");

  $("#bloqueioAutorizacao")
    ?.classList.remove("hidden");

  if ($("#empresaAguardando")) {
    $("#empresaAguardando").textContent =
      company?.name || "—";
  }

  const card =
    $(".authorization-card");

  if (card) {
    const p =
      card.querySelector("p");

    if (p) {
      p.textContent =
        source === "mobile"
          ? "O acesso da Central Estratégica Mobile está aguardando autorização do professor."
          : "Sua empresa está cadastrada. Aguarde o professor autorizar esta entrada na Arena.";
    }
  }

  if ($("#statusAutorizacao")) {
    $("#statusAutorizacao").textContent =
      "⏳ Aguardando autorização do professor";
  }
}


function showDenied() {
  showAuthorizationWaiting();

  const card =
    $(".authorization-card");

  if (card) {
    const p =
      card.querySelector("p");

    if (p) {
      p.textContent =
        "❌ O professor não autorizou esta entrada. Aguarde novas orientações.";
    }
  }

  if ($("#statusAutorizacao")) {
    $("#statusAutorizacao").textContent =
      "❌ Entrada não autorizada";
  }
}


function showPaused() {
  $("#entrada")
    ?.classList.add("hidden");

  $("#jogo")
    ?.classList.add("hidden");

  $("#bloqueioAutorizacao")
    ?.classList.remove("hidden");

  if ($("#empresaAguardando")) {
    $("#empresaAguardando").textContent =
      company?.name || "—";
  }

  const card =
    $(".authorization-card");

  if (card) {
    const p =
      card.querySelector("p");

    if (p) {
      p.textContent =
        "⏸ A Arena foi pausada pelo professor. Para entrar novamente será necessária uma nova autorização.";
    }
  }
}


function openAuthorizedSession() {
  $("#bloqueioAutorizacao")
    ?.classList.add("hidden");

  $("#entrada")
    ?.classList.add("hidden");

  $("#jogo")
    ?.classList.remove("hidden");

  if ($("#statusAutorizacao")) {
    $("#statusAutorizacao").textContent =
      "✅ Entrada autorizada pelo professor";
  }

  render();
}


function checkAccessAuthorization() {
  if (
    !room ||
    !company ||
    !companyId
  ) {
    return false;
  }

  /*
    PAUSA encerra o direito de acesso atual.
  */
  if (
    room.status === "Pausado"
  ) {
    showPaused();
    return false;
  }

  const key =
    currentRequestKey ||
    accessRequestKey(
      companyId,
      mobileMode
        ? "mobile"
        : "empresa"
    );

  const request =
    room?.accessRequests?.[key];

  if (!request) {
    showAuthorizationWaiting(
      mobileMode
        ? "mobile"
        : "empresa"
    );

    return false;
  }

  if (
    request.status === "approved"
  ) {
    openAuthorizedSession();
    return true;
  }

  if (
    request.status === "denied"
  ) {
    showDenied();
    return false;
  }

  showAuthorizationWaiting(
    request.source || "empresa"
  );

  return false;
}


/* ============================================================
   ENTRAR NA ARENA
   TODA ENTRADA = SOLICITAÇÃO
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
      "Informe código da sala, nome da empresa e senha."
    );

    return;
  }

  if (
    password.length < 4
  ) {
    toast(
      "A senha deve possuir pelo menos 4 caracteres."
    );

    return;
  }

  room =
    await getRoom();

  if (!room) {
    toast(
      "Sala não encontrada. Confira o código informado."
    );

    return;
  }

  const existing =
    findExistingCompany(name);


  /* ----------------------------------------------------------
     EMPRESA JÁ EXISTENTE
     ---------------------------------------------------------- */
  if (existing) {
    companyId =
      existing.id;

    company =
      existing;

    company.eventResponses =
      company.eventResponses || {};

    /*
      Componentes já cadastrados são preservados.
      Só completa caso o registro antigo esteja vazio.
    */
    if (
      components.length &&
      !getComponentsText(company)
    ) {
      company.components =
        components;
    }

    const savedPassword =
      String(
        company.accessPassword || ""
      );

    const mismatch =
      Boolean(
        savedPassword &&
        savedPassword !== password
      );

    /*
      IMPORTANTE:
      Senha divergente NÃO abre a Arena.
      Também NÃO impede a solicitação.

      O professor verá o alerta e decidirá.
      Se autorizar, o professor.js poderá
      redefinir a senha para a digitada.
    */

    await saveCompany();

    await listen();

    await createAccessRequest({
      source: "empresa",
      firstAccess: false,
      enteredPassword: password,
      passwordMismatch: mismatch
    });

    toast(
      mismatch
        ? "🔐 Solicitação enviada. O professor deverá confirmar também a divergência da senha."
        : "🔒 Solicitação de entrada enviada ao professor."
    );

    return;
  }


  /* ----------------------------------------------------------
     PRIMEIRO CADASTRO
     TAMBÉM NÃO ENTRA DIRETAMENTE
     ---------------------------------------------------------- */

  if (!components.length) {
    toast(
      "Informe os componentes da empresa."
    );

    return;
  }

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
        room?.currentEvent?.nonce ||
        createdAt
      ),

    firstApprovalPending:
      true
  };

  await saveCompany();

  /*
    PRIMEIRO ACESSO também gera solicitação.
  */
  await listen();

  await createAccessRequest({
    source: "empresa",
    firstAccess: true,
    enteredPassword: password,
    passwordMismatch: false
  });

  toast(
    "🔒 Empresa cadastrada. Aguarde a autorização do professor para entrar."
  );
}


/* ============================================================
   ALTERAÇÕES EM TEMPO REAL
   ============================================================ */

function onRoomChange() {
  if (!room) return;

  const authorized =
    checkAccessAuthorization();

  /*
    Nada da Arena é processado antes da autorização.
  */
  if (!authorized) {
    closeEventModal();
    return;
  }

  render();

  const currentEvent =
    room?.currentEvent;

  if (!currentEvent?.nonce) {
    lastEventNonce = null;
    closeEventModal();
  } else {
    const key =
      String(currentEvent.nonce);

    if (
      eventResponse(key) ||
      !shouldReceiveCurrentEvent(
        currentEvent
      )
    ) {
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
    $("#eventoOpcoes").innerHTML =
      "";
  }
}


function shouldReceiveCurrentEvent(
  currentEvent
) {
  if (!currentEvent?.nonce) {
    return false;
  }

  const nonce =
    Number(
      currentEvent.nonce || 0
    );

  const joined =
    Number(
      company?.joinedAt || 0
    );

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
    joined &&
    nonce < joined
  ) {
    return false;
  }

  return true;
}


function showEvent(
  id,
  nonce
) {
  const ev =
    events[id];

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

  $("#modalEvento")
    .classList.remove("hidden");

  document
    .querySelectorAll("[data-o]")
    .forEach(button => {
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
                button.dataset.o
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
                Number(
                  value || 0
                );
            }
          );

          company.eventResponses =
            company.eventResponses || {};

          company.eventResponses[key] = {
            eventId: id,
            eventTitle: ev.title,
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

          notify(
            `✅ Evento resolvido: ${ev.title}`
          );

          render();
        };
    });
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
    "SIM",

  "quiz-nao":
    "NÃO",

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

      <label>🏢 Estrutura</label>
      <input id="invEstrutura" type="number" min="0" step="1000" value="${saved.estrutura || 0}">

      <label>👥 Pessoas</label>
      <input id="invPessoas" type="number" min="0" step="1000" value="${saved.pessoas || 0}">

      <label>📣 Marketing</label>
      <input id="invMarketing" type="number" min="0" step="1000" value="${saved.marketing || 0}">

      <label>💻 Tecnologia</label>
      <input id="invTecnologia" type="number" min="0" step="1000" value="${saved.tecnologia || 0}">

      <label>📦 Estoque</label>
      <input id="invEstoque" type="number" min="0" step="1000" value="${saved.estoque || 0}">

      <label>🛟 Reserva</label>
      <input id="invReserva" type="number" min="0" step="
