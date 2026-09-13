import { getFirebase } from "./firebase-service.js";

const VIDEO_SRC = "./media/Arena_ADM_360_Abertura_v5_COMPACTADO.mp4";
const IS_PROFESSOR = !!document.querySelector("#iniciar");

let roomCode = "";
let unsubscribe = null;
let currentNonce = null;
let latestRoom = null;

let overlay = null;
let video = null;
let playButton = null;


/* =========================================================
   ADM ARENA 360
   ABERTURA + RETOMADA SEGURA + LOCALIZADOR DE ARENAS
========================================================= */


/* =========================================================
   CÓDIGO DA SALA
========================================================= */

function normalizeCode(value) {

  const match =
    String(value || "")
      .toUpperCase()
      .match(/ADM-\d{4}/);

  return match
    ? match[0]
    : "";

}


function detectRoomCode() {

  const candidates = [

    new URLSearchParams(
      location.search
    ).get("sala"),

    document.querySelector(
      "#codigo"
    )?.value,

    document.querySelector(
      "#codigoSala"
    )?.value,

    document.querySelector(
      "#codigoSala"
    )?.textContent,

    document.querySelector(
      "#codigoExistente"
    )?.value,

    document.querySelector(
      "#salaPill"
    )?.textContent,

    document.querySelector(
      "#salaCodigo"
    )?.textContent,

    ...Array
      .from(
        document.querySelectorAll(
          "input"
        )
      )
      .map(
        el => el.value
      ),

    document.body?.innerText

  ];


  for (
    const item
    of candidates
  ) {

    const code =
      normalizeCode(
        item
      );

    if (code) {

      localStorage.setItem(
        "adm360:openingRoomCode",
        code
      );

      return code;

    }

  }


  return normalizeCode(

    localStorage.getItem(
      "adm360:openingRoomCode"
    )

  );

}


/* =========================================================
   FIREBASE — LEITURA SEGURA
========================================================= */

async function readRoom(code) {

  const normalized =
    normalizeCode(code);


  if (!normalized) {
    return null;
  }


  const f =
    await getFirebase();


  if (!f) {

    throw new Error(
      "Firebase indisponível."
    );

  }


  const snap =
    await f.get(

      f.ref(
        f.db,
        `rooms/${normalized}`
      )

    );


  return snap?.val?.() ?? null;

}


/* =========================================================
   TELA PRETA + VÍDEO
========================================================= */

