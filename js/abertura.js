import { getFirebase } from "./firebase-service.js";

const VIDEO_SRC =
  "./media/Arena_ADM_360_Abertura_v5_COMPACTADO.mp4";

const VIDEO_FASE2_SRC =
  "./media/ARENA_ADM_360_R11-R20_IMPACTO_CINEMATOGRAFICO_V3 (2).mp4";

const IS_PROFESSOR =
  !!document.querySelector("#iniciar");

const IS_EMPRESA =
  !!document.querySelector("#nomeEmpresa");
const IS_RANKING =
  !!document.querySelector("#ranking");
let roomCode = "";
let unsubscribe = null;
let currentNonce = null;
let latestRoom = null;

let overlay = null;
let video = null;
let playButton = null;


/* =========================================================
   ADM ARENA 360
   ABERTURA + RETOMADA SEGURA
   LOCALIZADOR DE ARENAS
   GESTÃO DE COMPONENTES
========================================================= */


/* =========================================================
   UTILIDADES
========================================================= */

function snapshotValue(snap) {

  return (
    snap &&
    typeof snap.val === "function"
  )
    ? snap.val()
    : snap;

}


function normalizeCode(value) {

  const match =
    String(value || "")
      .toUpperCase()
      .match(/\bADM-\d{4}\b/);

  if (!match) {
    return "";
  }

  if (match[0] === "ADM-0000") {
    return "";
  }

  return match[0];

}


function normalizeName(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );

}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function detectRoomCode() {

  const url =
    new URL(location.href);

  const candidates = [

    url.searchParams.get("sala"),

    url.searchParams.get("room"),

    url.searchParams.get("codigo"),

    document.querySelector(
      "#codigo"
    )?.value,

    document.querySelector(
      "#codigoExistente"
    )?.value,

    document.querySelector(
      "#salaPill"
    )?.textContent,

    document.querySelector(
      "#salaCodigo"
    )?.textContent

  ];


  const codigoWrap =
    document.querySelector(
      "#codigoWrap"
    );

  const codigoSala =
    document.querySelector(
      "#codigoSala"
    );


  if (
    codigoSala &&
    (
      !codigoWrap ||
      !codigoWrap.classList.contains(
        "hidden"
      )
    )
  ) {

    candidates.push(
      codigoSala.value
    );

    candidates.push(
      codigoSala.textContent
    );

  }


  for (
    const item
    of candidates
  ) {

    const code =
      normalizeCode(item);

    if (code) {

      localStorage.setItem(
        "adm360:openingRoomCode",
        code
      );

      localStorage.setItem(
        "admArena360Room",
        code
      );

      return code;

    }

  }


  const storageCandidates = [

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
    const item
    of storageCandidates
  ) {

    const code =
      normalizeCode(item);

    if (code) {
      return code;
    }

  }


  return "";

}


/* =========================================================
   FIREBASE
========================================================= */

async function getFirebaseSafe() {

  const f =
    await getFirebase();

  if (!f) {

    throw new Error(
      "Firebase indisponível."
    );

  }

  return f;

}


async function readRoom(code) {

  const normalized =
    normalizeCode(code);

  if (!normalized) {
    return null;
  }


  const f =
    await getFirebaseSafe();


  const snap =
    await f.get(

      f.ref(
        f.db,
        `rooms/${normalized}`
      )

    );


  return (
    snapshotValue(snap) ||
    null
  );

}


/* =========================================================
   TELA PRETA + VÍDEO
========================================================= */

