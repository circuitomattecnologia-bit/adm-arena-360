/* ============================================================
   ADM ARENA 360
   CENTRAL DE INTERFERÊNCIAS OPERACIONAIS
   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   MÓDULO ADITIVO E NÃO DESTRUTIVO
   ------------------------------------------------------------
   • Não altera rodada.
   • Não altera cronômetro.
   • Não altera caixa.
   • Não altera XP.
   • Não altera clientes.
   • Não altera reputação.
   • Não apaga empresas.
   • Não modifica decisões já registradas.
   • Registra interferências em área própria.
   • Permite direcionar para uma empresa ou todas.
   • Mantém histórico operacional.
   ============================================================ */

import {
  getFirebase
} from "./firebase-service.js";


const CENTRAL_CATEGORIES = [
  "Mercado",
  "Finanças",
  "Fornecedores",
  "Logística",
  "Pessoas",
  "Concorrência",
  "Reputação",
  "Inovação",
  "Expansão",
  "Oportunidade",
  "Crise",
  "Interferência do Professor"
];


startInterferenceCenter();


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

function startInterferenceCenter() {

  if (
    document.body.dataset
      .adm360InterferenceCenter ===
    "ready"
  ) {
    return;
  }

  document.body.dataset
    .adm360InterferenceCenter =
    "ready";

  installStyles();

  waitForOperationalCenter();

}


/* ============================================================
   AGUARDA CENTRAL PRINCIPAL
   ============================================================ */

function waitForOperationalCenter() {

  const operational =
    document.getElementById(
      "adm360OperationalConsole"
    );

  if (!operational) {

    setTimeout(
      waitForOperationalCenter,
      400
    );

    return;

  }

  createCenter(
    operational
  );

  setInterval(
    renderCenter,
    900
  );

}


/* ============================================================
   ESTILOS
   ============================================================ */

