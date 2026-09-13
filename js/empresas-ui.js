/* =========================================================
   ADM ARENA 360
   NÚCLEO EMPRESAS — FICHA GERENCIAL

   DISCIPLINA: PROJETO EMPREENDEDOR

   MÓDULO VISUAL / ADMINISTRATIVO.

   NÃO LÊ FIREBASE.
   NÃO GRAVA FIREBASE.
   NÃO ALTERA RODADA.
   NÃO ALTERA CAIXA.
   NÃO ALTERA XP.
   NÃO ALTERA CLIENTES.
   NÃO ALTERA REPUTAÇÃO.
   NÃO ALTERA RECURSOS.
   NÃO ALTERA EMPRESAS.

   FUNÇÕES:
   1. Transformar DETALHES em FICHA GERENCIAL.
   2. Exibir visão atual da empresa.
   3. Preparar espaço para histórico gerencial futuro.
   4. Manter ações administrativas separadas.
   5. Proteger fortemente a exclusão de empresa.
========================================================= */


const IS_PROFESSOR =
  !!document.querySelector("#iniciar");


if (IS_PROFESSOR) {
  iniciarEmpresasUI();
}


/* =========================================================
   ESTILO
========================================================= */

function instalarEstilo() {

  if (
    document.querySelector(
      "#adm360EmpresasUiStyle"
    )
  ) {
    return;
  }


  const style =
    document.createElement("style");


  style.id =
    "adm360EmpresasUiStyle";


  style.textContent = `

    /* =====================================================
       BOTÃO FICHA GERENCIAL
    ===================================================== */

    .adm360-company-details-btn {
      border:
        1px solid
        rgba(92,183,255,.40);

      background:
        linear-gradient(
          135deg,
          rgba(92,183,255,.12),
          rgba(69,113,255,.08)
        );

      color: #e6f5ff;

      border-radius: 10px;

      padding: 8px 12px;

      font-weight: 950;

      letter-spacing: .02em;

      cursor: pointer;

      white-space: nowrap;

      margin-right: 7px;

      transition:
        background .18s ease,
        border-color .18s ease,
        transform .18s ease;
    }


    .adm360-company-details-btn:hover {
      background:
        linear-gradient(
          135deg,
          rgba(92,183,255,.22),
          rgba(69,113,255,.15)
        );

      border-color:
        rgba(92,183,255,.60);

      transform:
        translateY(-1px);
    }


    .adm360-company-details-btn.is-open {
      background:
        rgba(92,183,255,.18);

      border-color:
        rgba(92,183,255,.58);

      color: #ffffff;
    }


    /* =====================================================
       PAINEL PRINCIPAL
    ===================================================== */

    .adm360-company-detail-panel {
      display: none;

      width: 100%;

      margin-top: 14px;

      padding: 0;

      border-radius: 18px;

      border:
        1px solid
        rgba(92,183,255,.24);

      background:
        linear-gradient(
          145deg,
          rgba(7,18,42,.96),
          rgba(8,24,55,.93)
        );

      box-sizing: border-box;

      overflow: hidden;

      box-shadow:
        0 18px 50px
        rgba(0,0,0,.20);
    }


    .adm360-company-detail-panel.show {
      display: block;
    }


    /* =====================================================
       CABEÇALHO DA FICHA
    ===================================================== */

    .adm360-company-sheet-header {
      display: flex;

      align-items: center;

      justify-content: space-between;

      gap: 18px;

      padding: 18px 20px;

      background:
        linear-gradient(
          90deg,
          rgba(31,104,255,.18),
          rgba(18,219,210,.08)
        );

      border-bottom:
        1px solid
        rgba(92,183,255,.17);
    }


    .adm360-company-sheet-heading {
      min-width: 0;
    }


    .adm360-company-sheet-kicker {
      display: block;

      margin-bottom: 4px;

      color:
        rgba(255,255,255,.58);

      font-size: .72rem;

      font-weight: 900;

      letter-spacing: .09em;

      text-transform: uppercase;
    }


    .adm360-company-sheet-title {
      margin: 0;

      color: #ffffff;

      font-size: 1.08rem;

      font-weight: 950;

      line-height: 1.25;
    }


    .adm360-company-sheet-status {
      flex: 0 0 auto;

      padding: 7px 11px;

      border-radius: 999px;

      border:
        1px solid
        rgba(53,211,170,.32);

      background:
        rgba(53,211,170,.08);

      color: #aaf5dc;

      font-size: .72rem;

      font-weight: 950;

      white-space: nowrap;
    }


    /* =====================================================
       CORPO
    ===================================================== */

    .adm360-company-sheet-body {
      padding: 18px 20px 20px;
    }


    .adm360-company-section-title {
      display: flex;

      align-items: center;

      gap: 8px;

      margin-bottom: 10px;

      color: #dff5ff;

      font-size: .82rem;

      font-weight: 950;

      letter-spacing: .04em;

      text-transform: uppercase;
    }


    .adm360-company-section-title span {
      display: inline-flex;

      width: 8px;

      height: 8px;

      border-radius: 50%;

      background: #58dfff;

      box-shadow:
        0 0 12px
        rgba(88,223,255,.40);
    }


    /* =====================================================
       VISÃO ATUAL
    ===================================================== */

    .adm360-company-current {
      margin-bottom: 18px;

      padding: 15px 16px;

      border-radius: 14px;

      border:
        1px solid
        rgba(92,183,255,.16);

      background:
        rgba(255,255,255,.025);
    }


    .adm360-company-current-text {
      color:
        rgba(255,255,255,.83);

      font-size: .88rem;

      line-height: 1.68;

      white-space: pre-line;

      word-break: break-word;
    }


    /* =====================================================
       GRADE GERENCIAL
    ===================================================== */

    .adm360-company-management-grid {
      display: grid;

      grid-template-columns:
        repeat(3, minmax(0, 1fr));

      gap: 12px;

      margin-bottom: 18px;
    }


    .adm360-company-management-card {
      min-width: 0;

      min-height: 118px;

      padding: 14px 15px;

      border-radius: 14px;

      border:
        1px solid
        rgba(255,255,255,.09);

      background:
        rgba(255,255,255,.025);

      box-sizing: border-box;
    }


    .adm360-company-management-card h4 {
      margin:
        0 0 8px;

      color: #ffffff;

      font-size: .82rem;

      font-weight: 950;

      line-height: 1.35;
    }


    .adm360-company-management-card p {
      margin: 0;

      color:
        rgba(255,255,255,.58);

      font-size: .78rem;

      line-height: 1.55;
    }


    .adm360-company-no-record {
      display: inline-flex;

      margin-top: 9px;

      padding: 5px 8px;

      border-radius: 8px;

      border:
        1px solid
        rgba(255,255,255,.08);

      background:
        rgba(255,255,255,.025);

      color:
        rgba(255,255,255,.50);

      font-size: .69rem;

      font-weight: 850;
    }


    /* =====================================================
       OBSERVAÇÃO PEDAGÓGICA
    ===================================================== */

    .adm360-company-pedagogical-box {
      margin-bottom: 18px;

      padding: 14px 16px;

      border-radius: 14px;

      border:
        1px solid
        rgba(255,202,58,.20);

      background:
        rgba(255,202,58,.045);
    }


    .adm360-company-pedagogical-box strong {
      display: block;

      margin-bottom: 6px;

      color: #ffe59a;

      font-size: .80rem;

      font-weight: 950;
    }


    .adm360-company-pedagogical-box p {
      margin: 0;

      color:
        rgba(255,255,255,.66);

      font-size: .78rem;

      line-height: 1.55;
    }


    /* =====================================================
       AÇÕES ADMINISTRATIVAS
    ===================================================== */

    .adm360-company-security-box {
      padding: 14px 16px;

      border-radius: 14px;

      border:
        1px solid
        rgba(255,84,107,.25);

      background:
        rgba(255,84,107,.055);
    }


    .adm360-company-security-box strong {
      display: block;

      color: #ffabb7;

      margin-bottom: 6px;

      font-size: .80rem;

      font-weight: 950;
    }


    .adm360-company-security-box small {
      display: block;

      color:
        rgba(255,255,255,.65);

      line-height: 1.5;

      margin-bottom: 12px;
    }


    .adm360-company-delete-area {
      display: flex;

      align-items: center;

      justify-content: space-between;

      flex-wrap: wrap;

      gap: 10px;

      padding-top: 11px;

      border-top:
        1px solid
        rgba(255,84,107,.14);
    }


    .adm360-company-delete-warning {
      max-width: 650px;

      color: #ffbcc5;

      font-size: .72rem;

      line-height: 1.45;

      font-weight: 800;
    }


    /* =====================================================
       EXCLUIR
    ===================================================== */

    .delete-company {
      display: none !important;
    }


    .adm360-company-detail-panel.show
    .delete-company {
      display: inline-flex !important;
    }


    /* =====================================================
       RESPONSIVO
    ===================================================== */

    @media(max-width:1000px) {

      .adm360-company-management-grid {
        grid-template-columns:
          repeat(2, minmax(0, 1fr));
      }

    }


    @media(max-width:700px) {

      .adm360-company-details-btn {
        width: 100%;

        margin:
          7px 0 0;
      }


      .adm360-company-sheet-header {
        align-items: flex-start;

        flex-direction: column;
      }


      .adm360-company-sheet-status {
        align-self: flex-start;
      }


      .adm360-company-sheet-body {
        padding: 15px;
      }


      .adm360-company-management-grid {
        grid-template-columns: 1fr;
      }


      .adm360-company-delete-area {
        align-items: stretch;

        flex-direction: column;
      }

    }

  `;


  document.head.appendChild(style);
}


