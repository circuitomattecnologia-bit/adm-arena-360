import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 17
   GUERRA COMERCIAL
   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   REGRAS
   - Só funciona na Rodada 17.
   - Não avança rodada.
   - Não altera o status da Arena.
   - Não modifica rodadas anteriores.
   - Uma decisão por empresa.
   - Sem resultados aleatórios.
========================================================= */

const ROUND = 17;

const PAGE = String(window.location.pathname || "")
  .split("/")
  .pop()
  .toLowerCase();

if (PAGE === "empresa.html") start();

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function detectRoomCode() {
  const url = new URL(window.location.href);

  const candidates = [
    url.searchParams.get("sala"),
    url.searchParams.get("room"),
    url.searchParams.get("codigo"),
    document.querySelector("#codigo")?.value,
    document.querySelector("#salaPill")?.textContent,
    localStorage.getItem("adm360:openingRoomCode"),
    localStorage.getItem("admArena360Room"),
    localStorage.getItem("admArenaRoom"),
    localStorage.getItem("admArenaRoomCode")
  ];

  for (const value of candidates) {
    const match = String(value || "")
      .toUpperCase()
      .match(/\bADM-\d{4}\b/);

    if (match && match[0] !== "ADM-0000") {
      return match[0];
    }
  }

  return "";
}

function getVisibleCompany(room) {
  const visibleName = normalizeName(
    document.querySelector("#empresaNome")?.textContent ||
    document.querySelector("#nomeEmpresa")?.value
  );

  if (!visibleName) return null;

  const found = Object.entries(room?.companies || {})
    .find(([, company]) =>
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
    Math.min(max, Number(value || 0))
  );
}

const ACTIONS = {
  fidelizar: {
    title: "Defender e fidelizar clientes",
    caixa: -5000,
    clientes: 7,
    reputacao: 5,
    equipe: 2,
    inovacao: 1,
    xp: 10,
    text:
      "A empresa protegeu sua base de clientes e fortaleceu a confiança no mercado."
  },

  diferenciar: {
    title: "Diferenciar produto e atendimento",
    caixa: -8000,
    clientes: 5,
    reputacao: 6,
    equipe: 1,
    inovacao: 7,
    xp: 13,
    text:
      "A empresa evitou competir apenas por preço e criou diferenciação percebida pelo mercado."
  },

  ofensiva: {
    title: "Lançar ofensiva comercial",
    caixa: -12000,
    clientes: 10,
    reputacao: 2,
    equipe: -2,
    inovacao: 3,
    xp: 15,
    text:
      "A empresa acelerou a disputa por mercado, conquistando clientes com maior pressão sobre caixa e equipe."
  }
};

function injectInterface() {
  if (document.querySelector("#adm360R17")) return;

  const host = document.querySelector("#decisaoArea");

  if (!host) return;

  const box = document.createElement("section");

  box.id = "adm360R17";

  box.style.cssText = `
    margin-top:16px;
    padding:20px;
    border:1px solid #365a91;
    border-radius:16px;
    background:#07162e;
    color:white;
  `;

  box.innerHTML = `
    <div style="
      font-size:.78rem;
      font-weight:900;
      letter-spacing:.08em;
      color:#8bbcff;
      margin-bottom:6px;
    ">
      ADM ARENA 360
    </div>

    <h2 style="margin:0 0 10px;">
      RODADA 17 — GUERRA COMERCIAL
    </h2>

    <p style="line-height:1.55;">
      Um concorrente iniciou uma disputa agressiva por clientes.
      Sua empresa precisa responder sem perder equilíbrio financeiro.
    </p>

    <div style="
      margin:15px 0;
      padding:14px;
      border-radius:12px;
      background:rgba(255,255,255,.05);
    ">
      <strong>O QUE VOCÊ PRECISA OBSERVAR</strong>

      <p style="margin-bottom:0;line-height:1.5;">
        Compare caixa, clientes, reputação, equipe e inovação.
        Preço não é a única forma de competir.
      </p>
    </div>

    <div style="
      margin:15px 0;
      padding:14px;
      border-radius:12px;
      background:rgba(80,170,255,.08);
      border:1px solid rgba(80,170,255,.20);
    ">
      <strong>DICA ESTRATÉGICA</strong>

      <p style="margin-bottom:0;line-height:1.5;">
        Uma empresa pode ganhar clientes baixando preços,
        mas diferenciação, atendimento e reputação podem
        produzir resultados mais sustentáveis.
      </p>
    </div>

    <h3>ESCOLHA A ESTRATÉGIA</h3>

    <div id="r17Options">
      ${Object.entries(ACTIONS).map(([id, action]) => `
        <button
          type="button"
          data-r17="${id}"
          style="
            display:block;
            width:100%;
            margin:9px 0;
            padding:14px;
            border:1px solid rgba(255,255,255,.16);
            border-radius:11px;
            background:rgba(255,255,255,.04);
            color:white;
            text-align:left;
            cursor:pointer;
          "
        >
          <strong style="font-size:.96rem;">
            ${action.title}
          </strong>
        </button>
      `).join("")}
    </div>

    <div
      id="r17Selected"
      style="
        margin-top:12px;
        padding:12px;
        border-radius:10px;
        background:rgba(255,255,255,.04);
      "
    >
      Escolha uma das três estratégias.
    </div>

    <button
      type="button"
      id="r17Confirm"
      disabled
      style="
        width:100%;
        margin-top:14px;
        padding:14px;
        border:0;
        border-radius:11px;
        font-weight:900;
        cursor:pointer;
      "
    >
      CONFIRMAR DECISÃO
    </button>
  `;

  host.appendChild(box);

  let selectedAction = "";

  box.addEventListener("click", async event => {
    const option =
      event.target.closest("[data-r17]");

    if (option) {
      selectedAction =
        option.dataset.r17;

      box
        .querySelectorAll("[data-r17]")
        .forEach(button => {
          button.style.borderColor =
            "rgba(255,255,255,.16)";

          button.style.background =
            "rgba(255,255,255,.04)";
        });

      option.style.borderColor =
        "#47dc9a";

      option.style.background =
        "rgba(71,220,154,.10)";

      box.querySelector(
        "#r17Selected"
      ).innerHTML = `
        <strong>${ACTIONS[selectedAction].title}</strong>
        <br>
        ${ACTIONS[selectedAction].text}
      `;

      box.querySelector(
        "#r17Confirm"
      ).disabled = false;

      return;
    }

    if (
      event.target.closest("#r17Confirm") &&
      selectedAction
    ) {
      await confirmDecision(
        selectedAction,
        box
      );
    }
  });
}