function installStyles() {

  if (
    document.getElementById(
      "adm360InterferenceStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "adm360InterferenceStyles";

  style.textContent = `

    #adm360InterferenceCenter {

      margin-top: 18px;

      padding: 20px;

      border-radius: 20px;

      border:
        1px solid
        rgba(255,255,255,.11);

      background:
        rgba(3,10,25,.62);

    }


    .adm360-int-head {

      display: flex;

      justify-content:
        space-between;

      align-items:
        flex-start;

      gap: 14px;

      margin-bottom: 17px;

    }


    .adm360-int-head h3 {

      margin:
        4px 0;

      font-size:
        1.05rem;

    }


    .adm360-int-head p {

      margin: 0;

      max-width:
        720px;

      font-size:
        .76rem;

      line-height:
        1.45;

      opacity:
        .67;

    }


    .adm360-int-badge {

      padding:
        9px 12px;

      border-radius:
        12px;

      font-size:
        .67rem;

      font-weight:
        900;

      white-space:
        nowrap;

      border:
        1px solid
        rgba(77,220,170,.28);

      background:
        rgba(77,220,170,.09);

    }


    .adm360-int-form {

      display: grid;

      grid-template-columns:
        repeat(
          2,
          minmax(0,1fr)
        );

      gap: 12px;

    }


    .adm360-int-field {

      display: flex;

      flex-direction:
        column;

      gap: 6px;

    }


    .adm360-int-field.full {

      grid-column:
        1 / -1;

    }


    .adm360-int-field label {

      font-size:
        .65rem;

      font-weight:
        900;

      letter-spacing:
        .055em;

      opacity:
        .66;

    }


    .adm360-int-field input,
    .adm360-int-field select,
    .adm360-int-field textarea {

      width: 100%;

      box-sizing:
        border-box;

      padding:
        11px 12px;

      border-radius:
        12px;

      border:
        1px solid
        rgba(255,255,255,.12);

      background:
        rgba(255,255,255,.055);

      color:
        inherit;

      font:
        inherit;

      outline:
        none;

    }


    .adm360-int-field select option {

      color:
        #111;

      background:
        #fff;

    }


    .adm360-int-field textarea {

      min-height:
        92px;

      resize:
        vertical;

    }


    .adm360-int-actions {

      display: flex;

      flex-wrap:
        wrap;

      gap: 9px;

      margin-top:
        14px;

    }


    .adm360-int-button {

      padding:
        11px 15px;

      border-radius:
        12px;

      border:
        1px solid
        rgba(100,170,255,.34);

      background:
        rgba(42,125,255,.17);

      color:
        inherit;

      font-weight:
        900;

      cursor:
        pointer;

    }


    .adm360-int-button.secondary {

      background:
        rgba(255,255,255,.05);

      border-color:
        rgba(255,255,255,.13);

    }


    .adm360-int-button:disabled {

      opacity:
        .45;

      cursor:
        not-allowed;

    }


    .adm360-int-message {

      min-height:
        18px;

      margin-top:
        11px;

      font-size:
        .72rem;

      font-weight:
        800;

    }


    .adm360-int-divider {

      height:
        1px;

      margin:
        20px 0;

      background:
        rgba(255,255,255,.08);

    }


    .adm360-int-history-head {

      display: flex;

      justify-content:
        space-between;

      align-items:
        center;

      gap: 10px;

      margin-bottom:
        11px;

    }


    .adm360-int-history-head strong {

      font-size:
        .88rem;

    }


    .adm360-int-history {

      display: grid;

      gap: 9px;

    }


    .adm360-int-empty {

      padding:
        16px;

      border-radius:
        13px;

      border:
        1px dashed
        rgba(255,255,255,.13);

      text-align:
        center;

      font-size:
        .75rem;

      opacity:
        .55;

    }


    .adm360-int-record {

      padding:
        13px;

      border-radius:
        14px;

      border:
        1px solid
        rgba(255,255,255,.09);

      background:
        rgba(255,255,255,.035);

    }


    .adm360-int-record.active {

      border-color:
        rgba(255,177,74,.35);

      background:
        rgba(255,177,74,.055);

    }


    .adm360-int-record-top {

      display: flex;

      justify-content:
        space-between;

      gap: 12px;

      align-items:
        flex-start;

    }


    .adm360-int-record strong {

      font-size:
        .82rem;

    }


    .adm360-int-record small {

      display: block;

      margin-top:
        4px;

      line-height:
        1.4;

      opacity:
        .62;

    }


    .adm360-int-status {

      font-size:
        .61rem;

      font-weight:
        900;

      white-space:
        nowrap;

    }


    .adm360-int-close {

      margin-top:
        10px;

      padding:
        7px 10px;

      border-radius:
        9px;

      border:
        1px solid
        rgba(255,255,255,.14);

      background:
        rgba(255,255,255,.05);

      color:
        inherit;

      font-weight:
        800;

      cursor:
        pointer;

    }


    @media (
      max-width: 700px
    ) {

      .adm360-int-form {

        grid-template-columns:
          1fr;

      }


      .adm360-int-field.full {

        grid-column:
          auto;

      }


      .adm360-int-head {

        flex-direction:
          column;

      }

    }

  `;

  document.head.appendChild(
    style
  );

}


/* ============================================================
   INTERFACE
   ============================================================ */

function createCenter(
  operational
) {

  if (
    document.getElementById(
      "adm360InterferenceCenter"
    )
  ) {
    return;
  }


  const section =
    document.createElement(
      "section"
    );

  section.id =
    "adm360InterferenceCenter";


  section.innerHTML = `

    <div
      class="adm360-int-head"
    >

      <div>

        <div
          class="adm360-op-eyebrow"
        >
          COMANDO DO PROFESSOR
        </div>

        <h3>
          Interferência Operacional
        </h3>

        <p>
          Crie uma ocorrência estratégica
          para todas as empresas ou para uma
          empresa específica. O registro não
          modifica automaticamente os indicadores
          financeiros ou o progresso da Arena.
        </p>

      </div>


      <div
        class="adm360-int-badge"
      >
        CONTROLE MANUAL
      </div>

    </div>


    <div
      class="adm360-int-form"
    >

      <div
        class="adm360-int-field"
      >

        <label>
          EMPRESA-ALVO
        </label>

        <select
          id="adm360IntTarget"
        >

          <option value="all">
            Todas as empresas
          </option>

        </select>

      </div>


      <div
        class="adm360-int-field"
      >

        <label>
          CATEGORIA
        </label>

        <select
          id="adm360IntCategory"
        >
        </select>

      </div>


      <div
        class="adm360-int-field"
      >

        <label>
          INTENSIDADE
        </label>

        <select
          id="adm360IntSeverity"
        >

          <option value="leve">
            Leve
          </option>

          <option
            value="moderada"
            selected
          >
            Moderada
          </option>

          <option value="alta">
            Alta
          </option>

          <option value="critica">
            Crítica
          </option>

        </select>

      </div>


      <div
        class="adm360-int-field"
      >

        <label>
          TÍTULO DA OCORRÊNCIA
        </label>

        <input
          id="adm360IntTitle"
          type="text"
          maxlength="100"
          placeholder="Ex.: Ruptura inesperada no fornecimento"
        >

      </div>


      <div
        class="
          adm360-int-field
          full
        "
      >

        <label>
          DESCRIÇÃO / ORIENTAÇÃO ESTRATÉGICA
        </label>

        <textarea
          id="adm360IntDescription"
          maxlength="600"
          placeholder="Descreva a situação que deverá ser analisada pela empresa."
        ></textarea>

      </div>

    </div>


    <div
      class="adm360-int-actions"
    >

      <button
        type="button"
        class="adm360-int-button"
        id="adm360ActivateInterference"
      >
        ATIVAR INTERFERÊNCIA
      </button>


      <button
        type="button"
        class="
          adm360-int-button
          secondary
        "
        id="adm360ClearInterference"
      >
        LIMPAR CAMPOS
      </button>

    </div>


    <div
      class="adm360-int-message"
      id="adm360IntMessage"
    >
    </div>


    <div
      class="adm360-int-divider"
    ></div>


    <div
      class="adm360-int-history-head"
    >

      <strong>
        Histórico de Interferências
      </strong>

      <span
        id="adm360IntCount"
      >
        0 registros
      </span>

    </div>


    <div
      class="adm360-int-history"
      id="adm360IntHistory"
    >

      <div
        class="adm360-int-empty"
      >
        Nenhuma interferência registrada.
      </div>

    </div>

  `;


  operational.appendChild(
    section
  );


  populateCategories();

  document
    .getElementById(
      "adm360ActivateInterference"
    )
    ?.addEventListener(
      "click",
      activateInterference
    );


  document
    .getElementById(
      "adm360ClearInterference"
    )
    ?.addEventListener(
      "click",
      clearForm
    );


  renderCenter();

}


/* ============================================================
   CATEGORIAS
   ============================================================ */

function populateCategories() {

  const select =
    document.getElementById(
      "adm360IntCategory"
    );

  if (!select) {
    return;
  }


  select.innerHTML =
    CENTRAL_CATEGORIES
      .map(
        category => `

          <option
            value="${escapeText(category)}"
          >
            ${escapeText(category)}
          </option>

        `
      )
      .join("");

}


/* ============================================================
   SALA ATUAL
   ============================================================ */

function getRoomCode() {

  const element =
    document.getElementById(
      "codigoSala"
    );


  const code =
    String(
      element?.textContent ||
      ""
    )
      .trim()
      .toUpperCase();


  if (
    !code ||
    code.includes("------")
  ) {
    return null;
  }


  return code;

}


/* ============================================================
   RODADA ATUAL
   ============================================================ */

function getRound() {

  const text =
    String(
      document.getElementById(
        "rodada"
      )?.textContent ||
      ""
    );


  const match =
    text.match(/\d+/);


  return match
    ? Number(match[0]) || 0
    : 0;

}


/* ============================================================
   CARREGA SALA
   ============================================================ */

async function getRoom() {

  const roomCode =
    getRoomCode();


  if (!roomCode) {
    return null;
  }


  const firebase =
    await getFirebase();


  if (!firebase) {
    return null;
  }


  const snapshot =
    await firebase.get(

      firebase.ref(
        firebase.db,
        `rooms/${roomCode}`
      )

    );


  return snapshot.val();

}


/* ============================================================
   EMPRESAS
   ============================================================ */

async function populateCompanies() {

  const select =
    document.getElementById(
      "adm360IntTarget"
    );


  if (!select) {
    return;
  }


  const selected =
    select.value;


  const room =
    await getRoom();


  const companies =
    room?.companies || {};


  const options =
    Object.entries(
      companies
    )
      .map(
        ([id, company]) => `

          <option
            value="${escapeText(id)}"
          >
            ${escapeText(
              company?.name ||
              id
            )}
          </option>

        `
      )
      .join("");


  select.innerHTML = `

    <option value="all">
      Todas as empresas
    </option>

    ${options}

  `;


  if (
    selected &&
    [
      "all",
      ...Object.keys(companies)
    ].includes(selected)
  ) {

    select.value =
      selected;

  }

}


/* ============================================================
   ATIVAR INTERFERÊNCIA
   ============================================================ */

async function activateInterference() {

  const roomCode =
    getRoomCode();


  if (!roomCode) {

    showMessage(
      "Acesse uma sala da Arena antes de criar uma interferência.",
      true
    );

    return;

  }


  const target =
    document.getElementById(
      "adm360IntTarget"
    )?.value || "all";


  const category =
    document.getElementById(
      "adm360IntCategory"
    )?.value || "Mercado";


  const severity =
    document.getElementById(
      "adm360IntSeverity"
    )?.value || "moderada";


  const title =
    String(
      document.getElementById(
        "adm360IntTitle"
      )?.value || ""
    ).trim();


  const description =
    String(
      document.getElementById(
        "adm360IntDescription"
      )?.value || ""
    ).trim();


  if (!title) {

    showMessage(
      "Informe o título da ocorrência.",
      true
    );

    return;

  }


  if (!description) {

    showMessage(
      "Descreva a situação estratégica.",
      true
    );

    return;

  }


  try {

    const firebase =
      await getFirebase();


    if (!firebase) {

      throw new Error(
        "Firebase indisponível."
      );

    }


    const room =
      await getRoom();


    if (!room) {

      throw new Error(
        "Sala não encontrada."
      );

    }


    let targetName =
      "Todas as empresas";


    if (
      target !== "all"
    ) {

      targetName =
        room.companies?.[
          target
        ]?.name ||
        target;

    }


    const timestamp =
      Date.now();


    const id =
      `int-${timestamp}-${Math.floor(
        Math.random() * 9999
      )}`;


    const record = {

      id,

      target:
        target === "all"
          ? "all"
          : "company",

      companyId:
        target === "all"
          ? null
          : target,

      companyName:
        targetName,

      category,

      severity,

      title,

      description,

      round:
        getRound(),

      status:
        "active",

      createdAt:
        timestamp,

      createdBy:
        "Prof. Leopoldo"

    };


    /*
      Gravação isolada.
      Não substitui a sala inteira.
    */

    await firebase.set(

      firebase.ref(
        firebase.db,
        `rooms/${roomCode}/operationalInterferences/${id}`
      ),

      record

    );


    /*
      Também encaminhamos uma mensagem
      estratégica pela estrutura Mobile
      já existente.

      Isso NÃO modifica os indicadores
      da empresa.
    */

    const messageId =
      `m-${timestamp}-int`;


    await firebase.set(

      firebase.ref(
        firebase.db,
        `rooms/${roomCode}/mobileMessages/${messageId}`
      ),

      {

        id:
          messageId,

        target:
          target === "all"
            ? "all"
            : "company",

        companyId:
          target === "all"
            ? null
            : target,

        companyName:
          targetName,

        type:
          severity === "critica"
            ? "alerta"
            : "informacao",

        text:
          `${title}: ${description}`,

        source:
          "central-interferencias",

        interferenceId:
          id,

        createdAt:
          timestamp,

        createdBy:
          "Prof. Leopoldo"

      }

    );


    showMessage(
      `Interferência ativada para ${targetName}.`,
      false
    );


    clearForm(
      false
    );


    await renderCenter();

  } catch (error) {

    console.error(
      error
    );


    showMessage(
      `Não foi possível registrar a interferência: ${error.message}`,
      true
    );

  }

}


/* ============================================================
   ENCERRAR INTERFERÊNCIA
   ============================================================ */

async function closeInterference(
  interferenceId
) {

  const roomCode =
    getRoomCode();


  if (
    !roomCode ||
    !interferenceId
  ) {
    return;
  }


  try {

    const firebase =
      await getFirebase();


    if (!firebase) {
      return;
    }


    await firebase.set(

      firebase.ref(
        firebase.db,
        `rooms/${roomCode}/operationalInterferences/${interferenceId}/status`
      ),

      "closed"

    );


    await firebase.set(

      firebase.ref(
        firebase.db,
        `rooms/${roomCode}/operationalInterferences/${interferenceId}/closedAt`
      ),

      Date.now()

    );


    await firebase.set(

      firebase.ref(
        firebase.db,
        `rooms/${roomCode}/operationalInterferences/${interferenceId}/closedBy`
      ),

      "Prof. Leopoldo"

    );


    showMessage(
      "Interferência encerrada e preservada no histórico.",
      false
    );


    await renderCenter();

  } catch (error) {

    console.error(
      error
    );


    showMessage(
      `Erro ao encerrar: ${error.message}`,
      true
    );

  }

}


/* ============================================================
   RENDERIZAÇÃO
   ============================================================ */

let rendering =
  false;


async function renderCenter() {

  if (rendering) {
    return;
  }


  rendering =
    true;


  try {

    await populateCompanies();


    const history =
      document.getElementById(
        "adm360IntHistory"
      );


    if (!history) {
      return;
    }


    const room =
      await getRoom();


    const records =
      Object.values(
        room?.operationalInterferences ||
        {}
      )
        .sort(
          (a, b) =>
            Number(
              b?.createdAt || 0
            ) -
            Number(
              a?.createdAt || 0
            )
        );


    const count =
      document.getElementById(
        "adm360IntCount"
      );


    if (count) {

      count.textContent =
        `${records.length} registro${
          records.length === 1
            ? ""
            : "s"
        }`;

    }


    if (!records.length) {

      history.innerHTML = `

        <div
          class="adm360-int-empty"
        >
          Nenhuma interferência registrada.
        </div>

      `;

      return;

    }


    history.innerHTML =
      records
        .map(record => {

          const active =
            record.status ===
            "active";


          return `

            <article
              class="
                adm360-int-record
                ${active ? "active" : ""}
              "
            >

              <div
                class="adm360-int-record-top"
              >

                <div>

                  <strong>
                    ${escapeText(
                      record.title
                    )}
                  </strong>

                  <small>
                    ${escapeText(
                      record.category
                    )}
                    •
                    ${escapeText(
                      record.severity
                    )}
                    •
                    Rodada
                    ${Number(
                      record.round || 0
                    )}
                  </small>

                  <small>
                    Alvo:
                    ${escapeText(
                      record.companyName ||
                      "Todas as empresas"
                    )}
                  </small>

                </div>


                <div
                  class="adm360-int-status"
                >
                  ${
                    active
                      ? "ATIVA"
                      : "ENCERRADA"
                  }
                </div>

              </div>


              <small>
                ${escapeText(
                  record.description
                )}
              </small>


              ${
                active
                  ? `

                    <button
                      type="button"
                      class="adm360-int-close"
                      data-close-interference="${escapeText(
                        record.id
                      )}"
                    >
                      ENCERRAR INTERFERÊNCIA
                    </button>

                  `
                  : ""
              }

            </article>

          `;

        })
        .join("");


    history
      .querySelectorAll(
        "[data-close-interference]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            closeInterference(
              button.dataset
                .closeInterference
            );

          }
        );

      });

  } catch (error) {

    console.error(
      "ADM Arena 360 — Central de Interferências:",
      error
    );

  } finally {

    rendering =
      false;

  }

}


/* ============================================================
   LIMPAR FORMULÁRIO
   ============================================================ */

function clearForm(
  clearMessage = true
) {

  const title =
    document.getElementById(
      "adm360IntTitle"
    );


  const description =
    document.getElementById(
      "adm360IntDescription"
    );


  const severity =
    document.getElementById(
      "adm360IntSeverity"
    );


  if (title) {
    title.value = "";
  }


  if (description) {
    description.value = "";
  }


  if (severity) {
    severity.value =
      "moderada";
  }


  if (clearMessage) {

    showMessage(
      "",
      false
    );

  }

}


/* ============================================================
   MENSAGEM
   ============================================================ */

function showMessage(
  text,
  error = false
) {

  const box =
    document.getElementById(
      "adm360IntMessage"
    );


  if (!box) {
    return;
  }


  box.textContent =
    text;


  box.style.color =
    error
      ? "#ff8794"
      : "";

}


/* ============================================================
   SEGURANÇA DE TEXTO
   ============================================================ */

function escapeText(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


/* ============================================================
   FIM
   ============================================================ */

console.log(
  "ADM Arena 360 — Central de Interferências Operacionais carregada."
);
