import { getFirebase, demoGet, demoSet } from "./firebase-service.js";

const VIDEO_SRC = "media/Arena_ADM_360_Abertura_v5_COMPACTADO.mp4";

const isProfessor =
  document.body.classList.contains("professor-page") ||
  !!document.querySelector("#iniciar");

let subscribedRoom = null;
let unsubscribeOpening = null;
let playingNonce = null;

let overlay = null;
let video = null;
let endingHandled = false;


/* ============================================================
   LOCALIZAR CÓDIGO DA SALA
============================================================ */

function getRoomCodeFromPage() {

  const candidates = [

    document.querySelector("#codigoSala")?.textContent,

    document.querySelector("#salaPill")?.textContent,

    document.querySelector("#codigo")?.value,

    new URLSearchParams(location.search).get("sala")

  ];


  for (const raw of candidates) {

    const match =
      String(raw || "")
        .toUpperCase()
        .match(/ADM-\d{4,}/);

    if (match) {
      return match[0];
    }

  }


  return "";

}


/* ============================================================
   TELA CINEMATOGRÁFICA
============================================================ */

function ensureOverlay() {

  if (overlay) return;


  overlay =
    document.createElement("div");

  overlay.id =
    "arenaOpeningOverlay";


  overlay.innerHTML = `

    <div class="arena-opening-stage">

      <video
        id="arenaOpeningVideo"
        playsinline
        preload="auto"
      >

        <source
          src="${VIDEO_SRC}"
          type="video/mp4"
        >

      </video>


      <div
        class="arena-opening-message"
      >
        ADM ARENA 360 • ABERTURA OFICIAL
      </div>


      <button
        type="button"
        id="arenaOpeningSound"
        class="arena-opening-sound hidden"
      >
        🔊 ATIVAR SOM
      </button>

    </div>

  `;


  document.body.appendChild(
    overlay
  );


  video =
    overlay.querySelector(
      "#arenaOpeningVideo"
    );


  const style =
    document.createElement(
      "style"
    );


  style.textContent = `

    #arenaOpeningOverlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: #000;
      display: none;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    #arenaOpeningOverlay.show {
      display: flex;
    }

    .arena-opening-stage {
      position: absolute;
      inset: 0;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #arenaOpeningVideo {
      width: 100vw;
      height: 100vh;
      object-fit: contain;
      background: #000;
    }

    .arena-opening-message {
      position: absolute;
      left: 50%;
      bottom: 28px;
      transform: translateX(-50%);
      padding: 10px 18px;
      border-radius: 999px;
      background: rgba(0,0,0,.58);
      color: white;
      font: 700 12px/1.2 system-ui;
      letter-spacing: .12em;
      backdrop-filter: blur(8px);
      pointer-events: none;
      white-space: nowrap;
    }

    .arena-opening-sound {
      position: absolute;
      left: 50%;
      bottom: 76px;
      transform: translateX(-50%);
      border: 1px solid rgba(255,255,255,.35);
      background: rgba(0,0,0,.78);
      color: white;
      border-radius: 999px;
      padding: 13px 20px;
      font: 800 13px system-ui;
      cursor: pointer;
    }

    .arena-opening-sound.hidden {
      display: none;
    }

    body.arena-opening-lock {
      overflow: hidden;
    }

  `;


  document.head.appendChild(
    style
  );


  overlay
    .querySelector(
      "#arenaOpeningSound"
    )
    ?.addEventListener(

      "click",

      async () => {

        try {

          video.muted =
            false;

          await video.play();


          overlay
            .querySelector(
              "#arenaOpeningSound"
            )
            ?.classList.add(
              "hidden"
            );

        } catch {}

      }

    );

}


/* ============================================================
   EXIBIR ABERTURA
============================================================ */