function ensureOverlay() {

  if (overlay) {
    return overlay;
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
      color: #fff;
      font:
        800 18px system-ui;
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
        rgba(0,0,0,.55);
      padding:
        8px 16px;
      border-radius:
        999px;
      font:
        700 12px system-ui;
      letter-spacing:
        .08em;
      pointer-events: none;
    }


    /* =============================================
       LOCALIZADOR
    ============================================= */

    #adm360RoomFinder {
      margin-top: 16px;
      padding-top: 16px;
      border-top:
        1px solid
        rgba(255,255,255,.12);
    }

    #adm360FindRoomsBtn {
      width: 100%;
    }

    #adm360RoomFinderResults {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }

    .adm360-room-card {
      border:
        1px solid
        rgba(255,255,255,.14);
      border-radius: 16px;
      padding: 13px;
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
      display: block;
      font-size: 1.08rem;
      margin-bottom: 6px;
    }

    .adm360-room-candidate {
      margin-bottom: 8px;
      color: #ffd862;
      font-weight: 900;
      font-size: .83rem;
    }

    .adm360-room-meta {
      opacity: .86;
      font-size: .91rem;
      line-height: 1.55;
      margin-bottom: 11px;
    }

    .adm360-use-room {
      width: 100%;
    }

    .adm360-room-message {
      border:
        1px solid
        rgba(255,255,255,.14);
      border-radius: 12px;
      padding: 11px 12px;
      background:
        rgba(255,255,255,.05);
    }

    .adm360-room-error {
      border-color:
        rgba(255,80,80,.5);
      background:
        rgba(255,80,80,.08);
    }


    /* =============================================
       GESTÃO DE COMPONENTES
    ============================================= */

    #adm360StudentComponents,
    #adm360ProfessorComponents {
      margin-top: 18px;
      border:
        1px solid
        rgba(68,220,255,.25);
      border-radius: 20px;
      padding: 18px;
      background:
        linear-gradient(
          135deg,
          rgba(15,38,72,.88),
          rgba(19,25,48,.92)
        );
      box-shadow:
        0 18px 50px
        rgba(0,0,0,.16);
    }

    .adm360-components-head {
      display: flex;
      align-items: center;
      justify-content:
        space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    .adm360-components-head h3 {
      margin: 0;
      font-size: 1.15rem;
    }

    .adm360-components-eyebrow {
      color: #4de2ff;
      font-weight: 900;
      font-size: .76rem;
      letter-spacing: .08em;
      margin-bottom: 4px;
    }

    .adm360-members-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin:
        10px 0 14px;
    }

    .adm360-member-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border:
        1px solid
        rgba(255,255,255,.14);
      background:
        rgba(255,255,255,.06);
      padding:
        8px 11px;
      border-radius: 999px;
      font-size: .88rem;
    }

    .adm360-add-member-form {
      display: none;
      gap: 8px;
      margin-top: 12px;
    }

    .adm360-add-member-form.show {
      display: grid;
    }

    .adm360-add-member-form input {
      width: 100%;
    }

    .adm360-components-status {
      margin-top: 10px;
      font-size: .88rem;
      opacity: .88;
    }

    .adm360-pending-member {
      margin-top: 10px;
      padding: 10px 12px;
      border:
        1px solid
        rgba(255,204,70,.32);
      border-radius: 12px;
      background:
        rgba(255,204,70,.07);
      color: #ffe18a;
    }

    .adm360-company-admin {
      margin-top: 12px;
      border:
        1px solid
        rgba(255,255,255,.10);
      border-radius: 15px;
      padding: 14px;
      background:
        rgba(255,255,255,.035);
    }

    .adm360-company-admin-title {
      font-weight: 900;
      margin-bottom: 9px;
    }

    .adm360-member-admin-row {
      display: flex;
      align-items: center;
      justify-content:
        space-between;
      gap: 8px;
      border-top:
        1px solid
        rgba(255,255,255,.07);
      padding:
        8px 0;
    }

    .adm360-member-admin-row:first-of-type {
      border-top: 0;
    }

    .adm360-member-remove {
      border:
        1px solid
        rgba(255,90,110,.45);
      background:
        rgba(255,90,110,.10);
      color: #ffb6c1;
      border-radius: 9px;
      padding: 6px 9px;
      cursor: pointer;
    }

    .adm360-component-request {
      margin-top: 10px;
      padding: 13px;
      border:
        1px solid
        rgba(255,205,75,.35);
      border-radius: 14px;
      background:
        rgba(255,205,75,.07);
    }

    .adm360-component-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .adm360-component-actions button {
      flex: 1 1 160px;
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

        video.muted = false;

        await video.play();

        playButton
          .classList
          .remove("show");


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


  return overlay;

}


/* =========================================================
   ABERTURA
========================================================= */

