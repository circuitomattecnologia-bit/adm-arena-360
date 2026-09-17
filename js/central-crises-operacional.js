/* ============================================================
   ADM ARENA 360
   CENTRAL OPERACIONAL — CRISES, EVENTOS E INTERFERÊNCIAS
   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   CAMADA ADITIVA E SEGURA
   ------------------------------------------------------------
   • Não altera cronômetro.
   • Não altera rodada automaticamente.
   • Não altera empresas diretamente.
   • Não apaga dados.
   • Não altera caixa, XP, clientes ou reputação diretamente.
   • Não substitui os eventos oficiais existentes.
   • Reutiliza o sistema oficial de eventos do professor.js.
   • Mantém a regra original de 1 uso por evento/Arena.
   ============================================================ */

const ADM360_OPERATIONAL_EVENTS = [

  {
    id: "fornecedor",
    name: "Fornecedor +18%",
    category: "CUSTOS",
    window: "R5–R9"
  },

  {
    id: "viral",
    name: "Reclamação viral",
    category: "REPUTAÇÃO",
    window: "R7–R14"
  },

  {
    id: "equipe",
    name: "Equipe insatisfeita",
    category: "PESSOAS",
    window: "R8–R15"
  },

  {
    id: "boom",
    name: "Boom de vendas",
    category: "OPORTUNIDADE",
    window: "R10–R19"
  },

  {
    id: "logistica",
    name: "Crise logística",
    category: "OPERAÇÃO",
    window: "R7–R16"
  },

  {
    id: "credito",
    name: "Crédito liberado",
    category: "FINANÇAS",
    window: "R6–R19"
  }

];


startOperationalCenter();


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

function startOperationalCenter() {

  if (
    document.body.dataset.adm360Operational ===
    "ready"
  ) {
    return;
  }

  document.body.dataset.adm360Operational =
    "ready";

  installOperationalStyles();

  createOperationalCenter();

  setInterval(
    renderOperationalCenter,
    700
  );

}


/* ============================================================
   ESTILOS
   ============================================================ */