async function showOpening(
  opening
) {

  if (
    !opening?.active ||
    !opening?.nonce
  ) {
    return;
  }


  if (
    playingNonce ===
    opening.nonce
  ) {
    return;
  }


  playingNonce =
    opening.nonce;

  endingHandled =
    false;


  ensureOverlay();


  overlay.classList.add(
    "show"
  );


  document.body.classList.add(
    "arena-opening-lock"
  );


  video.currentTime =
    0;

  video.muted =
    false;


  const soundBtn =
    overlay.querySelector(
      "#arenaOpeningSound"
    );


  soundBtn?.classList.add(
    "hidden"
  );


  /*
    Tenta tocar com som.

    Em alguns celulares/Chromebooks,
    o navegador pode bloquear áudio
    iniciado remotamente.

    Nesse caso:
    - vídeo continua;
    - aparece botão ATIVAR SOM.
  */

  try {

    await video.play();

  } catch {

    video.muted =
      true;


    try {

      await video.play();


      soundBtn
        ?.classList.remove(
          "hidden"
        );

    } catch {}

  }


  /*
    Tenta tela cheia.
  */

  if (
    overlay.requestFullscreen &&
    !document.fullscreenElement
  ) {

    try {

      await overlay
        .requestFullscreen();

    } catch {}

  }


  video.onended =
    async () => {

      hideOpening();


      /*
        Somente o professor encerra
        oficialmente a abertura
        e libera a Rodada 1.
      */

      if (
        isProfessor &&
        !endingHandled
      ) {

        endingHandled =
          true;


        await finishOpening();

      }

    };

}


/* ============================================================
   FECHAR TELA DO VÍDEO
============================================================ */

function hideOpening() {

  if (!overlay) return;


  overlay.classList.remove(
    "show"
  );


  document.body.classList.remove(
    "arena-opening-lock"
  );


  if (
    document.fullscreenElement
  ) {

    document
      .exitFullscreen?.()
      .catch?.(
        () => {}
      );

  }

}


/* ============================================================
   PROFESSOR DISPARA ABERTURA
============================================================ */

async function writeOpeningStart(
  code
) {

  const f =
    await getFirebase();


  const nonce =
    Date.now();


  const payload = {

    active:
      true,

    nonce,

    startedAt:
      nonce,

    video:
      VIDEO_SRC

  };


  if (f) {

    await f.set(

      f.ref(
        f.db,
        `rooms/${code}/opening`
      ),

      payload

    );


    await f.set(

      f.ref(
        f.db,
        `rooms/${code}/status`
      ),

      "Abertura cinematográfica"

    );


    await f.set(

      f.ref(
        f.db,
        `rooms/${code}/round`
      ),

      0

    );

  } else {

    const room =
      demoGet(
        `room:${code}`,
        null
      );


    if (!room) {

      throw new Error(
        "Sala não encontrada."
      );

    }


    room.opening =
      payload;


    room.status =
      "Abertura cinematográfica";


    room.round =
      0;


    demoSet(
      `room:${code}`,
      room
    );

  }


  return payload;

}


/* ============================================================
   FINAL DO VÍDEO → LIBERAR RODADA 1
============================================================ */

async function finishOpening() {

  const code =
    getRoomCodeFromPage();


  if (!code) return;


  const f =
    await getFirebase();


  const finishedAt =
    Date.now();


  if (f) {

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

      finishedAt

    );


    await f.set(

      f.ref(
        f.db,
        `rooms/${code}/status`
      ),

      "Em andamento"

    );


    await f.set(

      f.ref(
        f.db,
        `rooms/${code}/round`
      ),

      1

    );


    await f.set(

      f.ref(
        f.db,
        `rooms/${code}/currentEvent`
      ),

      null

    );

  } else {

    const room =
      demoGet(
        `room:${code}`,
        null
      );


    if (!room) return;


    room.opening = {

      ...(room.opening || {}),

      active:
        false,

      finishedAt

    };


    room.status =
      "Em andamento";


    room.round =
      1;


    room.currentEvent =
      null;


    demoSet(
      `room:${code}`,
      room
    );

  }

}


/* ============================================================
   OUVIR ABERTURA NO FIREBASE
============================================================ */