async function showOpening(opening) {

  if (
    !opening?.active ||
    !opening?.nonce
  ) {
    return;
  }
  const isPhase2 =
    opening?.phase === 2;

  if (video) {
    video.src =
      isPhase2
        ? VIDEO_FASE2_SRC
        : VIDEO_SRC;
  }

  const currentRound =
    Number(
      latestRoom?.round || 0
    );


    if (
    currentRound > 1 &&
    !isPhase2
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
    .remove("show");


  try {

    video.pause();
    video.currentTime = 0;

  } catch {}


  video.muted = false;


  try {

    await video.play();

  } catch {

    try {

      video.muted = true;

      await video.play();

      playButton.textContent =
        "🔊 ATIVAR SOM";

      playButton
        .classList
        .add("show");

    } catch {

      playButton.textContent =
        "▶ INICIAR ABERTURA";

      playButton
        .classList
        .add("show");

    }

  }


  video.onended =
    async () => {

      overlay
        .classList
        .remove("show");


      if (IS_PROFESSOR) {

        await finishOpening();

      }

    };

}


function hideOpening() {

  if (!overlay) {
    return;
  }


  overlay
    .classList
    .remove("show");


  try {

    video.pause();

  } catch {}

}


/* =========================================================
   INÍCIO SEGURO
========================================================= */

async function startOpening(code) {

  const normalized =
    normalizeCode(code);


  if (!normalized) {

    throw new Error(
      "Código de sala inválido."
    );

  }


  const existingRoom =
    await readRoom(
      normalized
    );


  const currentRound =
    Number(
      existingRoom?.round || 0
    );


  if (currentRound > 0) {

    throw new Error(

      `Esta Arena já está na Rodada ${currentRound}. ` +
      `A abertura não será executada novamente.`

    );

  }


  const f =
    await getFirebaseSafe();


  const nonce =
    Date.now();


  const opening = {

    active: true,

    nonce,

    startedAt: nonce,

    video: VIDEO_SRC

  };


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
    await readRoom(code);

  const currentRound =
    Number(
      existingRoom?.round || 0
    );

  const isPhase2 =
    existingRoom?.opening?.phase === 2;

  if (
    currentRound > 1 &&
    !isPhase2
  ) {
    hideOpening();
    return;
  }


  const f =
    await getFirebaseSafe();


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


  if (currentRound <= 0) {

    await f.set(

      f.ref(
        f.db,
        `rooms/${code}/round`
      ),

      1

    );

  }


  hideOpening();

}


/* =========================================================
   COMPONENTES — UTILIDADES
========================================================= */

function componentsArray(targetCompany) {

  if (!targetCompany) {
    return [];
  }


  const raw =

    targetCompany.components ??

    targetCompany.componentes ??

    targetCompany.members ??

    [];


  if (Array.isArray(raw)) {

    return raw
      .map(
        item =>
          String(item || "")
            .trim()
      )
      .filter(Boolean);

  }


  return String(raw || "")
    .split(/[,;\n•]+/)
    .map(
      item =>
        item.trim()
    )
    .filter(Boolean);

}


function uniqueComponents(list) {

  const result = [];

  const used =
    new Set();


  for (
    const item
    of list || []
  ) {

    const name =
      String(item || "")
        .trim();

    const key =
      normalizeName(name);


    if (
      !name ||
      !key ||
      used.has(key)
    ) {
      continue;
    }


    used.add(key);

    result.push(name);

  }


  return result;

}


function companyEntries(room) {

  return Object.entries(
    room?.companies || {}
  );

}


function findStudentCompany(room) {

  const visibleName =

    document.querySelector(
      "#empresaNome"
    )?.textContent?.trim() ||

    document.querySelector(
      "#nomeEmpresa"
    )?.value?.trim() ||

    "";


  const normalized =
    normalizeName(
      visibleName
    );


  if (
    !normalized ||
    normalized === "-"
  ) {
    return null;
  }


  const match =
    companyEntries(room)
      .find(
        ([, company]) =>
          normalizeName(
            company?.name
          ) === normalized
      );


  if (!match) {
    return null;
  }


  return {

    id:
      match[0],

    company:
      match[1]

  };

}


function componentRequests(room) {

  return Object.entries(
    room?.componentRequests || {}
  );

}


/* =========================================================
   COMPONENTES — EMPRESA
========================================================= */

function installStudentComponents() {

  if (
    !IS_EMPRESA ||
    document.querySelector(
      "#adm360StudentComponents"
    )
  ) {
    return;
  }


  const game =
    document.querySelector(
      "#jogo"
    );


  if (!game) {
    return;
  }


  const box =
    document.createElement(
      "section"
    );


  box.id =
    "adm360StudentComponents";


  box.innerHTML = `

    <div
      class="adm360-components-head"
    >

      <div>

        <div
          class="adm360-components-eyebrow"
        >
          EQUIPE DA EMPRESA
        </div>

        <h3>
          👥 COMPONENTES DA EMPRESA
        </h3>

      </div>

      <button
        type="button"
        id="adm360ShowMemberForm"
        class="ghost"
      >
        ➕ INCLUIR COMPONENTE
      </button>

    </div>


    <div
      id="adm360StudentMembers"
      class="adm360-members-list"
    ></div>


    <div
      id="adm360AddMemberForm"
      class="adm360-add-member-form"
    >

      <input
        id="adm360NewMemberName"
        type="text"
        autocomplete="off"
        placeholder="Nome do novo estudante"
      >

      <button
        type="button"
        id="adm360SendMemberRequest"
      >
        📤 ENVIAR SOLICITAÇÃO
      </button>

      <button
        type="button"
        id="adm360CancelMemberRequest"
        class="ghost"
      >
        CANCELAR
      </button>

    </div>


    <div
      id="adm360StudentComponentStatus"
      class="adm360-components-status"
    ></div>

  `;


  const header =
    game.querySelector(
      ".company-header"
    );


  if (header) {

    header.insertAdjacentElement(
      "afterend",
      box
    );

  } else {

    game.prepend(box);

  }


  box
    .querySelector(
      "#adm360ShowMemberForm"
    )
    ?.addEventListener(

      "click",

      () => {

        box
          .querySelector(
            "#adm360AddMemberForm"
          )
          ?.classList
          .toggle("show");

        box
          .querySelector(
            "#adm360NewMemberName"
          )
          ?.focus();

      }

    );


  box
    .querySelector(
      "#adm360CancelMemberRequest"
    )
    ?.addEventListener(

      "click",

      () => {

        box
          .querySelector(
            "#adm360AddMemberForm"
          )
          ?.classList
          .remove("show");

      }

    );


  box
    .querySelector(
      "#adm360SendMemberRequest"
    )
    ?.addEventListener(

      "click",

      sendComponentRequest

    );

}


function renderStudentComponents() {

  if (!IS_EMPRESA) {
    return;
  }


  installStudentComponents();


  const membersBox =
    document.querySelector(
      "#adm360StudentMembers"
    );


  const statusBox =
    document.querySelector(
      "#adm360StudentComponentStatus"
    );


  const addButton =
    document.querySelector(
      "#adm360ShowMemberForm"
    );


  if (
    !membersBox ||
    !statusBox
  ) {
    return;
  }


  const match =
    findStudentCompany(
      latestRoom
    );


  if (!match) {

    membersBox.innerHTML = "";

    statusBox.textContent =
      "Entre na empresa para visualizar a equipe.";

    return;

  }


  const members =
    uniqueComponents(
      componentsArray(
        match.company
      )
    );


  membersBox.innerHTML =

    members.length

      ? members
          .map(
            name => `

              <span
                class="adm360-member-pill"
              >
                👤 ${escapeHtml(name)}
              </span>

            `
          )
          .join("")

      : `

          <span
            class="adm360-member-pill"
          >
            Nenhum componente informado
          </span>

        `;


  const requests =
    componentRequests(
      latestRoom
    )
      .filter(
        ([, request]) =>
          request?.companyId ===
            match.id &&
          request?.status ===
            "pending"
      );


  if (requests.length) {

    statusBox.innerHTML =

      requests
        .map(
          ([, request]) => `

            <div
              class="adm360-pending-member"
            >
              ⏳ Inclusão de
              <strong>
                ${escapeHtml(
                  request.componentName
                )}
              </strong>
              aguardando aprovação
              do professor.
            </div>

          `
        )
        .join("");

  } else {

    statusBox.textContent =
      "Para acrescentar outro estudante, envie uma solicitação ao professor.";

  }


  if (addButton) {

    addButton.disabled =
      latestRoom?.status ===
      "Pausado";

    addButton.title =
      latestRoom?.status ===
      "Pausado"
        ? "A Arena está pausada."
        : "";

  }

}


async function sendComponentRequest() {

  const code =
    roomCode ||
    detectRoomCode();


  if (!code) {

    alert(
      "Sala não identificada."
    );

    return;

  }


  const freshRoom =
    await readRoom(code);


  if (!freshRoom) {

    alert(
      "Sala não encontrada."
    );

    return;

  }


  if (
    freshRoom.status ===
    "Pausado"
  ) {

    alert(
      "A Arena está pausada. A inclusão poderá ser solicitada quando a partida for retomada."
    );

    return;

  }


  const match =
    findStudentCompany(
      freshRoom
    );


  if (!match) {

    alert(
      "Empresa não identificada."
    );

    return;

  }


  const input =
    document.querySelector(
      "#adm360NewMemberName"
    );


  const componentName =
    String(
      input?.value || ""
    )
      .trim();


  if (
    componentName.length < 2
  ) {

    alert(
      "Informe o nome do estudante."
    );

    input?.focus();

    return;

  }


  const existingMembers =
    uniqueComponents(
      componentsArray(
        match.company
      )
    );


  const alreadyExists =
    existingMembers
      .some(
        item =>
          normalizeName(item) ===
          normalizeName(
            componentName
          )
      );


  if (alreadyExists) {

    alert(
      "Esse estudante já está cadastrado nesta empresa."
    );

    return;

  }


  const duplicatePending =
    componentRequests(
      freshRoom
    )
      .some(
        ([, request]) =>

          request?.companyId ===
            match.id &&

          request?.status ===
            "pending" &&

          normalizeName(
            request.componentName
          ) ===
          normalizeName(
            componentName
          )

      );


  if (duplicatePending) {

    alert(
      "Já existe uma solicitação pendente para esse estudante."
    );

    return;

  }


  const requestId =
    `component-${match.id}-${Date.now()}`;


  const request = {

    id:
      requestId,

    companyId:
      match.id,

    companyName:
      match.company?.name ||
      match.id,

    componentName,

    status:
      "pending",

    requestedAt:
      Date.now(),

    requestedRound:
      Number(
        freshRoom.round || 0
      ),

    requestedBy:
      "empresa"

  };


  const f =
    await getFirebaseSafe();


  await f.set(

    f.ref(
      f.db,
      `rooms/${code}/componentRequests/${requestId}`
    ),

    request

  );


  if (input) {
    input.value = "";
  }


  document
    .querySelector(
      "#adm360AddMemberForm"
    )
    ?.classList
    .remove("show");


  alert(
    `Solicitação enviada ao professor para incluir ${componentName}.`
  );

}


/* =========================================================
   COMPONENTES — PROFESSOR
========================================================= */

function installProfessorComponents() {

  if (
    !IS_PROFESSOR ||
    document.querySelector(
      "#adm360ProfessorComponents"
    )
  ) {
    return;
  }


  const main =
    document.querySelector(
      "main"
    ) ||
    document.querySelector(
      ".shell"
    ) ||
    document.body;


  const box =
    document.createElement(
      "section"
    );


  box.id =
    "adm360ProfessorComponents";


  box.className =
    "card glass";


  box.innerHTML = `

    <div
      class="adm360-components-head"
    >

      <div>

        <div
          class="adm360-components-eyebrow"
        >
          GESTÃO DAS EQUIPES
        </div>

        <h3>
          👥 COMPONENTES DAS EMPRESAS
        </h3>

      </div>

      <span>
        Inclusões e ajustes sem alterar
        o progresso da empresa
      </span>

    </div>


    <div
      id="adm360ProfessorComponentRequests"
    ></div>


    <div
      id="adm360ProfessorCompanies"
    ></div>

  `;


  main.appendChild(
    box
  );

}


function renderProfessorComponents() {

  if (!IS_PROFESSOR) {
    return;
  }


  installProfessorComponents();


  const requestsBox =
    document.querySelector(
      "#adm360ProfessorComponentRequests"
    );


  const companiesBox =
    document.querySelector(
      "#adm360ProfessorCompanies"
    );


  if (
    !requestsBox ||
    !companiesBox
  ) {
    return;
  }


  if (
    !latestRoom ||
    !roomCode
  ) {

    requestsBox.innerHTML = `

      <div
        class="adm360-room-message"
      >
        Acesse uma Arena para
        administrar os componentes.
      </div>

    `;

    companiesBox.innerHTML = "";

    return;

  }


  const pending =
    componentRequests(
      latestRoom
    )
      .filter(
        ([, request]) =>
          request?.status ===
          "pending"
      )
      .sort(
        (a, b) =>
          Number(
            a[1]?.requestedAt || 0
          ) -
          Number(
            b[1]?.requestedAt || 0
          )
      );


  if (pending.length) {

    requestsBox.innerHTML = `

      <div
        class="adm360-components-eyebrow"
      >
        SOLICITAÇÕES PENDENTES
      </div>

      ${
        pending
          .map(
            ([requestId, request]) => `

              <div
                class="adm360-component-request"
              >

                <strong>
                  🏢 ${escapeHtml(
                    request.companyName
                  )}
                </strong>

                <div>
                  👤 Novo componente:
                  <strong>
                    ${escapeHtml(
                      request.componentName
                    )}
                  </strong>
                </div>

                <small>
                  Solicitação feita na
                  Rodada
                  ${
                    Number(
                      request.requestedRound ||
                      latestRoom.round ||
                      0
                    )
                  }
                </small>

                <div
                  class="adm360-component-actions"
                >

                  <button
                    type="button"
                    class="adm360ApproveComponent"
                    data-request-id="${escapeHtml(
                      requestId
                    )}"
                  >
                    ✅ APROVAR
                  </button>

                  <button
                    type="button"
                    class="adm360DenyComponent ghost"
                    data-request-id="${escapeHtml(
                      requestId
                    )}"
                  >
                    ❌ NEGAR
                  </button>

                </div>

              </div>

            `
          )
          .join("")
      }

    `;

  } else {

    requestsBox.innerHTML = `

      <div
        class="adm360-room-message"
      >
        ✅ Nenhuma solicitação
        de inclusão pendente.
      </div>

    `;

  }


  requestsBox
    .querySelectorAll(
      ".adm360ApproveComponent"
    )
    .forEach(
      button => {

        button.onclick =
          () =>
            respondComponentRequest(
              button.dataset.requestId,
              true
            );

      }
    );


  requestsBox
    .querySelectorAll(
      ".adm360DenyComponent"
    )
    .forEach(
      button => {

        button.onclick =
          () =>
            respondComponentRequest(
              button.dataset.requestId,
              false
            );

      }
    );


  const entries =
    companyEntries(
      latestRoom
    );


  companiesBox.innerHTML = `

    <div
      class="adm360-components-eyebrow"
      style="margin-top:18px"
    >
      EMPRESAS E COMPONENTES
    </div>

    ${
      entries.length

        ? entries
            .map(
              ([companyId, company]) => {

                const members =
                  uniqueComponents(
                    componentsArray(
                      company
                    )
                  );


                return `

                  <div
                    class="adm360-company-admin"
                  >

                    <div
                      class="adm360-company-admin-title"
                    >
                      🏢 ${escapeHtml(
                        company?.name ||
                        companyId
                      )}
                    </div>

                    ${
                      members.length

                        ? members
                            .map(
                              member => `

                                <div
                                  class="adm360-member-admin-row"
                                >

                                  <span>
                                    👤 ${escapeHtml(member)}
                                  </span>

                                  <button
                                    type="button"
                                    class="adm360-member-remove"
                                    data-company-id="${escapeHtml(
                                      companyId
                                    )}"
                                    data-member="${escapeHtml(
                                      member
                                    )}"
                                  >
                                    RETIRAR
                                  </button>

                                </div>

                              `
                            )
                            .join("")

                        : `

                            <div
                              class="adm360-components-status"
                            >
                              Nenhum componente
                              informado.
                            </div>

                          `
                    }

                    <div
                      class="adm360-component-actions"
                    >

                      <button
                        type="button"
                        class="adm360ProfessorAddMember ghost"
                        data-company-id="${escapeHtml(
                          companyId
                        )}"
                      >
                        ➕ INCLUIR COMPONENTE
                      </button>

                    </div>

                  </div>

                `;

              }
            )
            .join("")

        : `

            <div
              class="adm360-room-message"
            >
              Nenhuma empresa cadastrada.
            </div>

          `
    }

  `;


  companiesBox
    .querySelectorAll(
      ".adm360ProfessorAddMember"
    )
    .forEach(
      button => {

        button.onclick =
          () =>
            professorAddComponent(
              button.dataset.companyId
            );

      }
    );


  companiesBox
    .querySelectorAll(
      ".adm360-member-remove"
    )
    .forEach(
      button => {

        button.onclick =
          () =>
            professorRemoveComponent(

              button.dataset.companyId,

              button.dataset.member

            );

      }
    );

}


