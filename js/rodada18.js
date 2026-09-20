import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 18
   CRISE 360°
   PROJETO EMPREENDEDOR — PROF. LEOPOLDO
========================================================= */

const ROUND = 18;

const PAGE = String(window.location.pathname || "")
  .split("/")
  .pop()
  .toLowerCase();

let roomCode = "";
let roomData = null;
let selectedAction = "";

/* =========================================================
   UTILIDADES
========================================================= */

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function detectRoomCode() {
  const directCode =
    window.__ADM360_ROUND_CONTEXT__?.roomCode;

  const candidates = [
    directCode,
    new URL(window.location.href).searchParams.get("sala"),
    new URL(window.location.href).searchParams.get("room"),
    new URL(window.location.href).searchParams.get("codigo"),
    document.querySelector("#codigo")?.value,
    document.querySelector("#salaPill")?.textContent,
    localStorage.getItem("adm360:openingRoomCode"),
    localStorage.getItem("admArena360Room"),
    localStorage.getItem("admArenaRoom"),
    localStorage.getItem("admArenaRoomCode")
  ];

  for (const value of candidates) {
    const match =
      String(value || "")
        .toUpperCase()
        .match(/\bADM-\d{4}\b/);

    if (
      match &&
      match[0] !== "ADM-0000"
    ) {
      return match[0];
    }
  }

  return "";
}

function getVisibleCompany(room) {
  const directId =
    window.__ADM360_ROUND_CONTEXT__?.companyId;

  if (
    directId &&
    room?.companies?.[directId]
  ) {
    return {
      id: directId,
      company: room.companies[directId]
    };
  }

  const visibleName =
    normalizeName(
      document.querySelector("#empresaNome")?.textContent ||
      document.querySelector("#nomeEmpresa")?.value
    );

  if (!visibleName) return null;

  const found =
    Object.entries(room?.companies || {})
      .find(
        ([, company]) =>
          normalizeName(company?.name) === visibleName
      );

  if (!found) return null;

  return {
    id: found[0],
    company: found[1]
  };
}

function clamp(value, min = 0, max = 100) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value || 0)
    )
  );
}

function money(value) {
  return Number(value || 0)
    .toLocaleString("pt-BR");
}

/* =========================================================
   DECISÕES DA CRISE 360°
========================================================= */

const ACTIONS = {
  proteger: {
    title: "Proteger caixa e reorganizar a operação",
    description:
      "Reduz gastos emergenciais, reorganiza prioridades e protege a continuidade da empresa.",
    caixa: 4000,
    clientes: -3,
    reputacao: 1,
    equipe: 3,
    inovacao: 0,
    xp: 10,
    consequence:
      "A empresa atravessou a crise com maior segurança financeira. Houve pequena perda de clientes, mas a operação ficou mais protegida e organizada."
  },

  recuperar: {
    title: "Investir na recuperação de clientes e reputação",
    description:
      "A empresa reage à crise fortalecendo atendimento, relacionamento e confiança no mercado.",
    caixa: -8000,
    clientes: 7,
    reputacao: 8,
    equipe: 2,
    inovacao: 2,
    xp: 13,
    consequence:
      "A empresa assumiu um custo imediato, mas recuperou clientes e fortaleceu sua reputação diante da crise."
  },

  transformar: {
    title: "Transformar a crise em inovação",
    description:
      "A empresa reorganiza processos, cria soluções e busca novas formas de gerar valor.",
    caixa: -12000,
    clientes: 5,
    reputacao: 5,
    equipe: 4,
    inovacao: 10,
    xp: 16,
    consequence:
      "A empresa fez um investimento mais alto, mas saiu da crise mais inovadora, preparada e competitiva."
  }
};

/* =========================================================
   ESTILO
========================================================= */