/* =========================================================
   INÍCIO
========================================================= */

function iniciarEmpresasUI() {

  instalarEstilo();

  processarEmpresas();


  const observer =
    new MutationObserver(() => {

      processarEmpresas();

    });


  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );


  instalarProtecaoExclusao();
}


/* =========================================================
   LOCALIZA A LINHA DA EMPRESA
========================================================= */

function localizarLinhaEmpresa(button) {

  let node =
    button?.parentElement;


  const container =
    document.querySelector("#empresas");


  while (
    node &&
    node !== container &&
    node.parentElement
  ) {

    if (
      node.parentElement === container
    ) {
      return node;
    }


    node =
      node.parentElement;
  }


  return (
    button?.parentElement ||
    null
  );
}


/* =========================================================
   PROCESSA EMPRESAS JÁ RENDERIZADAS
========================================================= */

function processarEmpresas() {

  const container =
    document.querySelector("#empresas");


  if (!container) {
    return;
  }


  container
    .querySelectorAll(".delete-company")
    .forEach(deleteButton => {

      if (
        deleteButton.dataset
          .adm360Protected === "1"
      ) {
        return;
      }


      deleteButton.dataset
        .adm360Protected = "1";


      const companyId =
        deleteButton.dataset
          .companyId || "";


      const companyName =
        deleteButton.dataset
          .companyName || "Empresa";


      const row =
        localizarLinhaEmpresa(
          deleteButton
        );


      if (!row) {
        return;
      }


      row.dataset
        .adm360CompanyRow =
        companyId || companyName;


      criarFichaGerencial(
        row,
        deleteButton,
        companyName
      );

    });
}