function ensureOverlay() {

  if (overlay) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.textContent = `

    #adm360OpeningOverlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: #000;
      display: none;
      align-items: center;
      justify-content: center;
    }

    #adm360OpeningOverlay.show {
      display: flex;
    }

    #adm360OpeningVideo {
      width: 100vw;
      height: 100vh;
      object-fit: contain;
      background: #000;
    }

    #adm360OpeningPlay {
      position: absolute;
      left: 50%;
      top: 50%;
      transform:
        translate(-50%, -50%);
      padding:
        18px 30px;
      border:
        2px solid
        rgba(255,255,255,.65);
      border-radius:
        999px;
      background:
        rgba(0,0,0,.82);
      color:
        #fff;
      font:
        800 18px
        system-ui;
      cursor:
        pointer;
      display:
        none;
      z-index:
        5;
    }

    #adm360OpeningPlay.show {
      display: block;
    }

    #adm360OpeningLabel {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform:
        translateX(-50%);
      color: #fff;
      background:
        rgba(0,0,0,.55);
      padding:
        8px 16px;
      border-radius:
        999px;
      font:
        700 12px
        system-ui;
      letter-spacing:
        .08em;
      pointer-events:
        none;
    }


    /* ================================================
       LOCALIZADOR DE ARENAS
    ================================================= */

    #adm360RoomFinder {
      margin-top:
        16px;
      padding-top:
        16px;
      border-top:
        1px solid
        rgba(255,255,255,.12);
    }

    #adm360FindRoomsBtn {
      width:
        100%;
    }

    #adm360RoomFinderResults {
      display:
        grid;
      gap:
        10px;
      margin-top:
        12px;
    }

    .adm360-room-card {
      border:
        1px solid
        rgba(255,255,255,.14);
      border-radius:
        16px;
      padding:
        13px;
      background:
        rgba(255,255,255,.045);
    }

    .adm360-room-card.likely {
      border-color:
        rgba(255,205,64,.85);
      background:
        rgba(255,205,64,.055);
      box-shadow:
        0 0 0 1px
          rgba(255,205,64,.12),
        0 0 24px
          rgba(255,205,64,.12);
    }

    .adm360-room-code {
      display:
        block;
      font-size:
        1.08rem;
      margin-bottom:
        6px;
    }

    .adm360-room-candidate {
      margin-bottom:
        8px;
      color:
        #ffd862;
      font-weight:
        900;
      font-size:
        .83rem;
      letter-spacing:
        .03em;
    }

    .adm360-room-meta {
      opacity:
        .82;
      font-size:
        .91rem;
      line-height:
        1.55;
      margin-bottom:
        11px;
    }

    .adm360-use-room {
      width:
        100%;
    }

    .adm360-room-message {
      border:
        1px solid
        rgba(255,255,255,.14);
      border-radius:
        12px;
      padding:
        11px 12px;
      background:
        rgba(255,255,255,.05);
      line-height:
        1.45;
    }

    .adm360-room-error {
      border-color:
        rgba(255,80,80,.5);
      background:
        rgba(255,80,80,.08);
    }

  `;


  document.head.appendChild(
    style
  );


  overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "adm360OpeningOverlay";


  overlay.innerHTML = `

    <video
      id="adm360OpeningVideo"
      playsinline
      preload="auto"
      src="${VIDEO_SRC}"
    ></video>

    <button
      id="adm360OpeningPlay"
      type="button"
    >
      ▶ INICIAR ABERTURA
    </button>

    <div
      id="adm360OpeningLabel"
    >
      ADM ARENA 360 • ABERTURA OFICIAL
    </div>

  `;


  document.body.appendChild(
    overlay
  );


  video =
    overlay.querySelector(
      "#adm360OpeningVideo"
    );


  playButton =
    overlay.querySelector(
      "#adm360OpeningPlay"
    );


  playButton.addEventListener(

    "click",

    async () => {

      try {

        video.muted =
          false;

        await video.play();


        playButton
          .classList
          .remove(
            "show"
          );


        if (
          overlay.requestFullscreen &&
          !document.fullscreenElement
        ) {

          try {

            await overlay
              .requestFullscreen();

          } catch {}

        }

      } catch {}

    }

  );

}


/* =========================================================
   MOSTRA ABERTURA
========================================================= */

async function showOpening(opening) {

  if (
    !opening?.active ||
    !opening?.nonce
  ) {
    return;
  }


  /*
    A abertura somente poderá ser
    apresentada enquanto a Arena
    não tiver avançado além da
    Rodada 1.
  */

  const currentRound =
    Number(
      latestRoom?.round || 0
    );


  if (
    currentRound > 1
  ) {

    hideOpening();

    return;

  }


  if (
    currentNonce ===
      opening.nonce &&
    overlay?.classList
      .contains("show")
  ) {
    return;
  }


  currentNonce =
    opening.nonce;


  ensureOverlay();


  overlay.classList.add(
    "show"
  );


  playButton
    .classList
    .remove(
      "show"
    );


  try {

    video.pause();

    video.currentTime =
      0;

  } catch {}


  video.muted =
    false;


  try {

    await video.play();

  } catch {


    /*
      Alguns navegadores bloqueiam
      reprodução automática com som.
    */

    try {

      video.muted =
        true;

      await video.play();


      playButton.textContent =
        "🔊 ATIVAR SOM";


      playButton
        .classList
        .add(
          "show"
        );

    } catch {


      playButton.textContent =
        "▶ INICIAR ABERTURA";


      playButton
        .classList
        .add(
          "show"
        );

    }

  }


  video.onended =
    async () => {

      overlay.classList.remove(
        "show"
      );


      if (
        IS_PROFESSOR
      ) {

        await finishOpening();

      }

    };

}


/* =========================================================
   ESCONDE ABERTURA
========================================================= */

function hideOpening() {

  if (!overlay) {
    return;
  }


  overlay.classList.remove(
    "show"
  );


  try {

    video.pause();

  } catch {}

}


/* =========================================================
   PROFESSOR INICIA UMA ARENA NOVA
   PROTEÇÃO ABSOLUTA CONTRA REINÍCIO
========================================================= */