function installStyle() {
  if (
    document.querySelector("#adm360R18Style")
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id = "adm360R18Style";

  style.textContent = `
    .adm360-r18 {
      display:grid;
      gap:14px;
    }

    .adm360-r18-badge {
      display:inline-block;
      width:max-content;
      padding:7px 11px;
      border-radius:999px;
      border:1px solid rgba(255,100,100,.42);
      background:rgba(255,80,80,.10);
      color:#ffb0b0;
      font-size:.76rem;
      font-weight:900;
      letter-spacing:.04em;
    }

    .adm360-r18-box {
      padding:16px;
      border-radius:14px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(255,255,255,.025);
    }

    .adm360-r18-box h3 {
      margin:0 0 8px;
      color:#fff;
    }

    .adm360-r18-box p {
      margin:0;
      color:rgba(255,255,255,.76);
      line-height:1.55;
    }

    .adm360-r18-indicators {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
      gap:8px;
      margin-top:12px;
    }

    .adm360-r18-indicator {
      padding:11px;
      border-radius:11px;
      background:rgba(255,255,255,.045);
      border:1px solid rgba(255,255,255,.08);
    }

    .adm360-r18-indicator span {
      display:block;
      color:rgba(255,255,255,.60);
      font-size:.72rem;
    }

    .adm360-r18-indicator strong {
      display:block;
      margin-top:3px;
      color:#fff;
    }

    .adm360-r18-tip {
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(255,209,102,.35);
      background:rgba(255,209,102,.08);
      color:#ffe6a7;
      line-height:1.5;
    }

    .adm360-r18-options {
      display:grid;
      gap:9px;
    }

    .adm360-r18-option {
      padding:14px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.03);
      cursor:pointer;
      transition:.15s ease;
    }

    .adm360-r18-option:hover {
      background:rgba(255,255,255,.06);
    }

    .adm360-r18-option.selected {
      border-color:#ff6b6b;
      background:rgba(255,107,107,.12);
    }

    .adm360-r18-option strong {
      display:block;
      color:#fff;
      margin-bottom:5px;
    }

    .adm360-r18-option span {
      color:rgba(255,255,255,.68);
      font-size:.80rem;
      line-height:1.45;
    }

    #adm360R18Confirm {
      width:100%;
      min-height:48px;
      border:0;
      border-radius:12px;
      font-weight:900;
      cursor:pointer;
      background:linear-gradient(135deg,#d94b4b,#ff7b54);
      color:#fff;
    }

    #adm360R18Confirm:disabled {
      opacity:.38;
      cursor:not-allowed;
    }

    .adm360-r18-result {
      padding:14px;
      border-radius:12px;
      border:1px solid rgba(71,220,154,.30);
      background:rgba(71,220,154,.08);
      color:#d9ffed;
      line-height:1.55;
    }
  `;

  document.head.appendChild(style);
}

/* =========================================================
   RENDER
========================================================= */

function render() {
  if (
    !roomData ||
    Number(roomData.round || 0) !== ROUND
  ) {
    return;
  }

  const area =
    document.querySelector("#decisaoArea");

  if (!area) return;

  const visible =
    getVisibleCompany(roomData);

  if (!visible) return;

  const company =
    visible.company;

  const decision =
    company?.round18?.decision;

  if (decision) {
    const effects =
      decision.effects || {};

    area.innerHTML = `
      <div class="adm360-r18">

        <span class="adm360-r18-badge">
          RODADA 18 DE 20 · CRISE 360°
        </span>

        <div class="adm360-r18-box">
          <h3>DECISÃO CONCLUÍDA</h3>

          <div class="adm360-r18-result">
            <strong>
              ${decision.title || ""}
            </strong>

            <br><br>

            ${decision.consequence || ""}

            <br><br>

            Caixa:
            ${Number(effects.caixa || 0) >= 0 ? "+" : ""}
            ADM$ ${money(effects.caixa)}

            <br>

            Clientes:
            ${Number(effects.clientes || 0) >= 0 ? "+" : ""}
            ${effects.clientes || 0}

            <br>

            Reputação:
            ${Number(effects.reputacao || 0) >= 0 ? "+" : ""}
            ${effects.reputacao || 0}

            <br>

            Equipe:
            ${Number(effects.equipe || 0) >= 0 ? "+" : ""}
            ${effects.equipe || 0}

            <br>

            Inovação:
            ${Number(effects.inovacao || 0) >= 0 ? "+" : ""}
            ${effects.inovacao || 0}

            <br>

            XP: +${effects.xp || 0}
          </div>
        </div>

      </div>
    `;

    return;
  }

  area.innerHTML = `
    <div class="adm360-r18">

      <span class="adm360-r18-badge">
        RODADA 18 DE 20 · CRISE 360°
      </span>

      <div class="adm360-r18-box">
        <h3>CRISE EM TODAS AS FRENTES</h3>

        <p>
          Sua empresa enfrenta simultaneamente pressão financeira,
          instabilidade no mercado, cobrança dos clientes e tensão
          interna. Agora será necessário decidir qual frente receberá
          prioridade para atravessar a crise.
        </p>

        <div class="adm360-r18-indicators">

          <div class="adm360-r18-indicator">
            <span>Caixa ADM$</span>
            <strong>${money(company.caixa)}</strong>
          </div>

          <div class="adm360-r18-indicator">
            <span>Clientes</span>
            <strong>${company.clientes || 0}</strong>
          </div>

          <div class="adm360-r18-indicator">
            <span>Reputação</span>
            <strong>${company.reputacao || 0}</strong>
          </div>

          <div class="adm360-r18-indicator">
            <span>Equipe</span>
            <strong>${company.equipe || 0}</strong>
          </div>

          <div class="adm360-r18-indicator">
            <span>Inovação</span>
            <strong>${company.inovacao || 0}</strong>
          </div>

        </div>
      </div>

      <div class="adm360-r18-tip">
        <strong>DICA ESTRATÉGICA:</strong>
        Em uma crise 360°, não existe solução sem consequência.
        Observe os indicadores da empresa e escolha qual risco
        você está disposto a assumir.
      </div>

      <div class="adm360-r18-options">

        ${Object.entries(ACTIONS)
          .map(
            ([id, action]) => `
              <div
                class="adm360-r18-option ${
                  selectedAction === id
                    ? "selected"
                    : ""
                }"
                data-r18-action="${id}"
              >
                <strong>
                  ${action.title}
                </strong>

                <span>
                  ${action.description}
                </span>
              </div>
            `
          )
          .join("")}

      </div>

      <button
        type="button"
        id="adm360R18Confirm"
        ${selectedAction ? "" : "disabled"}
      >
        CONFIRMAR ESTRATÉGIA
      </button>

    </div>
  `;
}

