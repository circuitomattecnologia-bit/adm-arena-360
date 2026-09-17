/* ============================================================
   ADM ARENA 360
   ESTABILIDADE DA ARENA — EMPRESA

   OBJETIVOS
   ------------------------------------------------------------
   1. Manter a sessão da empresa já autorizada.
   2. Permitir recuperação após F5 / fechamento / reconexão.
   3. NÃO autorizar empresa nova automaticamente.
   4. NÃO interferir na Central Mobile.
   5. Proteger botões de decisão contra cliques repetidos.
   6. Melhorar resistência a atualizações frequentes da interface.
   7. NÃO alterar caixa, XP, clientes, reputação ou decisões.
============================================================ */

const SESSION_KEY = "admArena360:companySession:v1";

const PAGE =
  String(window.location.pathname || "")
    .split("/")
    .pop()
    .toLowerCase();

if (PAGE === "empresa.html") {
  iniciarEstabilidadeArena();
}


/* ============================================================
   UTILIDADES
============================================================ */

function agora() {
  return Date.now();
}


function normalizarCodigo(valor) {
  const match =
    String(valor || "")
      .trim()
      .toUpperCase()
      .match(/\bADM-\d{4}\b/);

  return match ? match[0] : "";
}


function modoMobile() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("mode") === "mobile"
  );
}


function lerSessao() {
  try {
    const raw =
      localStorage.getItem(
        SESSION_KEY
      );

    if (!raw) {
      return null;
    }

    const session =
      JSON.parse(raw);

    if (
      !session ||
      !session.roomCode ||
      !session.companyId
    ) {
      return null;
    }

    return session;

  } catch (error) {
    console.warn(
      "ADM Arena 360 — sessão inválida:",
      error
    );

    return null;
  }
}


function salvarSessao(session) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        ...session,
        updatedAt: agora()
      })
    );
  } catch (error) {
    console.warn(
      "ADM Arena 360 — não foi possível salvar sessão:",
      error
    );
  }
}


function limparSessao() {
  try {
    localStorage.removeItem(
      SESSION_KEY
    );
  } catch (error) {
    console.warn(error);
  }
}


/* ============================================================
   IDENTIFICAÇÃO DA EMPRESA NA TELA
============================================================ */

function obterCodigoSalaTela() {
  const campo =
    document.querySelector(
      "#codigo"
    );

  const pill =
    document.querySelector(
      "#salaPill"
    );

  const params =
    new URLSearchParams(
      window.location.search
    );

  const candidatos = [
    campo?.value,
    pill?.textContent,
    params.get("sala"),
    params.get("room"),
    params.get("codigo"),
    localStorage.getItem(
      "adm360:openingRoomCode"
    ),
    localStorage.getItem(
      "admArena360Room"
    ),
    localStorage.getItem(
      "admArenaRoom"
    ),
    localStorage.getItem(
      "admArenaRoomCode"
    )
  ];

  for (
    const valor of candidatos
  ) {
    const codigo =
      normalizarCodigo(
        valor
      );

    if (codigo) {
      return codigo;
    }
  }

  return "";
}


function obterNomeEmpresaTela() {
  return String(
    document.querySelector(
      "#nomeEmpresa"
    )?.value ||
    document.querySelector(
      "#empresaNome"
    )?.textContent ||
    ""
  ).trim();
}


/* ============================================================
   CAPTURA DE AUTORIZAÇÃO JÁ CONCEDIDA

   IMPORTANTE:
   Este módulo NÃO concede autorização.
   Apenas memoriza localmente quando o sistema principal
   efetivamente libera o jogo.
============================================================ */

function jogoEstaLiberado() {
  const jogo =
    document.querySelector(
      "#jogo"
    );

  const bloqueio =
    document.querySelector(
      "#bloqueioAutorizacao"
    );

  if (!jogo) {
    return false;
  }

  const jogoVisivel =
    !jogo.classList.contains(
      "hidden"
    );

  const bloqueioOculto =
    !bloqueio ||
    bloqueio.classList.contains(
      "hidden"
    );

  return (
    jogoVisivel &&
    bloqueioOculto
  );
}