async function respondComponentRequest(
  requestId,
  approve
) {

  const code =
    roomCode ||
    detectRoomCode();


  if (
    !code ||
    !requestId
  ) {
    return;
  }


  const freshRoom =
    await readRoom(code);


  const request =
    freshRoom
      ?.componentRequests
      ?.[requestId];


  if (!request) {

    alert(
      "Solicitação não encontrada."
    );

    return;

  }


  if (
    request.status !==
    "pending"
  ) {

    alert(
      "Esta solicitação já foi respondida."
    );

    return;

  }


  const company =
    freshRoom
      ?.companies
      ?.[request.companyId];


  if (!company) {

    alert(
      "Empresa não encontrada."
    );

    return;

  }


  const f =
    await getFirebaseSafe();


  if (approve) {

    const members =
      uniqueComponents([

        ...componentsArray(
          company
        ),

        request.componentName

      ]);


    await f.set(

      f.ref(
        f.db,
        `rooms/${code}/companies/${request.companyId}/components`
      ),

      members

    );

  }


  await f.set(

    f.ref(
      f.db,
      `rooms/${code}/componentRequests/${requestId}/status`
    ),

    approve
      ? "approved"
      : "denied"

  );


  await f.set(

    f.ref(
      f.db,
      `rooms/${code}/componentRequests/${requestId}/respondedAt`
    ),

    Date.now()

  );


  await f.set(

    f.ref(
      f.db,
      `rooms/${code}/componentRequests/${requestId}/respondedBy`
    ),

    "Prof. Leopoldo"

  );


  alert(

    approve

      ? `Componente ${request.componentName} incluído com sucesso.`

      : `Solicitação de ${request.componentName} negada.`

  );

}