function installOperationalStyles() {

  if (
    document.getElementById(
      "adm360OperationalStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "adm360OperationalStyles";

  style.textContent = `

    #adm360OperationalConsole {

      margin-top: 20px;
      padding: 20px;

      border:
        1px solid
        rgba(255,255,255,.12);

      border-radius: 22px;

      background:
        linear-gradient(
          145deg,
          rgba(7,18,39,.94),
          rgba(17,24,52,.90)
        );

      box-shadow:
        0 18px 45px
        rgba(0,0,0,.20);

    }


    .adm360-op-header {

      display: flex;

      justify-content:
        space-between;

      align-items: center;

      gap: 16px;

      margin-bottom: 18px;

    }


    .adm360-op-eyebrow {

      font-size: .67rem;

      font-weight: 900;

      letter-spacing: .13em;

      opacity: .62;

    }


    .adm360-op-header h3 {

      margin:
        5px 0 4px;

      font-size:
        1.08rem;

    }


    .adm360-op-header p {

      margin: 0;

      max-width: 720px;

      font-size: .78rem;

      line-height: 1.45;

      opacity: .68;

    }


    .adm360-op-round {

      padding:
        10px 14px;

      border-radius:
        14px;

      background:
        rgba(46,134,255,.13);

      border:
        1px solid
        rgba(95,170,255,.30);

      font-weight: 900;

      white-space:
        nowrap;

    }


    .adm360-op-status {

      display: grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0,1fr)
        );

      gap: 10px;

      margin-bottom:
        16px;

    }


    .adm360-op-status-card {

      padding:
        11px 13px;

      border-radius:
        14px;

      background:
        rgba(255,255,255,.04);

      border:
        1px solid
        rgba(255,255,255,.08);

    }


    .adm360-op-status-card span {

      display: block;

      margin-bottom:
        4px;

      font-size:
        .62rem;

      font-weight:
        900;

      letter-spacing:
        .06em;

      opacity:
        .58;

    }


    .adm360-op-status-card strong {

      font-size:
        .82rem;

    }


    .adm360-op-grid {

      display: grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0,1fr)
        );

      gap: 11px;

    }


    .adm360-op-item {

      position: relative;

      overflow: hidden;

      padding:
        14px;

      border-radius:
        16px;

      border:
        1px solid
        rgba(255,255,255,.09);

      background:
        rgba(255,255,255,.035);

      transition:
        transform .18s ease,
        border-color .18s ease,
        background .18s ease;

    }


    .adm360-op-item:hover {

      transform:
        translateY(-2px);

      border-color:
        rgba(90,166,255,.32);

      background:
        rgba(255,255,255,.055);

    }


    .adm360-op-item.used {

      opacity:
        .55;

    }


    .adm360-op-item.used:hover {

      transform:
        none;

    }


    .adm360-op-meta {

      display: flex;

      justify-content:
        space-between;

      gap: 8px;

      font-size:
        .61rem;

      font-weight:
        900;

      letter-spacing:
        .04em;

      opacity:
        .64;

    }


    .adm360-op-item strong {

      display: block;

      margin:
        8px 0 11px;

      font-size:
        .87rem;

    }


    .adm360-op-action {

      width: 100%;

      padding:
        10px 11px;

      border-radius:
        11px;

      border:
        1px solid
        rgba(95,170,255,.30);

      background:
        rgba(46,134,255,.16);

      color:
        inherit;

      font-weight:
        900;

      font-size:
        .69rem;

      letter-spacing:
        .025em;

      cursor:
        pointer;

      transition:
        background .18s ease,
        border-color .18s ease,
        transform .18s ease;

    }


    .adm360-op-action:hover:not(:disabled) {

      background:
        rgba(46,134,255,.26);

      border-color:
        rgba(95,170,255,.52);

    }


    .adm360-op-action:active:not(:disabled) {

      transform:
        scale(.985);

    }


    .adm360-op-action:disabled {

      cursor:
        not-allowed;

      opacity:
        .64;

    }


    .adm360-op-note {

      margin-top:
        14px;

      padding-top:
        12px;

      border-top:
        1px solid
        rgba(255,255,255,.08);

      font-size:
        .70rem;

      line-height:
        1.45;

      opacity:
        .60;

    }


    @media (
      max-width: 900px
    ) {

      .adm360-op-grid {

        grid-template-columns:
          repeat(
            2,
            minmax(0,1fr)
          );

      }

    }


    @media (
      max-width: 650px
    ) {

      .adm360-op-header {

        flex-direction:
          column;

        align-items:
          flex-start;

      }


      .adm360-op-status {

        grid-template-columns:
          1fr;

      }


      .adm360-op-grid {

        grid-template-columns:
          1fr;

      }

    }

  `;

  document.head.appendChild(
    style
  );

}


/* ============================================================
   CRIAÇÃO DA CENTRAL
   ============================================================ */

function createOperationalCenter() {

  if (
    document.getElementById(
      "adm360OperationalConsole"
    )
  ) {
    return;
  }


  const crisisCenter =
    document.getElementById(
      "adm360CrisisCenter"
    );


  /*
    A Central Estratégica é criada
    dinamicamente por outro módulo.

    Se ainda não estiver pronta,
    aguardamos sem interferir.
  */

  if (!crisisCenter) {

    setTimeout(
      createOperationalCenter,
      400
    );

    return;

  }


  const section =
    document.createElement(
      "section"
    );


  section.id =
    "adm360OperationalConsole";


  section.innerHTML = `

    <div
      class="adm360-op-header"
    >

      <div>

        <div
          class="adm360-op-eyebrow"
        >
          CONTROLE OPERACIONAL
        </div>

        <h3>
          Eventos e Interferências
        </h3>

        <p>
          Acionamento controlado pelo professor
          utilizando os eventos oficiais da Arena.
          Nenhuma interferência é executada
          automaticamente.
        </p>

      </div>


      <div
        class="adm360-op-round"
        id="adm360OpRound"
      >
        R0/20
      </div>

    </div>


    <div
      class="adm360-op-status"
    >

      <div
        class="adm360-op-status-card"
      >

        <span>
          SITUAÇÃO
        </span>

        <strong
          id="adm360OpSituation"
        >
          Aguardando Arena
        </strong>

      </div>


      <div
        class="adm360-op-status-card"
      >

        <span>
          EVENTOS DISPONÍVEIS
        </span>

        <strong
          id="adm360OpAvailable"
        >
          6
        </strong>

      </div>


      <div
        class="adm360-op-status-card"
      >

        <span>
          EVENTOS UTILIZADOS
        </span>

        <strong
          id="adm360OpUsed"
        >
          0
        </strong>

      </div>

    </div>


    <div
      class="adm360-op-grid"
      id="adm360OpGrid"
    >
    </div>


    <div
      class="adm360-op-note"
    >
      Os controles desta Central acionam
      exclusivamente os eventos oficiais já
      existentes no sistema. A regra original
      de um uso por evento em cada Arena
      permanece preservada.
    </div>

  `;


  crisisCenter.appendChild(
    section
  );


  renderOperationalCenter();

}


/* ============================================================
   RODADA ATUAL
   ============================================================ */

function getOperationalRound() {

  const text =
    String(
      document.querySelector(
        "#rodada"
      )?.textContent || ""
    );


  const match =
    text.match(/\d+/);


  if (!match) {
    return 0;
  }


  return Math.max(
    0,
    Math.min(
      20,
      Number(
        match[0]
      ) || 0
    )
  );

}


/* ============================================================
   SITUAÇÃO ATUAL
   ============================================================ */

function getOperationalSituation(
  round
) {

  if (round < 1) {
    return "Aguardando início";
  }

  if (round <= 5) {
    return "Formação e mercado";
  }

  if (round <= 10) {
    return "Pressão operacional";
  }

  if (round <= 15) {
    return "Gestão estratégica";
  }

  if (round <= 19) {
    return "Alta pressão";
  }

  return "Conselho Final";

}


/* ============================================================
   VERIFICA EVENTO ORIGINAL
   ============================================================ */

function getOriginalEventButton(
  eventId
) {

  return document.querySelector(
    `.event[data-event="${eventId}"]`
  );

}


/* ============================================================
   VERIFICA EVENTO UTILIZADO
   ============================================================ */

function isOperationalEventUsed(
  eventId
) {

  const original =
    getOriginalEventButton(
      eventId
    );


  if (!original) {
    return false;
  }


  return Boolean(

    original.disabled ||

    original.classList.contains(
      "event-used"
    )

  );

}


/* ============================================================
   ACIONAR EVENTO
   ============================================================ */

function activateOperationalEvent(
  eventId
) {

  const original =
    getOriginalEventButton(
      eventId
    );


  /*
    Segurança:
    nunca criamos uma segunda
    implementação do evento.

    Apenas acionamos o botão oficial
    já conectado ao professor.js.
  */

  if (!original) {

    console.warn(
      `ADM Arena 360: evento ${eventId} não localizado.`
    );

    return;

  }


  if (original.disabled) {
    return;
  }


  original.click();


  setTimeout(
    renderOperationalCenter,
    250
  );

}


/* ============================================================
   RENDERIZAÇÃO
   ============================================================ */

function renderOperationalCenter() {

  const grid =
    document.getElementById(
      "adm360OpGrid"
    );


  if (!grid) {

    createOperationalCenter();

    return;

  }


  const round =
    getOperationalRound();


  const roundBox =
    document.getElementById(
      "adm360OpRound"
    );


  if (roundBox) {

    roundBox.textContent =
      `R${round}/20`;

  }


  const situation =
    document.getElementById(
      "adm360OpSituation"
    );


  if (situation) {

    situation.textContent =
      getOperationalSituation(
        round
      );

  }


  let usedCount =
    0;


  grid.innerHTML =
    ADM360_OPERATIONAL_EVENTS
      .map(event => {

        const used =
          isOperationalEventUsed(
            event.id
          );


        if (used) {
          usedCount++;
        }


        return `

          <article
            class="
              adm360-op-item
              ${used ? "used" : ""}
            "
          >

            <div
              class="adm360-op-meta"
            >

              <span>
                ${event.category}
              </span>

              <span>
                ${event.window}
              </span>

            </div>


            <strong>
              ${event.name}
            </strong>


            <button
              type="button"

              class="
                adm360-op-action
              "

              data-operational-event="
                ${event.id}
              "

              ${used ? "disabled" : ""}
            >

              ${
                used
                  ? "EVENTO JÁ UTILIZADO"
                  : "ACIONAR EVENTO"
              }

            </button>

          </article>

        `;

      })
      .join("");


  const available =
    ADM360_OPERATIONAL_EVENTS.length -
    usedCount;


  const availableBox =
    document.getElementById(
      "adm360OpAvailable"
    );


  if (availableBox) {

    availableBox.textContent =
      String(
        available
      );

  }


  const usedBox =
    document.getElementById(
      "adm360OpUsed"
    );


  if (usedBox) {

    usedBox.textContent =
      String(
        usedCount
      );

  }


  grid
    .querySelectorAll(
      "[data-operational-event]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          activateOperationalEvent(
            button.dataset
              .operationalEvent
          );

        }
      );

    });

}


/* ============================================================
   FIM
   ============================================================ */

console.log(
  "ADM Arena 360 — Central Operacional carregada."
);