async function startOpening(code) {

  const normalized =
    normalizeCode(code);


  if (!normalized) {

    throw new Error(
      "Código de sala inválido."
    );

  }


  /*
    PRIMEIRO lê a sala.
    Nenhuma escrita é realizada
    antes desta conferência.
  */

  const existingRoom =
    await readRoom(
      normalized
    );


  const currentRound =
    Number(
      existingRoom?.round || 0
    );


  /*
    REGRA PRINCIPAL:
    se a Arena já chegou a qualquer
    rodada, a abertura NÃO pode
    reiniciar a partida.
  */

  if (
    currentRound > 0
  ) {

    throw new Error(

      `Esta Arena já está na Rodada ${currentRound}. ` +
      `A abertura não será executada novamente. ` +
      `Use RETOMAR para continuar a partida.`

    );

  }


  const f =
    await getFirebase();


  if (!f) {

    throw new Error(
      "Firebase indisponível."
    );

  }


  const nonce =
    Date.now();


  const opening = {

    active:
      true,

    nonce,

    startedAt:
      nonce,

    video:
      VIDEO_SRC

  };


  /*
    IMPORTANTE:
    NÃO grava round = 0.
  */

  await f.set(

    f.ref(
      f.db,
      `rooms/${normalized}/opening`
    ),

    opening

  );


  await f.set(

    f.ref(
      f.db,
      `rooms/${normalized}/status`
    ),

    "Abertura cinematográfica"

  );


  return opening;

}


/* =========================================================
   FINAL DA ABERTURA
========================================================= */

async function finishOpening() {

  const code =
    roomCode ||
    detectRoomCode();


  if (!code) {
    return;
  }


  const existingRoom =
    await readRoom(
      code
    );


  const currentRound =
    Number(
      existingRoom?.round || 0
    );


  /*
    Se a Arena já avançou,
    NÃO altera absolutamente
    nenhuma rodada.
  */

  if (
    currentRound > 1
  ) {

    hideOpening();

    return;

  }


  const f =
    await getFirebase();


  if (!f) {
    return;
  }


  await f.set(

    f.ref(
      f.db,
      `rooms/${code}/opening/active`
    ),

    false

  );


  await f.set(

    f.ref(
      f.db,
      `rooms/${code}/opening/finishedAt`
    ),

    Date.now()

  );


  await f.set(

    f.ref(
      f.db,
      `rooms/${code}/status`
    ),

    "Em andamento"

  );


  /*
    SOMENTE uma Arena realmente nova,
    ainda sem rodada iniciada,
    recebe Rodada 1.
  */

  if (
    currentRound <= 0
  ) {

    await f.set(

      f.ref(
        f.db,
        `rooms/${code}/round`
      ),

      1

    );

  }

}


/* =========================================================
   OUVIR SALA
========================================================= */

async function subscribeToRoom(code) {

  const normalized =
    normalizeCode(code);


  if (!normalized) {
    return;
  }


  if (
    normalized === roomCode &&
    unsubscribe
  ) {
    return;
  }


  roomCode =
    normalized;


  localStorage.setItem(
    "adm360:openingRoomCode",
    roomCode
  );


  if (
    unsubscribe
  ) {

    try {

      unsubscribe();

    } catch {}

  }


  const f =
    await getFirebase();


  if (!f) {
    return;
  }


  unsubscribe =
    f.onValue(

      f.ref(
        f.db,
        `rooms/${normalized}`
      ),

      snap => {

        const room =
          snap.val();


        latestRoom =
          room || null;


        const currentRound =
          Number(
            room?.round || 0
          );


        /*
          Não permite que a abertura
          apareça novamente numa Arena
          já avançada.
        */

        if (
          room?.opening?.active &&
          currentRound <= 1
        ) {

          showOpening(
            room.opening
          );

        } else if (
          currentNonce
        ) {

          hideOpening();

        }

      }

    );

}


/* =========================================================
   BOTÃO INICIAR / RETOMAR DO PROFESSOR
========================================================= */

