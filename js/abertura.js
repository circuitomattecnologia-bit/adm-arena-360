import { getFirebase } from "./firebase-service.js";

const VIDEO_SRC = "./media/Arena_ADM_360_Abertura_v5_COMPACTADO.mp4";

const IS_PROFESSOR =
  !!document.querySelector("#iniciar");

let roomCode = "";
let unsubscribe = null;
let currentNonce = null;

let overlay = null;
let video = null;
let playButton = null;


/* =========================================================
   LOCALIZA A SALA DE QUALQUER FORMA
========================================================= */

function normalizeCode(value) {

  const match =
    String(value || "")
      .toUpperCase()
      .match(/ADM-\d{4,}/);

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
      transform: translate(
        -50%,
        -50%
      );
      padding: 18px 30px;
      border: 2px solid
        rgba(
          255,
          255,
          255,
          .65
        );
      border-radius: 999px;
      background:
        rgba(
          0,
          0,
          0,
          .82
        );
      color: #fff;
      font:
        800 18px
        system-ui;
      cursor: pointer;
      display: none;
      z-index: 5;
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
        rgba(
          0,
          0,
          0,
          .55
        );
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
      Chromebook/Chrome pode
      bloquear som automático.

      Tenta vídeo mudo.
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


      /*
        Se bloquear até o vídeo,
        aparece botão.
      */

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
   PROFESSOR INICIA
========================================================= */

async function startOpening(
  code
) {

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


  await f.set(

    f.ref(
      f.db,
      `rooms/${code}/opening`
    ),

    opening

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


  return opening;

}


/* =========================================================
   FINAL DO VÍDEO → RODADA 1
========================================================= */

async function finishOpening() {

  const code =
    roomCode ||
    detectRoomCode();


  if (!code) {
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

}


/* =========================================================
   OUVIR A SALA INTEIRA
========================================================= */

async function subscribeToRoom(
  code
) {

  if (
    !code ||
    code === roomCode
  ) {
    return;
  }


  roomCode =
    code;


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
        `rooms/${code}`
      ),

      snap => {

        const room =
          snap.val();


        if (
          room?.opening?.active
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
   BOTÃO INICIAR DO PROFESSOR
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


      event.preventDefault();

      event.stopImmediatePropagation();


      try {

        roomCode =
          code;


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
          "Erro ao iniciar a abertura: " +
          error.message
        );

      }

    },

    true

  );

}


/* =========================================================
   BOTÃO RANKING
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

        `ranking.html?sala=${encodeURIComponent(code)}`,

        "_blank",

        "noopener"

      );

    }

  );


  startBtn.parentElement
    .appendChild(
      btn
    );

}


/* =========================================================
   INICIAR
========================================================= */

function boot() {

  ensureOverlay();


  installProfessorStart();

  installRankingButton();


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
    400
  );

}


boot();