async function subscribeOpening(
  code
) {

  if (
    !code ||
    subscribedRoom === code
  ) {
    return;
  }


  subscribedRoom =
    code;


  if (
    unsubscribeOpening
  ) {

    try {

      unsubscribeOpening();

    } catch {}


    unsubscribeOpening =
      null;

  }


  const f =
    await getFirebase();


  if (f) {

    unsubscribeOpening =
      f.onValue(

        f.ref(
          f.db,
          `rooms/${code}/opening`
        ),

        snapshot => {

          const opening =
            snapshot.val();


          if (
            opening?.active
          ) {

            showOpening(
              opening
            );

          } else if (
            playingNonce &&
            opening &&
            opening.active === false
          ) {

            hideOpening();

          }

        }

      );

  } else {

    const timer =
      setInterval(

        () => {

          const room =
            demoGet(
              `room:${code}`,
              null
            );


          const opening =
            room?.opening;


          if (
            opening?.active
          ) {

            showOpening(
              opening
            );

          } else if (
            playingNonce &&
            opening &&
            opening.active === false
          ) {

            hideOpening();

          }

        },

        600

      );


    unsubscribeOpening =
      () =>
        clearInterval(
          timer
        );

  }

}


/* ============================================================
   CONTROLES DO PROFESSOR
============================================================ */

function installProfessorControls() {

  const startBtn =
    document.querySelector(
      "#iniciar"
    );


  if (!startBtn) return;


  /*
    CAPTURE = TRUE

    Intercepta o botão INICIAR
    antes do professor.js atual.

    Assim não precisamos destruir
    nem substituir o código já
    testado da Arena.
  */

  startBtn.addEventListener(

    "click",

    async event => {

      const code =
        getRoomCodeFromPage();


      if (
        !code ||
        code === "ADM-0000"
      ) {

        return;

      }


      event.preventDefault();

      event.stopImmediatePropagation();


      startBtn.disabled =
        true;


      const oldText =
        startBtn.textContent;


      startBtn.textContent =
        "🎬 INICIANDO ABERTURA...";


      try {

        const opening =
          await writeOpeningStart(
            code
          );


        await subscribeOpening(
          code
        );


        await showOpening(
          opening
        );

      } catch (error) {

        alert(
          `Não foi possível iniciar a abertura: ${error.message}`
        );

      } finally {

        startBtn.disabled =
          false;


        startBtn.textContent =
          oldText;

      }

    },

    true

  );


  /*
    BOTÃO AUTOMÁTICO:
    TELÃO / RANKING
  */

  const controlGrid =
    document.querySelector(
      ".control-grid"
    );


  if (
    controlGrid &&
    !document.querySelector(
      "#abrirRankingSala"
    )
  ) {

    const btn =
      document.createElement(
        "button"
      );


    btn.id =
      "abrirRankingSala";


    btn.type =
      "button";


    btn.className =
      "control-btn";


    btn.textContent =
      "🏆 ABRIR TELÃO / RANKING";


    btn.addEventListener(

      "click",

      () => {

        const code =
          getRoomCodeFromPage();


        if (
          !code ||
          code === "ADM-0000"
        ) {

          alert(
            "Crie ou acesse uma sala primeiro."
          );

          return;

        }


        window.open(

          `ranking.html?sala=${encodeURIComponent(code)}`,

          "_blank",

          "noopener"

        );

      }

    );


    controlGrid.appendChild(
      btn
    );

  }

}


/* ============================================================
   INICIALIZAÇÃO
============================================================ */

async function boot() {

  ensureOverlay();


  if (isProfessor) {

    installProfessorControls();

  }


  /*
    Tanto Professor como Empresa
    procuram automaticamente
    o código da sala.

    Quando encontram:
    passam a ouvir o sinal
    da abertura no Firebase.
  */

  setInterval(

    () => {

      const code =
        getRoomCodeFromPage();


      if (
        code &&
        code !== "ADM-0000"
      ) {

        subscribeOpening(
          code
        );

      }

    },

    800

  );

}


boot();
