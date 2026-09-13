/* =========================================================
   ADM ARENA 360
   NÚCLEO EMPRESAS — INTERFACE SEGURA

   SOMENTE VISUAL / PROTEÇÃO DE INTERFACE.

   NÃO LÊ FIREBASE.
   NÃO GRAVA FIREBASE.
   NÃO ALTERA RODADA.
   NÃO ALTERA CAIXA.
   NÃO ALTERA XP.
   NÃO ALTERA EMPRESAS.

   FUNÇÕES:
   1. Detalhes sob demanda.
   2. Proteção forte contra exclusão acidental.
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

    .adm360-company-details-btn {
      border:
        1px solid
        rgba(92,183,255,.36);
      background:
        rgba(92,183,255,.08);
      color: #d9efff;
      border-radius: 10px;
      padding: 7px 10px;
      font-weight: 900;
      cursor: pointer;
      white-space: nowrap;
      margin-right: 7px;
    }

    .adm360-company-details-btn:hover {
      background:
        rgba(92,183,255,.15);
    }

    .adm360-company-detail-panel {
      display: none;
      width: 100%;
      margin-top: 12px;
      padding: 14px 16px;
      border-radius: 14px;
      border:
        1px solid
        rgba(92,183,255,.20);
      background:
        rgba(5,15,35,.48);
      box-sizing: border-box;
    }

    .adm360-company-detail-panel.show {
      display: block;
    }

    .adm360-company-detail-title {
      font-size: .9rem;
      font-weight: 950;
      color: #58dfff;
      margin-bottom: 8px;
    }

    .adm360-company-detail-text {
      font-size: .86rem;
      line-height: 1.55;
      color:
        rgba(255,255,255,.78);
    }

    .adm360-company-security-box {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      border:
        1px solid
        rgba(255,84,107,.25);
      background:
        rgba(255,84,107,.055);
    }

    .adm360-company-security-box strong {
      display: block;
      color: #ff9baa;
      margin-bottom: 5px;
    }

    .adm360-company-security-box small {
      display: block;
      color:
        rgba(255,255,255,.68);
      line-height: 1.45;
    }

    .delete-company {
      display: none !important;
    }

    .adm360-company-detail-panel.show
    .delete-company {
      display: inline-flex !important;
    }

    .adm360-company-delete-warning {
      margin-top: 10px;
      font-size: .78rem;
      color: #ffb2bd;
      font-weight: 800;
    }

    @media(max-width:800px) {

      .adm360-company-details-btn {
        width: 100%;
        margin:
          7px 0 0;
      }

    }

  `;

  document.head.appendChild(
    style
  );

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

function localizarLinhaEmpresa(
  button
) {

  let node =
    button?.parentElement;

  const container =
    document.querySelector(
      "#empresas"
    );

  while (
    node &&
    node !== container &&
    node.parentElement
  ) {

    if (
      node.parentElement ===
      container
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
    document.querySelector(
      "#empresas"
    );

  if (!container) {
    return;
  }

  container
    .querySelectorAll(
      ".delete-company"
    )
    .forEach(
      deleteButton => {

        if (
          deleteButton.dataset
            .adm360Protected ===
          "1"
        ) {
          return;
        }

        deleteButton.dataset
          .adm360Protected =
          "1";

        const companyId =
          deleteButton.dataset
            .companyId ||
          "";

        const companyName =
          deleteButton.dataset
            .companyName ||
          "Empresa";

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

        criarBotaoDetalhes(
          row,
          deleteButton,
          companyName
        );

      }
    );

}


/* =========================================================
   BOTÃO DETALHES
========================================================= */

function criarBotaoDetalhes(
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

  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    "adm360-company-details-btn";

  button.textContent =
    "DETALHES";


  const panel =
    document.createElement(
      "div"
    );

  panel.className =
    "adm360-company-detail-panel";


  /*
    Captura o conteúdo textual que já está
    sendo mostrado na linha da empresa.
    Não acessa Firebase e não cria dado novo.
  */

  const currentText =
    String(
      row.innerText || ""
    )
      .replace(
        /Excluir/gi,
        ""
      )
      .replace(
        /DETALHES/gi,
        ""
      )
      .trim();


  panel.innerHTML = `

    <div
      class="adm360-company-detail-title"
    >
      🏢 ${escapeHtml(
        companyName
      )}
    </div>

    <div
      class="adm360-company-detail-text"
    >
      ${escapeHtml(
        currentText
      )}
    </div>

    <div
      class="adm360-company-security-box"
    >

      <strong>
        🔐 AÇÕES ADMINISTRATIVAS
      </strong>

      <small>
        A exclusão de uma empresa é uma
        operação crítica e permanece
        protegida por confirmação.
      </small>

    </div>

    <div
      class="adm360-company-delete-warning"
    >
      O botão de exclusão só aparece
      dentro deste detalhamento.
    </div>

  `;


  const originalParent =
    deleteButton.parentElement;


  if (originalParent) {

    originalParent.insertBefore(
      button,
      deleteButton
    );

  }


  row.appendChild(
    panel
  );


  /*
    Move visualmente o botão Excluir
    para dentro do detalhamento.
    O próprio botão original continua
    sendo usado pelo professor.js.
  */

  panel.appendChild(
    deleteButton
  );


  button.addEventListener(
    "click",
    event => {

      event.preventDefault();
      event.stopPropagation();

      const open =
        panel.classList
          .toggle("show");

      button.textContent =
        open
          ? "FECHAR DETALHES"
          : "DETALHES";

    }
  );

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


      /*
        Quando já passou pela confirmação,
        permite que o professor.js execute
        a exclusão original normalmente.
      */

      if (
        button.dataset
          .adm360DeleteConfirmed ===
        "1"
      ) {

        delete button.dataset
          .adm360DeleteConfirmed;

        return;
      }


      /*
        Bloqueia o clique original antes
        de chegar ao professor.js.
      */

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      const companyName =
        button.dataset
          .companyName ||
        "esta empresa";


      const first =
        window.confirm(

          `ATENÇÃO\n\n` +

          `Você está prestes a excluir ` +
          `"${companyName}".\n\n` +

          `Esta ação pode remover a empresa ` +
          `da Arena e não deve ser usada ` +
          `durante a partida por engano.\n\n` +

          `Deseja continuar para a confirmação final?`

        );


      if (!first) {
        return;
      }


      const typed =
        window.prompt(

          `CONFIRMAÇÃO FINAL\n\n` +

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


      const finalConfirm =
        window.confirm(

          `Última confirmação:\n\n` +

          `Excluir definitivamente ` +
          `"${companyName}"?`

        );


      if (!finalConfirm) {
        return;
      }


      /*
        Libera UMA execução do clique
        original do professor.js.
      */

      button.dataset
        .adm360DeleteConfirmed =
        "1";


      button.click();

    },

    true

  );

}


/* =========================================================
   ESCAPE
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