function tentarRegistrarSessaoAutorizada() {
  if (modoMobile()) {
    return;
  }

  if (!jogoEstaLiberado()) {
    return;
  }

  const roomCode =
    obterCodigoSalaTela();

  const companyName =
    obterNomeEmpresaTela();

  if (!roomCode) {
    return;
  }

  /*
     O ID oficial da empresa será recuperado,
     quando possível, da solicitação de acesso.
     Enquanto isso, usamos um identificador local
     apenas para reconhecer a mesma estação.
  */

  const sessionAtual =
    lerSessao();

  salvarSessao({
    roomCode,

    companyId:
      sessionAtual?.companyId ||
      "",

    companyName:
      companyName ||
      sessionAtual?.companyName ||
      "",

    authorized:
      true,

    source:
      "empresa",

    authorizedAt:
      sessionAtual?.authorizedAt ||
      agora()
  });
}


/* ============================================================
   RECUPERAÇÃO VISUAL APÓS F5

   Não substitui a segurança do Firebase.
   Apenas restaura os campos necessários para a empresa
   retornar rapidamente.
============================================================ */

function restaurarCamposDaSessao() {
  if (modoMobile()) {
    return;
  }

  const session =
    lerSessao();

  if (
    !session ||
    !session.authorized
  ) {
    return;
  }

  const codigo =
    document.querySelector(
      "#codigo"
    );

  const nome =
    document.querySelector(
      "#nomeEmpresa"
    );

  if (
    codigo &&
    !codigo.value
  ) {
    codigo.value =
      session.roomCode || "";
  }

  if (
    nome &&
    !nome.value
  ) {
    nome.value =
      session.companyName || "";
  }
}


/* ============================================================
   PROTEÇÃO DOS BOTÕES

   Evita:
   - clique duplo;
   - dois envios simultâneos;
   - usuário clicar repetidamente enquanto o Firebase grava.

   NÃO altera a lógica original da decisão.
============================================================ */

function protegerBotao(button) {
  if (
    !button ||
    button.dataset
      .arenaStable === "1"
  ) {
    return;
  }

  button.dataset.arenaStable =
    "1";

  button.addEventListener(
    "click",
    () => {

      if (
        button.disabled ||
        button.dataset
          .arenaSending === "1"
      ) {
        return;
      }

      button.dataset
        .arenaSending =
        "1";

      const textoOriginal =
        button.textContent;

      button.dataset
        .arenaOriginalText =
        textoOriginal;

      /*
         Não desabilitamos imediatamente,
         pois o handler original também precisa
         receber o mesmo clique.

         O bloqueio físico acontece no próximo
         ciclo do navegador.
      */

      setTimeout(
        () => {
          if (
            button.isConnected &&
            button.dataset
              .arenaSending === "1"
          ) {
            button.disabled =
              true;
          }
        },
        0
      );

      /*
         Failsafe:
         caso alguma gravação falhe, o botão
         volta a funcionar sem exigir Ctrl+R.
      */

      setTimeout(
        () => {

          if (
            !button.isConnected
          ) {
            return;
          }

          if (
            button.dataset
              .arenaSending !== "1"
          ) {
            return;
          }

          button.disabled =
            false;

          button.dataset
            .arenaSending =
            "0";

          if (
            button.dataset
              .arenaOriginalText
          ) {
            button.textContent =
              button.dataset
                .arenaOriginalText;
          }

        },
        8000
      );

    },
    true
  );
}


function protegerBotoesDaArena() {
  const seletores = [
    "#confirmarPlanoInvest",
    "#enviarLance",
    "[data-d]",
    "[data-round-action]",
    "[data-action]",
    "[data-option]",
    "[data-decision]",
    "[data-decisao]",
    "[data-r9-action]",
    "[data-r10-action]",
    "[data-r11-action]",
    "[data-r12-action]",
    "[data-r13-action]",
    "[data-r14-action]",
    "[data-r15-action]",
    "[data-r16-action]",
    "[data-r17-action]",
    "[data-r18-action]",
    "[data-r19-action]",
    "[data-r20-action]"
  ];

  document
    .querySelectorAll(
      seletores.join(",")
    )
    .forEach(
      protegerBotao
    );
}