async function professorAddComponent(
  companyId
) {

  const code =
    roomCode ||
    detectRoomCode();


  const freshRoom =
    await readRoom(code);


  const company =
    freshRoom
      ?.companies
      ?.[companyId];


  if (!company) {

    alert(
      "Empresa não encontrada."
    );

    return;

  }


  const name =
    prompt(

      `Novo componente da empresa ${company.name}:`

    );


  const componentName =
    String(name || "")
      .trim();


  if (!componentName) {
    return;
  }


  const members =
    uniqueComponents(

      componentsArray(
        company
      )

    );


  if (

    members.some(
      member =>
        normalizeName(member) ===
        normalizeName(
          componentName
        )
    )

  ) {

    alert(
      "Esse estudante já pertence à empresa."
    );

    return;

  }


  members.push(
    componentName
  );


  const f =
    await getFirebaseSafe();


  await f.set(

    f.ref(
      f.db,
      `rooms/${code}/companies/${companyId}/components`
    ),

    members

  );


  alert(
    `${componentName} foi incluído na empresa ${company.name}.`
  );

}


async function professorRemoveComponent(
  companyId,
  memberName
) {

  const code =
    roomCode ||
    detectRoomCode();


  const freshRoom =
    await readRoom(code);


  const company =
    freshRoom
      ?.companies
      ?.[companyId];


  if (!company) {
    return;
  }


  const confirmed =
    confirm(

      `Retirar ${memberName} da empresa ${company.name}?\n\n` +
      `Esta ação altera somente a lista de componentes. ` +
      `O progresso da empresa será preservado.`

    );


  if (!confirmed) {
    return;
  }


  const members =
    uniqueComponents(

      componentsArray(
        company
      )

    )
      .filter(
        member =>
          normalizeName(member) !==
          normalizeName(
            memberName
          )
      );


  const f =
    await getFirebaseSafe();


  await f.set(

    f.ref(
      f.db,
      `rooms/${code}/companies/${companyId}/components`
    ),

    members

  );


  alert(
    `${memberName} foi retirado da lista de componentes.`
  );

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


  localStorage.setItem(
    "admArena360Room",
    roomCode
  );


  if (unsubscribe) {

    try {

      unsubscribe();

    } catch {}

  }


  const f =
    await getFirebaseSafe();


  unsubscribe =
    f.onValue(

      f.ref(
        f.db,
        `rooms/${normalized}`
      ),

      snap => {

        const room =
          snapshotValue(snap);


        latestRoom =
          room || null;


        const currentRound =
          Number(
            room?.round || 0
          );


              if (
          room?.opening?.active &&
          (
            currentRound <= 1 ||
            room?.opening?.phase === 2
          )
        ) {
          showOpening(
            room.opening
          );

        } else {

          hideOpening();

        }


        renderStudentComponents();

        renderProfessorComponents();

      }

    );

}


