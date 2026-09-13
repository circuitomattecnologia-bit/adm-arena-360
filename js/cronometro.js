import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360
   CRONÔMETRO CENTRAL + ALERTAS DO PROFESSOR

   REGRA DE SEGURANÇA:
   - NÃO altera rodada
   - NÃO envia decisões
   - NÃO bloqueia empresa
   - NÃO altera caixa
   - NÃO altera XP
   - NÃO altera estoque
   - NÃO aplica penalidade
   - 00:00 é apenas informativo
========================================================= */

const IS_PROFESSOR =
  !!document.querySelector("#iniciar");

const IS_EMPRESA =
  !!document.querySelector("#nomeEmpresa");

let timerRoomCode = "";
let timerRoom = null;
let timerUnsubscribe = null;
let clockInterval = null;
let lastAlertNonce = null;


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

  if (!match) return "";

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
    .replace(/\s+/g, " ");
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
    document.querySelector("#codigo")?.value,
    document.querySelector("#codigoExistente")?.value,
    document.querySelector("#salaPill")?.textContent,
    document.querySelector("#salaCodigo")?.textContent
  ];

  const codigoWrap =
    document.querySelector("#codigoWrap");

  const codigoSala =
    document.querySelector("#codigoSala");

  if (
    codigoSala &&
    (
      !codigoWrap ||
      !codigoWrap.classList.contains("hidden")
    )
  ) {

    candidates.push(
      codigoSala.value,
      codigoSala.textContent
    );
  }

  for (const item of candidates) {

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

  const stored = [
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

  for (const item of stored) {

    const code =
      normalizeCode(item);

    if (code) return code;
  }

  return "";
}


async function firebaseSafe() {

  const f =
    await getFirebase();

  if (!f) {
    throw new Error(
      "Firebase indisponível."
    );
  }

  return f;
}


function companyEntries(room) {

  return Object.entries(
    room?.companies || {}
  );
}


/* =========================================================
   TEMPO
========================================================= */

function timerRemaining(timer) {

  if (!timer) return 0;

  if (!timer.running) {

    return Math.max(
      0,
      Number(
        timer.remainingSec ??
        timer.durationSec ??
        0
      )
    );
  }

  const endsAt =
    Number(timer.endsAt || 0);

  if (!endsAt) return 0;

  return Math.max(
    0,
    Math.ceil(
      (endsAt - Date.now()) / 1000
    )
  );
}


function formatTime(seconds) {

  const total =
    Math.max(
      0,
      Math.floor(
        Number(seconds || 0)
      )
    );

  const min =
    Math.floor(total / 60);

  const sec =
    total % 60;

  return (
    String(min).padStart(2, "0") +
    ":" +
    String(sec).padStart(2, "0")
  );
}


/* =========================================================
   IDENTIFICAÇÃO DA EMPRESA
========================================================= */

function currentCompany() {

  if (!timerRoom) return null;

  const visibleName =
    document.querySelector(
      "#empresaNome"
    )?.textContent?.trim() ||

    document.querySelector(
      "#nomeEmpresa"
    )?.value?.trim() ||

    "";

  const normalized =
    normalizeName(visibleName);

  if (
    !normalized ||
    normalized === "-"
  ) {
    return null;
  }

  const match =
    companyEntries(timerRoom)
      .find(
        ([, company]) =>
          normalizeName(
            company?.name
          ) === normalized
      );

  if (!match) return null;

  return {
    id: match[0],
    company: match[1]
  };
}


/* =========================================================
   ESTILO
========================================================= */

function installTimerStyle() {

  if (
    document.querySelector(
      "#adm360TimerStyle"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "adm360TimerStyle";

  style.textContent = `

    #adm360ProfessorTimer,
    #adm360CompanyTimer {
      margin-top: 18px;
      padding: 20px;
      border-radius: 22px;
      border: 1px solid
        rgba(80,190,255,.30);
      background:
        linear-gradient(
          135deg,
          rgba(9,28,55,.96),
          rgba(16,21,44,.96)
        );
      box-shadow:
        0 18px 50px
        rgba(0,0,0,.20);
    }

    .adm360-timer-title {
      font-size: 1.15rem;
      font-weight: 900;
      margin-bottom: 4px;
    }

    .adm360-timer-subtitle {
      opacity: .72;
      font-size: .88rem;
      margin-bottom: 16px;
    }

    .adm360-clock {
      text-align: center;
      font-size: clamp(
        3rem,
        8vw,
        6.4rem
      );
      line-height: 1;
      font-weight: 1000;
      letter-spacing: .04em;
      padding: 22px 10px;
      margin: 12px 0 18px;
      border-radius: 20px;
      background:
        rgba(0,0,0,.28);
      border:
        1px solid
        rgba(255,255,255,.12);
    }

    .adm360-clock.finished {
      color: #ff5d67;
      border-color:
        rgba(255,70,80,.55);
      background:
        rgba(130,0,10,.22);
    }

    .adm360-time-status {
      text-align: center;
      font-weight: 900;
      margin-top: -8px;
      margin-bottom: 18px;
    }

    .adm360-time-settings {
      display: grid;
      grid-template-columns:
        minmax(100px, 160px)
        1fr;
      gap: 10px;
      align-items: end;
      margin-bottom: 12px;
    }

    .adm360-time-settings input {
      width: 100%;
    }

    .adm360-timer-actions {
      display: grid;
      grid-template-columns:
        repeat(4, minmax(0,1fr));
      gap: 8px;
      margin-top: 10px;
    }

    .adm360-timer-actions button {
      min-height: 46px;
    }

    .adm360-alert-area {
      margin-top: 22px;
      padding-top: 18px;
      border-top:
        1px solid
        rgba(255,255,255,.12);
    }

    .adm360-alert-companies {
      display: grid;
      grid-template-columns:
        repeat(
          auto-fit,
          minmax(180px,1fr)
        );
      gap: 8px;
      margin: 12px 0;
    }

    .adm360-alert-company {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 10px 12px;
      border-radius: 12px;
      background:
        rgba(255,255,255,.055);
      border:
        1px solid
        rgba(255,255,255,.10);
    }

    .adm360-alert-company input {
      width: auto;
      margin: 0;
    }

    .adm360-alert-buttons {
      display: grid;
      grid-template-columns:
        1fr 1fr 1fr;
      gap: 10px;
      margin-top: 12px;
    }

    .adm360-alert-yellow {
      background: #f3c52b !important;
      color: #161616 !important;
      font-weight: 900 !important;
    }

    .adm360-alert-red {
      background: #d92c3a !important;
      color: white !important;
      font-weight: 900 !important;
    }

    .adm360-alert-clear {
      font-weight: 900 !important;
    }

    #adm360TimeBanner {
      position: fixed;
      left: 14px;
      right: 14px;
      top: 14px;
      z-index: 2147483000;
      display: none;
      padding: 18px 22px;
      border-radius: 18px;
      text-align: center;
      font-family:
        system-ui,
        sans-serif;
      font-weight: 1000;
      font-size:
        clamp(
          1rem,
          2.4vw,
          1.35rem
        );
      box-shadow:
        0 16px 45px
        rgba(0,0,0,.35);
    }

    #adm360TimeBanner.show {
      display: block;
    }

    #adm360TimeBanner.yellow {
      background: #ffd83d;
      color: #161616;
      border:
        3px solid #fff0a2;
    }

    #adm360TimeBanner.red {
      background: #d92132;
      color: white;
      border:
        3px solid #ff8993;
    }

    .adm360-safety-note {
      margin-top: 14px;
      padding: 11px 13px;
      border-radius: 12px;
      background:
        rgba(74,221,255,.07);
      border:
        1px solid
        rgba(74,221,255,.20);
      font-size: .82rem;
      opacity: .86;
    }

    @media(max-width:700px) {

      .adm360-timer-actions,
      .adm360-alert-buttons {
        grid-template-columns: 1fr;
      }

      .adm360-time-settings {
        grid-template-columns: 1fr;
      }
    }

  `;

  document.head.appendChild(style);
}


/* =========================================================
   PAINEL PROFESSOR
========================================================= */

function installProfessorTimer() {

  if (
    !IS_PROFESSOR ||
    document.querySelector(
      "#adm360ProfessorTimer"
    )
  ) {
    return;
  }

  const main =
    document.querySelector("main") ||
    document.querySelector(".shell") ||
    document.body;

  const box =
    document.createElement("section");

  box.id =
    "adm360ProfessorTimer";

  box.className =
    "card glass";

  box.innerHTML = `

    <div class="adm360-timer-title">
      ⏱️ CRONÔMETRO DA RODADA
    </div>

    <div class="adm360-timer-subtitle">
      Controle exclusivo do professor.
      O cronômetro é somente informativo.
    </div>

    <div
      id="adm360ProfessorClock"
      class="adm360-clock"
    >
      00:00
    </div>

    <div
      id="adm360ProfessorTimeStatus"
      class="adm360-time-status"
    >
      TEMPO NÃO DEFINIDO
    </div>

    <div class="adm360-time-settings">

      <div>
        <label for="adm360TimerMinutes">
          Minutos
        </label>

        <input
          id="adm360TimerMinutes"
          type="number"
          min="1"
          max="180"
          value="15"
        >
      </div>

      <button
        type="button"
        id="adm360DefineTimer"
      >
        DEFINIR TEMPO
      </button>

    </div>

    <div class="adm360-timer-actions">

      <button
        type="button"
        id="adm360StartTimer"
      >
        ▶ INICIAR / CONTINUAR
      </button>

      <button
        type="button"
        id="adm360PauseTimer"
      >
        ⏸ PAUSAR TEMPO
      </button>

      <button
        type="button"
        id="adm360AddMinute"
      >
        +1 MINUTO
      </button>

      <button
        type="button"
        id="adm360ResetTimer"
      >
        ↺ REDEFINIR
      </button>

    </div>

    <div class="adm360-alert-area">

      <div class="adm360-timer-title">
        🔔 ALERTA PARA AS EMPRESAS
      </div>

      <div class="adm360-timer-subtitle">
        Selecione uma, várias ou todas.
      </div>

      <label
        class="adm360-alert-company"
      >
        <input
          id="adm360SelectAllCompanies"
          type="checkbox"
        >
        <strong>
          TODAS AS EMPRESAS
        </strong>
      </label>

      <div
        id="adm360AlertCompanies"
        class="adm360-alert-companies"
      ></div>

      <div class="adm360-alert-buttons">

        <button
          type="button"
          id="adm360SendYellow"
          class="adm360-alert-yellow"
        >
          🟨 BIP + TARJA AMARELA
        </button>

        <button
          type="button"
          id="adm360SendRed"
          class="adm360-alert-red"
        >
          🟥 BIP + TARJA VERMELHA
        </button>

        <button
          type="button"
          id="adm360ClearAlert"
          class="ghost adm360-alert-clear"
        >
          RETIRAR TARJA
        </button>

      </div>

    </div>

    <div class="adm360-safety-note">
      SEGURANÇA: 00:00 não envia decisões,
      não bloqueia empresas, não aplica
      penalidade e não muda a rodada.
      Somente o professor avança a Arena.
    </div>

  `;

  main.appendChild(box);


  box.querySelector(
    "#adm360DefineTimer"
  )?.addEventListener(
    "click",
    defineTimer
  );


  box.querySelector(
    "#adm360StartTimer"
  )?.addEventListener(
    "click",
    startTimer
  );


  box.querySelector(
    "#adm360PauseTimer"
  )?.addEventListener(
    "click",
    pauseTimer
  );


  box.querySelector(
    "#adm360AddMinute"
  )?.addEventListener(
    "click",
    addMinute
  );


  box.querySelector(
    "#adm360ResetTimer"
  )?.addEventListener(
    "click",
    resetTimer
  );


  box.querySelector(
    "#adm360SendYellow"
  )?.addEventListener(
    "click",
    () => sendAlert("yellow")
  );


  box.querySelector(
    "#adm360SendRed"
  )?.addEventListener(
    "click",
    () => sendAlert("red")
  );


  box.querySelector(
    "#adm360ClearAlert"
  )?.addEventListener(
    "click",
    clearAlert
  );


  box.querySelector(
    "#adm360SelectAllCompanies"
  )?.addEventListener(
    "change",
    event => {

      box
        .querySelectorAll(
          ".adm360-company-check"
        )
        .forEach(input => {

          input.checked =
            event.target.checked;

        });
    }
  );
}


/* =========================================================
   PAINEL EMPRESA
========================================================= */

function installCompanyTimer() {

  if (
    !IS_EMPRESA ||
    document.querySelector(
      "#adm360CompanyTimer"
    )
  ) {
    return;
  }

  const game =
    document.querySelector("#jogo");

  if (!game) return;

  const box =
    document.createElement("section");

  box.id =
    "adm360CompanyTimer";

  box.innerHTML = `

    <div class="adm360-timer-title">
      ⏱️ TEMPO DA RODADA
    </div>

    <div
      id="adm360CompanyClock"
      class="adm360-clock"
    >
      00:00
    </div>

    <div
      id="adm360CompanyTimeStatus"
      class="adm360-time-status"
    >
      AGUARDANDO PROFESSOR
    </div>

    <div class="adm360-safety-note">
      O encerramento do cronômetro
      não envia automaticamente
      as decisões da empresa.
      Aguarde sempre a orientação
      do professor.
    </div>

  `;

  const components =
    document.querySelector(
      "#adm360StudentComponents"
    );

  if (components) {

    components.insertAdjacentElement(
      "afterend",
      box
    );

  } else {

    game.prepend(box);
  }
}


/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function renderTimer() {

  const timer =
    timerRoom?.timer;

  const remaining =
    timerRemaining(timer);

  const text =
    formatTime(remaining);

  const professorClock =
    document.querySelector(
      "#adm360ProfessorClock"
    );

  const companyClock =
    document.querySelector(
      "#adm360CompanyClock"
    );

  const professorStatus =
    document.querySelector(
      "#adm360ProfessorTimeStatus"
    );

  const companyStatus =
    document.querySelector(
      "#adm360CompanyTimeStatus"
    );


  for (
    const clock
    of [professorClock, companyClock]
  ) {

    if (!clock) continue;

    clock.textContent = text;

    clock.classList.toggle(
      "finished",
      !!timer &&
      remaining <= 0
    );
  }


  let status =
    "TEMPO NÃO DEFINIDO";

  if (timer) {

    if (remaining <= 0) {

      status =
        "🔴 00:00 — TEMPO ENCERRADO";

    } else if (timer.running) {

      status =
        "TEMPO EM ANDAMENTO";

    } else {

      status =
        "TEMPO PAUSADO";
    }
  }


  if (professorStatus) {
    professorStatus.textContent =
      status;
  }

  if (companyStatus) {
    companyStatus.textContent =
      status;
  }
}


function renderCompanySelection() {

  if (!IS_PROFESSOR) return;

  const box =
    document.querySelector(
      "#adm360AlertCompanies"
    );

  if (!box) return;

  const selected =
    new Set(
      [...box.querySelectorAll(
        ".adm360-company-check:checked"
      )]
        .map(input => input.value)
    );

  const entries =
    companyEntries(timerRoom);

  box.innerHTML =
    entries.length
      ? entries
          .map(
            ([id, company]) => `

              <label
                class="adm360-alert-company"
              >
                <input
                  type="checkbox"
                  class="adm360-company-check"
                  value="${escapeHtml(id)}"
                  ${
                    selected.has(id)
                      ? "checked"
                      : ""
                  }
                >

                <span>
                  🏢 ${escapeHtml(
                    company?.name || id
                  )}
                </span>
              </label>

            `
          )
          .join("")
      : `
          <div class="adm360-safety-note">
            Nenhuma empresa cadastrada.
          </div>
        `;
}


/* =========================================================
   COMANDOS DO PROFESSOR
========================================================= */

async function defineTimer() {

  const code =
    timerRoomCode ||
    detectRoomCode();

  if (!code) {
    alert(
      "Acesse uma Arena primeiro."
    );
    return;
  }

  const minutes =
    Number(
      document.querySelector(
        "#adm360TimerMinutes"
      )?.value || 0
    );

  if (
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {

    alert(
      "Informe um tempo válido."
    );

    return;
  }

  const seconds =
    Math.round(minutes * 60);

  const f =
    await firebaseSafe();

  await f.set(
    f.ref(
      f.db,
      `rooms/${code}/timer`
    ),
    {
      durationSec: seconds,
      remainingSec: seconds,
      running: false,
      startedAt: null,
      endsAt: null,
      round: Number(
        timerRoom?.round || 0
      ),
      updatedAt: Date.now(),
      updatedBy: "professor"
    }
  );
}


async function startTimer() {

  const code =
    timerRoomCode ||
    detectRoomCode();

  if (!code) {
    alert(
      "Acesse uma Arena primeiro."
    );
    return;
  }

  const current =
    timerRoom?.timer;

  if (!current) {

    alert(
      "Defina o tempo primeiro."
    );

    return;
  }

  let remaining =
    timerRemaining(current);

  if (remaining <= 0) {

    remaining =
      Number(
        current.durationSec || 0
      );
  }

  if (remaining <= 0) return;

  const now =
    Date.now();

  const f =
    await firebaseSafe();

  await f.set(
    f.ref(
      f.db,
      `rooms/${code}/timer`
    ),
    {
      ...current,
      remainingSec: remaining,
      running: true,
      startedAt: now,
      endsAt:
        now +
        remaining * 1000,
      round: Number(
        timerRoom?.round || 0
      ),
      updatedAt: now,
      updatedBy: "professor"
    }
  );
}


async function pauseTimer() {

  const code =
    timerRoomCode ||
    detectRoomCode();

  const current =
    timerRoom?.timer;

  if (!code || !current) return;

  const remaining =
    timerRemaining(current);

  const f =
    await firebaseSafe();

  await f.set(
    f.ref(
      f.db,
      `rooms/${code}/timer`
    ),
    {
      ...current,
      remainingSec: remaining,
      running: false,
      endsAt: null,
      updatedAt: Date.now(),
      updatedBy: "professor"
    }
  );
}


async function addMinute() {

  const code =
    timerRoomCode ||
    detectRoomCode();

  const current =
    timerRoom?.timer;

  if (!code || !current) {

    alert(
      "Defina o cronômetro primeiro."
    );

    return;
  }

  const remaining =
    timerRemaining(current) + 60;

  const now =
    Date.now();

  const next = {
    ...current,
    remainingSec: remaining,
    updatedAt: now,
    updatedBy: "professor"
  };

  if (current.running) {

    next.endsAt =
      now +
      remaining * 1000;

  } else {

    next.endsAt = null;
  }

  const f =
    await firebaseSafe();

  await f.set(
    f.ref(
      f.db,
      `rooms/${code}/timer`
    ),
    next
  );
}


async function resetTimer() {

  const code =
    timerRoomCode ||
    detectRoomCode();

  const current =
    timerRoom?.timer;

  if (!code || !current) return;

  const duration =
    Number(
      current.durationSec || 0
    );

  const f =
    await firebaseSafe();

  await f.set(
    f.ref(
      f.db,
      `rooms/${code}/timer`
    ),
    {
      ...current,
      remainingSec: duration,
      running: false,
      startedAt: null,
      endsAt: null,
      updatedAt: Date.now(),
      updatedBy: "professor"
    }
  );
}


/* =========================================================
   ALERTAS
========================================================= */

function selectedCompanies() {

  return [
    ...document.querySelectorAll(
      ".adm360-company-check:checked"
    )
  ]
    .map(input => input.value)
    .filter(Boolean);
}


async function sendAlert(type) {

  const code =
    timerRoomCode ||
    detectRoomCode();

  if (!code) {

    alert(
      "Acesse uma Arena primeiro."
    );

    return;
  }

  const targets =
    selectedCompanies();

  if (!targets.length) {

    alert(
      "Selecione pelo menos uma empresa."
    );

    return;
  }

  const isRed =
    type === "red";

  const alertData = {

    nonce: Date.now(),

    type:
      isRed
        ? "red"
        : "yellow",

    targets,

    message:
      isRed

        ? "TEMPO ENCERRADO — AGUARDEM ORIENTAÇÃO DO PROFESSOR."

        : "ATENÇÃO — TEMPO DA RODADA ESTÁ TERMINANDO! Organizem e finalizem suas decisões.",

    beepSeconds: 5,

    sentAt: Date.now(),

    round: Number(
      timerRoom?.round || 0
    ),

    active: true,

    sentBy: "professor"

  };

  const f =
    await firebaseSafe();

  await f.set(
    f.ref(
      f.db,
      `rooms/${code}/timeAlert`
    ),
    alertData
  );
}


async function clearAlert() {

  const code =
    timerRoomCode ||
    detectRoomCode();

  if (!code) return;

  const f =
    await firebaseSafe();

  await f.set(
    f.ref(
      f.db,
      `rooms/${code}/timeAlert/active`
    ),
    false
  );

  await f.set(
    f.ref(
      f.db,
      `rooms/${code}/timeAlert/clearedAt`
    ),
    Date.now()
  );
}


/* =========================================================
   TARJA
========================================================= */

function ensureBanner() {

  let banner =
    document.querySelector(
      "#adm360TimeBanner"
    );

  if (banner) return banner;

  banner =
    document.createElement("div");

  banner.id =
    "adm360TimeBanner";

  document.body.appendChild(
    banner
  );

  return banner;
}


function hideBanner() {

  const banner =
    document.querySelector(
      "#adm360TimeBanner"
    );

  if (!banner) return;

  banner.className = "";

  banner.textContent = "";
}


function renderAlert() {

  if (!IS_EMPRESA) return;

  const alertData =
    timerRoom?.timeAlert;

  const company =
    currentCompany();

  if (
    !alertData ||
    !alertData.active ||
    !company
  ) {

    hideBanner();
    return;
  }

  const targets =
    Array.isArray(
      alertData.targets
    )
      ? alertData.targets
      : [];

  if (
    !targets.includes(
      company.id
    )
  ) {

    hideBanner();
    return;
  }

  const banner =
    ensureBanner();

  const type =
    alertData.type === "red"
      ? "red"
      : "yellow";

  banner.className =
    `show ${type}`;

  banner.textContent =
    alertData.message || "";


  if (
    alertData.nonce &&
    alertData.nonce !==
      lastAlertNonce
  ) {

    lastAlertNonce =
      alertData.nonce;

    playFiveSecondBeep();
  }
}


/* =========================================================
   BIP DE 5 SEGUNDOS
========================================================= */

function playFiveSecondBeep() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContext) return;

    const ctx =
      new AudioContext();

    const gain =
      ctx.createGain();

    gain.gain.value =
      0.10;

    gain.connect(
      ctx.destination
    );

    const start =
      ctx.currentTime;

    const duration = 5;

    for (
      let i = 0;
      i < 10;
      i++
    ) {

      const oscillator =
        ctx.createOscillator();

      oscillator.type =
        "sine";

      oscillator.frequency.value =
        880;

      oscillator.connect(gain);

      const pulseStart =
        start + i * 0.5;

      oscillator.start(
        pulseStart
      );

      oscillator.stop(
        Math.min(
          start + duration,
          pulseStart + 0.30
        )
      );
    }

    setTimeout(
      () => {

        try {
          ctx.close();
        } catch {}

      },
      5200
    );

  } catch {

    // Se o navegador bloquear áudio,
    // a tarja continua funcionando.
  }
}


/* =========================================================
   SINCRONIZAÇÃO
========================================================= */

async function subscribeTimerRoom(
  code
) {

  const normalized =
    normalizeCode(code);

  if (!normalized) return;

  if (
    normalized === timerRoomCode &&
    timerUnsubscribe
  ) {
    return;
  }

  timerRoomCode =
    normalized;

  if (timerUnsubscribe) {

    try {
      timerUnsubscribe();
    } catch {}
  }

  const f =
    await firebaseSafe();

  timerUnsubscribe =
    f.onValue(

      f.ref(
        f.db,
        `rooms/${normalized}`
      ),

      snap => {

        timerRoom =
          snapshotValue(snap) ||
          null;

        renderTimer();

        renderCompanySelection();

        renderAlert();
      }
    );
}


/* =========================================================
   BOOT
========================================================= */

function bootTimer() {

  installTimerStyle();

  installProfessorTimer();

  installCompanyTimer();

  ensureBanner();

  clockInterval =
    setInterval(
      renderTimer,
      250
    );


  const scan =
    () => {

      installProfessorTimer();

      installCompanyTimer();

      const code =
        detectRoomCode();

      if (
        code &&
        (
          code !== timerRoomCode ||
          !timerUnsubscribe
        )
      ) {

        subscribeTimerRoom(code);
      }

      renderTimer();

      renderCompanySelection();

      renderAlert();
    };


  scan();

  setInterval(
    scan,
    700
  );
}


bootTimer();