/* =========================================================
   CRIA FICHA GERENCIAL
========================================================= */

function criarFichaGerencial(
  row,
  deleteButton,
  companyName
) {

  if (
    row.querySelector(
      ".adm360-company-details-btn"
    )
  ) {
    return;
  }


  /* =======================================================
     BOTÃO
  ======================================================= */

  const button =
    document.createElement("button");


  button.type =
    "button";


  button.className =
    "adm360-company-details-btn";


  button.textContent =
    "FICHA GERENCIAL";


  /* =======================================================
     CAPTURA SOMENTE O QUE JÁ EXISTE VISUALMENTE

     Não cria novos valores.
     Não consulta Firebase.
  ======================================================= */

  const currentText =
    capturarResumoAtual(row);


  /* =======================================================
     PAINEL
  ======================================================= */

  const panel =
    document.createElement("div");


  panel.className =
    "adm360-company-detail-panel";


  panel.innerHTML = `

    <div
      class="adm360-company-sheet-header"
    >

      <div
        class="adm360-company-sheet-heading"
      >

        <span
          class="adm360-company-sheet-kicker"
        >
          ADM ARENA 360 • FICHA GERENCIAL
        </span>

        <h3
          class="adm360-company-sheet-title"
        >
          ${escapeHtml(companyName)}
        </h3>

      </div>


      <div
        class="adm360-company-sheet-status"
      >
        ACOMPANHAMENTO GERENCIAL
      </div>

    </div>


    <div
      class="adm360-company-sheet-body"
    >

      <!-- VISÃO ATUAL -->

      <div
        class="adm360-company-section-title"
      >
        <span></span>
        VISÃO ATUAL DA EMPRESA
      </div>


      <div
        class="adm360-company-current"
      >

        <div
          class="adm360-company-current-text"
        >
          ${
            currentText
              ? escapeHtml(currentText)
              : "Não foi possível identificar os dados atuais exibidos na linha da empresa."
          }
        </div>

      </div>


      <!-- HISTÓRICO GERENCIAL -->

      <div
        class="adm360-company-section-title"
      >
        <span></span>
        HISTÓRICO E ANÁLISE GERENCIAL
      </div>


      <div
        class="adm360-company-management-grid"
      >

        <div
          class="adm360-company-management-card"
        >

          <h4>
            FINANCEIRO
          </h4>

          <p>
            Evolução do caixa, investimentos,
            empréstimos, dívidas e compromissos
            financeiros poderão ser acompanhados
            neste espaço.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </div>


        <div
          class="adm360-company-management-card"
        >

          <h4>
            DECISÕES POR RODADA
          </h4>

          <p>
            Registro das decisões estratégicas
            tomadas pela empresa e dos resultados
            gerados em cada rodada da Arena.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </div>


        <div
          class="adm360-company-management-card"
        >

          <h4>
            MERCADO E CLIENTES
          </h4>

          <p>
            Evolução da carteira de clientes,
            posicionamento de mercado,
            desempenho comercial e negociações.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </div>


        <div
          class="adm360-company-management-card"
        >

          <h4>
            REPUTAÇÃO E PESSOAS
          </h4>

          <p>
            Impactos das decisões sobre reputação,
            gestão de pessoas e relacionamento
            com o mercado.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </div>


        <div
          class="adm360-company-management-card"
        >

          <h4>
            EVENTOS E CRISES
          </h4>

          <p>
            Ocorrências recebidas pela empresa,
            respostas adotadas e consequências
            produzidas durante a competição.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </div>


        <div
          class="adm360-company-management-card"
        >

          <h4>
            INOVAÇÃO E RESPONSABILIDADE SOCIAL
          </h4>

          <p>
            Investimentos em inovação,
            iniciativas sociais e resultados
            relacionados à gestão sustentável.
          </p>

          <div
            class="adm360-company-no-record"
          >
            Ainda não há histórico registrado
          </div>

        </div>

      </div>


      <!-- ORIENTAÇÃO -->

      <div
        class="adm360-company-pedagogical-box"
      >

        <strong>
          FINALIDADE DA FICHA GERENCIAL
        </strong>

        <p>
          Esta ficha será ampliada conforme
          novas rodadas e novos registros
          gerenciais forem implementados.
          O objetivo é permitir ao professor
          acompanhar não apenas o resultado
          atual, mas também compreender quais
          decisões levaram a empresa ao seu
          desempenho.
        </p>

      </div>


      <!-- ADMINISTRAÇÃO -->

      <div
        class="adm360-company-security-box"
      >

        <strong>
          AÇÕES ADMINISTRATIVAS
        </strong>

        <small>
          As ações abaixo não fazem parte
          da gestão normal da empresa durante
          a Arena. A exclusão é uma operação
          crítica e permanece protegida
          por múltiplas confirmações.
        </small>


        <div
          class="adm360-company-delete-area"
        >

          <div
            class="adm360-company-delete-warning"
          >
            EXCLUSÃO PROTEGIDA:
            somente utilize esta função
            quando uma empresa realmente
            precisar ser removida da Arena.
          </div>

        </div>

      </div>

    </div>

  `;


  /* =======================================================
     POSICIONA BOTÃO
  ======================================================= */

  const originalParent =
    deleteButton.parentElement;


  if (originalParent) {

    originalParent.insertBefore(
      button,
      deleteButton
    );

  }


  /* =======================================================
     INSERE PAINEL NA LINHA
  ======================================================= */

  row.appendChild(panel);


  /* =======================================================
     MOVE O BOTÃO EXCLUIR ORIGINAL

     Mantemos exatamente o botão original,
     para que professor.js continue sendo
     responsável pela exclusão real.
  ======================================================= */

  const deleteArea =
    panel.querySelector(
      ".adm360-company-delete-area"
    );


  if (deleteArea) {

    deleteArea.appendChild(
      deleteButton
    );

  }


  /* =======================================================
     ABRIR / FECHAR
  ======================================================= */

  button.addEventListener(
    "click",
    event => {

      event.preventDefault();
      event.stopPropagation();


      fecharOutrasFichas(
        panel,
        button
      );


      const open =
        panel.classList
          .toggle("show");


      button.classList
        .toggle(
          "is-open",
          open
        );


      button.textContent =
        open
          ? "FECHAR FICHA"
          : "FICHA GERENCIAL";

    }
  );
}