/* =========================================================
   BOTÃO INICIAR / RETOMAR
========================================================= */

function installProfessorStart() {

  const startBtn =
    document.querySelector(
      "#iniciar"
    );


  if (!startBtn) {
    return;
  }


  if (
    startBtn.dataset
      .admGuardInstalled ===
      "1"
  ) {
    return;
  }


  startBtn.dataset
    .admGuardInstalled =
    "1";


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

        const existingRoom =
          await readRoom(code);


        latestRoom =
          existingRoom || null;


        const currentRound =
          Number(
            existingRoom?.round || 0
          );


        if (
          currentRound > 0
        ) {

          const f =
            await getFirebaseSafe();


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

            `Arena ${code} retomada na Rodada ${currentRound}/16. ` +
            `Nenhum progresso foi reiniciado.`

          );


          return;

        }


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

          "Não foi possível iniciar/retomar a Arena. " +
          "Nenhum progresso foi alterado.\n\n" +
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
   LOCALIZADOR DE ARENAS
========================================================= */

function installRoomFinder() {

  if (
    !IS_PROFESSOR ||
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

    <div
      class="adm360-room-message"
    >
      🔎 Consultando Arenas salvas...
    </div>

  `;


  if (button) {
    button.disabled = true;
  }


  try {

    const f =
      await getFirebaseSafe();


    const snap =
      await f.get(

        f.ref(
          f.db,
          "rooms"
        )

      );


    const roomsData =
      snapshotValue(snap) ||
      {};


    const rooms =
      Object.entries(
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
          (a, b) =>
            b.score -
            a.score
        );


    if (!rooms.length) {

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
            ${escapeHtml(
              item.code
            )}
          </strong>

          <div
            class="adm360-room-meta"
          >

            <div>
              <b>Turma:</b>
              ${escapeHtml(
                item.className
              )}
            </div>

            <div>
              <b>Rodada:</b>
              ${item.round}/16
            </div>

            <div>
              <b>Situação:</b>
              ${escapeHtml(
                item.status
              )}
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
            ${
              item.likely
                ? "⭐ USAR ESTA"
                : "USAR ESTA SALA"
            }
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


              if (input) {

                input.value =
                  item.code;

              }


              roomCode =
                item.code;


              latestRoom =
                item.room;


              localStorage.setItem(

                "adm360:openingRoomCode",

                item.code

              );


              localStorage.setItem(

                "admArena360Room",

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

        <br><br>

        ${escapeHtml(
          error?.message ||
          "Erro desconhecido."
        )}

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
   RANKING
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
   BOOT
========================================================= */

function boot() {

  ensureOverlay();

  installProfessorStart();

  installRankingButton();

  installRoomFinder();

  installStudentComponents();

  installProfessorComponents();


  const scan =
    () => {

      const code =
        detectRoomCode();


      if (
        code &&
        (
          code !== roomCode ||
          !unsubscribe
        )
      ) {

        subscribeToRoom(
          code
        );

      }


      renderStudentComponents();

      renderProfessorComponents();

    };


  scan();


  setInterval(
    scan,
    700
  );

}


boot();