async function confirmDecision(
  actionId,
  box
) {
  const button =
    box.querySelector("#r17Confirm");

  if (!button || button.disabled) return;

  button.disabled = true;
  button.textContent =
    "REGISTRANDO DECISÃO...";

  try {
    const f = await getFirebase();

    const roomCode =
      detectRoomCode();

    if (!roomCode) {
      throw new Error(
        "Código da Arena não identificado."
      );
    }

    const snapshot =
      await f.get(
        f.ref(
          f.db,
          `rooms/${roomCode}`
        )
      );

    const room =
      snapshot.val();

    if (
      !room ||
      Number(room.round || 0) !== ROUND
    ) {
      throw new Error(
        "A Arena não está na Rodada 17."
      );
    }

    if (room.status === "Pausado") {
      throw new Error(
        "A Arena está pausada."
      );
    }

    const visible =
      getVisibleCompany(room);

    if (!visible) {
      throw new Error(
        "Empresa não identificada."
      );
    }

    if (
      visible.company?.round17?.decision
    ) {
      throw new Error(
        "A decisão da Rodada 17 já foi registrada."
      );
    }

    const action =
      ACTIONS[actionId];

    if (!action) {
      throw new Error(
        "Estratégia inválida."
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

    company.round17 = {
      decision: {
        action: actionId,
        title: action.title,

        effects: {
          caixa: action.caixa,
          clientes: action.clientes,
          reputacao: action.reputacao,
          equipe: action.equipe,
          inovacao: action.inovacao,
          xp: action.xp
        },

        consequence:
          action.text,

        decidedAt:
          Date.now()
      }
    };

    await f.set(
      f.ref(
        f.db,
        `rooms/${roomCode}/companies/${visible.id}`
      ),
      company
    );

    box.innerHTML = `
      <h2 style="margin-top:0;">
        RODADA 17 — DECISÃO REGISTRADA
      </h2>

      <p>
        <strong>${action.title}</strong>
      </p>

      <p style="line-height:1.55;">
        ${action.text}
      </p>

      <div style="
        margin-top:14px;
        padding:13px;
        border-radius:11px;
        background:rgba(71,220,154,.09);
        border:1px solid rgba(71,220,154,.28);
      ">
        Caixa:
        ${action.caixa >= 0 ? "+" : ""}
        ADM$ ${action.caixa.toLocaleString("pt-BR")}
        <br>

        Clientes:
        ${action.clientes >= 0 ? "+" : ""}
        ${action.clientes}
        <br>

        Reputação:
        ${action.reputacao >= 0 ? "+" : ""}
        ${action.reputacao}
        <br>

        Equipe:
        ${action.equipe >= 0 ? "+" : ""}
        ${action.equipe}
        <br>

        Inovação:
        ${action.inovacao >= 0 ? "+" : ""}
        ${action.inovacao}
        <br>

        XP:
        +${action.xp}
      </div>
    `;

  } catch (error) {
    alert(
      error?.message ||
      "Não foi possível registrar a decisão."
    );

    button.disabled = false;
    button.textContent =
      "CONFIRMAR DECISÃO";
  }
}

async function start() {
  setInterval(
    async () => {
      try {
        const roomCode =
          detectRoomCode();

        if (!roomCode) return;

        const f =
          await getFirebase();

        const snapshot =
          await f.get(
            f.ref(
              f.db,
              `rooms/${roomCode}`
            )
          );

        const room =
          snapshot.val();

        if (
          Number(room?.round || 0) === ROUND
        ) {
          injectInterface();
        } else {
          document
            .querySelector("#adm360R17")
            ?.remove();
        }

      } catch (error) {
        console.error(
          "ADM Arena 360 — R17:",
          error
        );
      }
    },
    1000
  );
}