function installProfessorStart() {

  const startBtn =
    document.querySelector(
      "#iniciar"
    );


  if (!startBtn) {
    return;
  }


  startBtn.addEventListener(

    "click",

    async event => {

      const code =
        detectRoomCode();


      if (!code) {
        return;
      }


      /*
        Intercepta o clique para
        impedir que outra lógica
        possa reiniciar a partida.
      */

      event.preventDefault();

      event.stopImmediatePropagation();


      try {

        roomCode =
          code;


        const room =
          await readRoom(
            code
          );


        latestRoom =
          room || null;


        const currentRound =
          Number(
            room?.round || 0
          );


        /*
          ARENA EXISTENTE:
          apenas altera status
          para "Em andamento".
          Rodada, caixa, XP,
          decisões, eventos,
          empresas e progresso
          são preservados.
        */

        if (
          currentRound > 0
        ) {

          const f =
            await getFirebase();


          if (!f) {

            throw new Error(
              "Firebase indisponível."
            );

          }


          await f.set(

            f.ref(
              f.db,
              `rooms/${code}/status`
            ),

            "Em andamento"

          );


          await subscribeToRoom(
            code
          );


          alert(

            `Arena retomada com segurança na Rodada ${currentRound}. ` +
            `Nenhum progresso foi reiniciado.`

          );


          return;

        }


        /*
          ARENA NOVA:
          executa abertura.
        */

        await subscribeToRoom(
          code
        );


        const opening =
          await startOpening(
            code
          );


        await showOpening(
          opening
        );


      } catch (
        error
      ) {

        alert(

          "Erro ao iniciar/retomar a Arena: " +
          error.message

        );

      }

    },

    true

  );

}


/* =========================================================
   CONTAGEM DE EMPRESAS
========================================================= */

function roomCompanyCount(room) {

  const companies =
    room?.companies;


  if (
    Array.isArray(
      companies
    )
  ) {

    return companies
      .filter(Boolean)
      .length;

  }


  if (
    companies &&
    typeof companies === "object"
  ) {

    return Object.keys(
      companies
    ).length;

  }


  return 0;

}


/* =========================================================
   INSTALA LOCALIZADOR NO PAINEL
========================================================= */

function installRoomFinder() {

  if (
    !IS_PROFESSOR
  ) {
    return;
  }


  if (
    document.querySelector(
      "#adm360RoomFinder"
    )
  ) {
    return;
  }


  const accessButton =
    document.querySelector(
      "#acessarSala"
    );


  if (
    !accessButton?.parentElement
  ) {
    return;
  }


  const wrap =
    document.createElement(
      "div"
    );


  wrap.id =
    "adm360RoomFinder";


  wrap.innerHTML = `

    <button
      id="adm360FindRoomsBtn"
      type="button"
      class="btn-access-room"
    >
      🔍 PROCURAR ARENAS SALVAS
    </button>

    <div
      id="adm360RoomFinderResults"
    ></div>

  `;


  accessButton
    .parentElement
    .appendChild(
      wrap
    );


  wrap
    .querySelector(
      "#adm360FindRoomsBtn"
    )
    ?.addEventListener(
      "click",
      findRooms
    );

}


/* =========================================================
   LOCALIZA ARENAS
   SOMENTE LEITURA
========================================================= */