/* ============================================================
   OBSERVADOR DE INTERFACE

   Como empresa.js e os módulos das rodadas recriam partes
   da tela, precisamos reaplicar a proteção automaticamente.
============================================================ */

function observarInterface() {
  const observer =
    new MutationObserver(
      () => {
        protegerBotoesDaArena();

        tentarRegistrarSessaoAutorizada();
      }
    );

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class"
      ]
    }
  );

  return observer;
}


/* ============================================================
   RECUPERAÇÃO DE BOTÃO PRESO

   Se um elemento permanecer na tela depois da gravação,
   devolve sua condição normal.
============================================================ */

function fiscalizarBotoes() {
  setInterval(
    () => {

      document
        .querySelectorAll(
          "[data-arena-sending='1']"
        )
        .forEach(
          button => {

            const confirmado =
              document.body
                .textContent
                .includes(
                  "Decisão confirmada"
                ) ||
              document.body
                .textContent
                .includes(
                  "Decisão registrada"
                );

            if (confirmado) {
              button.dataset
                .arenaSending =
                "0";

              return;
            }

          }
        );

    },
    1000
  );
}


/* ============================================================
   PRESERVAÇÃO DE CAMPOS DURANTE ATUALIZAÇÕES

   Alguns renders podem acontecer enquanto o estudante
   está digitando. Guardamos somente campos de interface.
   Nenhum dado empresarial é alterado.
============================================================ */

const INPUT_CACHE =
  new Map();


function memorizarCampos() {
  document
    .querySelectorAll(
      "input, textarea, select"
    )
    .forEach(
      element => {

        if (!element.id) {
          return;
        }

        if (
          element.type ===
          "password"
        ) {
          return;
        }

        if (
          document.activeElement !==
          element
        ) {
          return;
        }

        INPUT_CACHE.set(
          element.id,
          element.value
        );
      }
    );
}


function restaurarCamposAtivos() {
  INPUT_CACHE.forEach(
    (
      value,
      id
    ) => {

      const element =
        document.getElementById(
          id
        );

      if (!element) {
        return;
      }

      if (
        element.type ===
        "password"
      ) {
        return;
      }

      if (
        !element.value &&
        value
      ) {
        element.value =
          value;
      }
    }
  );
}


/* ============================================================
   MONITOR DE PAUSA

   A pausa NÃO deve apagar a sessão local.
============================================================ */

function preservarSessaoNaPausa() {
  const status =
    String(
      document.querySelector(
        "#fasePill"
      )?.textContent ||
      ""
    )
      .trim()
      .toLowerCase();

  if (
    status.includes(
      "paus"
    )
  ) {
    /*
       Intencionalmente vazio.

       Não limpamos a sessão.
       Quando a Arena retornar, o navegador
       continua reconhecendo a empresa.
    */
  }
}


/* ============================================================
   INICIALIZAÇÃO
============================================================ */

function iniciarEstabilidadeArena() {
  if (modoMobile()) {
    console.log(
      "ADM Arena 360 — estabilidade: Mobile ignorado."
    );

    return;
  }

  restaurarCamposDaSessao();

  protegerBotoesDaArena();

  observarInterface();

  fiscalizarBotoes();

  setInterval(
    () => {
      memorizarCampos();

      restaurarCamposAtivos();

      protegerBotoesDaArena();

      tentarRegistrarSessaoAutorizada();

      preservarSessaoNaPausa();
    },
    700
  );

  window.addEventListener(
    "beforeunload",
    () => {
      tentarRegistrarSessaoAutorizada();
    }
  );

  console.log(
    "ADM Arena 360 — estabilidade da empresa carregada."
  );
}