/* =========================================================
   CLIQUES
========================================================= */

function bindEvents() {
  document.addEventListener(
    "click",
    event => {
      const option =
        event.target.closest(
          "[data-r18-action]"
        );

      if (
        option &&
        Number(roomData?.round || 0) === ROUND
      ) {
        event.preventDefault();
        event.stopPropagation();

        selectedAction =
          option.dataset.r18Action || "";

        render();
        return;
      }

      const confirm =
        event.target.closest(
          "#adm360R18Confirm"
        );

      if (
        confirm &&
        selectedAction &&
        Number(roomData?.round || 0) === ROUND
      ) {
        event.preventDefault();
        event.stopPropagation();

        confirmDecision();
      }
    },
    true
  );
}

/* =========================================================
   CONFIRMAÇÃO
========================================================= */

async function confirmDecision() {
  if (!selectedAction) return;

  const action =
    ACTIONS[selectedAction];

  if (!action) return;

  const confirmed =
    window.confirm(
      `Confirmar a estratégia "${action.title}"?\n\nDepois de confirmada, a decisão da Rodada 18 será registrada.`
    );

  if (!confirmed) return;

  try {
    const f =
      await getFirebase();

    const code =
      roomCode ||
      detectRoomCode();

    if (!code) {
      throw new Error(
        "Código da Arena não identificado."
      );
    }

    const snapshot =
      await f.get(
        f.ref(
          f.db,
          `rooms/${code}`
        )
      );

    const currentRoom =
      snapshot.val();

    if (
      !currentRoom ||
      Number(currentRoom.round || 0) !== ROUND
    ) {
      throw new Error(
        "A Arena não está na Rodada 18."
      );
    }

    if (
      currentRoom.status === "Pausado"
    ) {
      throw new Error(
        "A Arena está pausada."
      );
    }

    const visible =
      getVisibleCompany(currentRoom);

    if (!visible) {
      throw new Error(
        "Empresa não identificada."
      );
    }

    if (
      visible.company?.round18?.decision
    ) {
      throw new Error(
        "A decisão da Rodada 18 já foi registrada."
      );
    }

    const company = {
      ...visible.company
    };

    const newCash =
      Number(company.caixa || 0) +
      action.caixa;

    if (newCash < 0) {
      throw new Error(
        "O caixa atual não permite executar esta estratégia. Escolha outra opção."
      );
    }

    company.caixa =
      newCash;

    company.clientes =
      Math.max(
        0,
        Number(company.clientes || 0) +
        action.clientes
      );

    company.reputacao =
      clamp(
        Number(company.reputacao || 0) +
        action.reputacao
      );

    company.equipe =
      clamp(
        Number(company.equipe || 0) +
        action.equipe
      );

    company.inovacao =
      clamp(
        Number(company.inovacao || 0) +
        action.inovacao
      );

    company.xp =
      Number(company.xp || 0) +
      action.xp;

    company.round18 = {
      decision: {
        action: selectedAction,
        title: action.title,
        consequence:
          action.consequence,

        effects: {
          caixa: action.caixa,
          clientes: action.clientes,
          reputacao: action.reputacao,
          equipe: action.equipe,
          inovacao: action.inovacao,
          xp: action.xp
        },

        decidedAt:
          Date.now()
      }
    };

    await f.set(
      f.ref(
        f.db,
        `rooms/${code}/companies/${visible.id}`
      ),
      company
    );

    selectedAction = "";

  } catch (error) {
    alert(
      error?.message ||
      "Não foi possível registrar a decisão da Rodada 18."
    );
  }
}

/* =========================================================
   FIREBASE
========================================================= */

async function connectRoom() {
  const code =
    detectRoomCode();

  if (!code) {
    console.error(
      "ADM Arena 360 — R18: sala não identificada."
    );
    return;
  }

  roomCode = code;

  const f =
    await getFirebase();

  const roomPath =
    f.ref(
      f.db,
      `rooms/${roomCode}`
    );

  try {
    const initialSnapshot =
      await f.get(roomPath);

    roomData =
      initialSnapshot.val() || {};

    if (
      Number(roomData.round || 0) === ROUND
    ) {
      render();
    }
  } catch (error) {
    console.error(
      "ADM Arena 360 — R18: erro na leitura inicial:",
      error
    );
  }

  f.onValue(
    roomPath,
    snapshot => {
      roomData =
        snapshot.val() || {};

      if (
        Number(roomData.round || 0) === ROUND
      ) {
        render();
      }
    }
  );
}

/* =========================================================
   INÍCIO
========================================================= */

async function start() {
  if (PAGE !== "empresa.html") {
    return;
  }

  installStyle();
  bindEvents();

  await connectRoom();
}

start().catch(
  error => {
    console.error(
      "ADM Arena 360 — Rodada 18:",
      error
    );
  }
);