async function findRooms() {

  const results =
    document.querySelector(
      "#adm360RoomFinderResults"
    );


  const button =
    document.querySelector(
      "#adm360FindRoomsBtn"
    );


  if (!results) {
    return;
  }


  results.innerHTML = `

    <div class="adm360-room-message">
      🔎 Consultando Arenas salvas...
    </div>

  `;


  if (button) {
    button.disabled = true;
  }


  try {

    const f =
      await getFirebase();


    if (!f) {

      throw new Error(
        "Firebase indisponível."
      );

    }


    /*
      SOMENTE LEITURA.
      Não existe set(), patch(),
      remove() ou qualquer escrita
      nesta rotina.
    */

    const snap =
      await f.get(

        f.ref(
          f.db,
          "rooms"
        )

      );


    const roomsData =
      snap?.val?.() || {};


    const rooms =
      Object
        .entries(
          roomsData
        )
        .filter(
          ([code]) =>
            /^ADM-\d{4}$/
              .test(code)
        )
        .map(
          ([code, room]) => {

            const round =
              Number(
                room?.round || 0
              );


            const companies =
              roomCompanyCount(
                room
              );


            const status =
              String(
                room?.status ||
                "Sem status"
              );


            const className =

              room?.className ||

              room?.turma ||

              room?.class ||

              "Turma não identificada";


            const paused =
              /paus/i.test(
                status
              );


            /*
              Prioridade para:
              Rodada 4
              + 6 empresas
              + pausada.
            */

            const score =

              (
                round === 4
                  ? 100
                  : 0
              ) +

              (
                companies === 6
                  ? 50
                  : 0
              ) +

              (
                paused
                  ? 25
                  : 0
              );


            return {

              code,

              room,

              round,

              companies,

              status,

              className,

              score,

              likely:
                round === 4 &&
                companies === 6

            };

          }
        )
        .sort(
          (a, b) => {

            if (
              b.score !== a.score
            ) {

              return (
                b.score -
                a.score
              );

            }


            return (
              b.round -
              a.round
            );

          }
        );


    if (
      !rooms.length
    ) {

      results.innerHTML = `

        <div
          class="
            adm360-room-message
            adm360-room-error
          "
        >
          Nenhuma Arena no formato
          <strong>ADM-####</strong>
          foi localizada.
        </div>

      `;


      return;

    }


    results.innerHTML =
      "";


    rooms.forEach(
      item => {

        const card =
          document.createElement(
            "div"
          );


        card.className =

          `adm360-room-card${
            item.likely
              ? " likely"
              : ""
          }`;


        const actionLabel =

          item.likely

            ? "⭐ USAR ESTA"

            : "USAR ESTA SALA";


        card.innerHTML = `

          ${
            item.likely
              ? `
                <div
                  class="adm360-room-candidate"
                >
                  ⭐ CANDIDATA PRINCIPAL:
                  6 EMPRESAS + RODADA 4
                </div>
              `
              : ""
          }

          <strong
            class="adm360-room-code"
          >
            ${item.code}
          </strong>

          <div
            class="adm360-room-meta"
          >

            <div>
              <b>Turma:</b>
              ${item.className}
            </div>

            <div>
              <b>Rodada:</b>
              ${item.round}/16
            </div>

            <div>
              <b>Situação:</b>
              ${item.status}
            </div>

            <div>
              <b>Empresas:</b>
              ${item.companies}
            </div>

          </div>

          <button
            type="button"
            class="
              ghost
              adm360-use-room
            "
          >
            ${actionLabel}
          </button>

        `;


        card
          .querySelector(
            ".adm360-use-room"
          )
          ?.addEventListener(

            "click",

            () => {

              const input =
                document.querySelector(
                  "#codigoExistente"
                );


              const passwordInput =
                document.querySelector(
                  "#senhaExistente"
                );


              /*
                SOMENTE PREENCHE
                O CÓDIGO.

                NÃO entra sem senha.
                NÃO escreve no Firebase.
              */

              if (input) {

                input.value =
                  item.code;

              }


              roomCode =
                item.code;


              localStorage.setItem(

                "adm360:openingRoomCode",

                item.code

              );


              passwordInput
                ?.focus();


              document
                .querySelector(
                  "#acessarSala"
                )
                ?.scrollIntoView({

                  behavior:
                    "smooth",

                  block:
                    "center"

                });

            }

          );


        results.appendChild(
          card
        );

      }
    );


  } catch (
    error
  ) {

    results.innerHTML = `

      <div
        class="
          adm360-room-message
          adm360-room-error
        "
      >
        <strong>
          Não foi possível listar
          as Arenas salvas.
        </strong>

        <br>

        ${
          error?.message ||
          "Erro desconhecido."
        }

        <br><br>

        Nenhum dado da partida
        foi alterado.
      </div>

    `;

  } finally {

    if (button) {
      button.disabled = false;
    }

  }

}


/* =========================================================
   BOTÃO TELÃO / RANKING
========================================================= */

function installRankingButton() {

  if (
    !IS_PROFESSOR ||
    document.querySelector(
      "#abrirRankingSala"
    )
  ) {
    return;
  }


  const startBtn =
    document.querySelector(
      "#iniciar"
    );


  if (
    !startBtn?.parentElement
  ) {
    return;
  }


  const btn =
    document.createElement(
      "button"
    );


  btn.id =
    "abrirRankingSala";


  btn.type =
    "button";


  btn.className =
    startBtn.className;


  btn.textContent =
    "🏆 ABRIR TELÃO / RANKING";


  btn.addEventListener(

    "click",

    () => {

      const code =
        detectRoomCode();


      if (!code) {

        alert(
          "Crie ou acesse uma sala primeiro."
        );

        return;

      }


      window.open(

        `ranking.html?sala=${
          encodeURIComponent(
            code
          )
        }`,

        "_blank",

        "noopener"

      );

    }

  );


  startBtn
    .parentElement
    .appendChild(
      btn
    );

}


/* =========================================================
   INICIAR SISTEMA
========================================================= */

function boot() {

  ensureOverlay();

  installProfessorStart();

  installRankingButton();

  installRoomFinder();


  const scan =
    () => {

      const code =
        detectRoomCode();


      if (code) {

        subscribeToRoom(
          code
        );

      }

    };


  scan();


  setInterval(
    scan,
    500
  );

}


boot();