/* =========================================================
   CAPTURA O RESUMO ATUAL

   Remove apenas os textos administrativos
   adicionados por este módulo.
========================================================= */

function capturarResumoAtual(row) {

  if (!row) {
    return "";
  }


  const clone =
    row.cloneNode(true);


  clone
    .querySelectorAll(
      [
        ".adm360-company-details-btn",
        ".adm360-company-detail-panel",
        ".delete-company"
      ].join(",")
    )
    .forEach(element => {
      element.remove();
    });


  return String(
    clone.innerText || ""
  )
    .replace(
      /FICHA GERENCIAL/gi,
      ""
    )
    .replace(
      /FECHAR FICHA/gi,
      ""
    )
    .replace(
      /DETALHES/gi,
      ""
    )
    .replace(
      /EXCLUIR/gi,
      ""
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}


/* =========================================================
   FECHA OUTRAS FICHAS

   Mantém somente uma ficha aberta por vez.
========================================================= */

function fecharOutrasFichas(
  currentPanel,
  currentButton
) {

  document
    .querySelectorAll(
      ".adm360-company-detail-panel.show"
    )
    .forEach(panel => {

      if (
        panel === currentPanel
      ) {
        return;
      }


      panel.classList
        .remove("show");


      const row =
        panel.closest(
          "[data-adm360-company-row]"
        );


      const button =
        row?.querySelector(
          ".adm360-company-details-btn"
        );


      if (
        button &&
        button !== currentButton
      ) {

        button.classList
          .remove("is-open");


        button.textContent =
          "FICHA GERENCIAL";

      }

    });
}


/* =========================================================
   PROTEÇÃO CONTRA EXCLUSÃO ACIDENTAL
========================================================= */

function instalarProtecaoExclusao() {

  document.addEventListener(

    "click",

    event => {

      const button =
        event.target.closest(
          ".delete-company"
        );


      if (!button) {
        return;
      }


      /* ===================================================
         JÁ CONFIRMADO

         Libera uma única execução para
         o professor.js.
      =================================================== */

      if (
        button.dataset
          .adm360DeleteConfirmed === "1"
      ) {

        delete button.dataset
          .adm360DeleteConfirmed;

        return;
      }


      /* ===================================================
         BLOQUEIA CLIQUE ORIGINAL
      =================================================== */

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      const companyName =
        button.dataset
          .companyName ||
        "esta empresa";


      /* ===================================================
         CONFIRMAÇÃO 1
      =================================================== */

      const first =
        window.confirm(

          `ATENÇÃO\n\n` +

          `Você está prestes a excluir ` +
          `"${companyName}".\n\n` +

          `Esta ação pode remover a empresa ` +
          `da Arena e não deve ser utilizada ` +
          `durante a partida por engano.\n\n` +

          `Deseja continuar para a confirmação final?`

        );


      if (!first) {
        return;
      }


      /* ===================================================
         CONFIRMAÇÃO 2
      =================================================== */

      const typed =
        window.prompt(

          `CONFIRMAÇÃO DE SEGURANÇA\n\n` +

          `Para liberar a exclusão de ` +
          `"${companyName}", digite exatamente:\n\n` +

          `EXCLUIR`

        );


      if (
        String(
          typed || ""
        )
          .trim()
          .toUpperCase() !==
        "EXCLUIR"
      ) {

        window.alert(
          "Exclusão cancelada. " +
          "Nenhuma alteração foi realizada."
        );

        return;
      }


      /* ===================================================
         CONFIRMAÇÃO 3
      =================================================== */

      const finalConfirm =
        window.confirm(

          `ÚLTIMA CONFIRMAÇÃO\n\n` +

          `Excluir definitivamente ` +
          `"${companyName}"?\n\n` +

          `Confirme somente se esta remoção ` +
          `for realmente necessária.`

        );


      if (!finalConfirm) {
        return;
      }


      /* ===================================================
         LIBERA UMA EXECUÇÃO DO BOTÃO ORIGINAL
      =================================================== */

      button.dataset
        .adm360DeleteConfirmed = "1";


      button.click();

    },

    true

  );
}


/* =========================================================
   ESCAPE DE HTML
========================================================= */

function escapeHtml(value) {

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
