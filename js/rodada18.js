import { getFirebase } from "./firebase-service.js";

/* =========================================================
   ADM ARENA 360 — RODADA 18
   CRISE 360°
   PROJETO EMPREENDEDOR — PROF. LEOPOLDO

   OBJETIVO
   - Administrar uma crise multidimensional.
   - Exigir leitura dos indicadores da empresa.
   - Permitir reação e recuperação.
   - Valorizar decisões anteriores.

   REGRAS
   - Só funciona na Rodada 18.
   - Não avança rodada.
   - Não altera status da Arena.
   - Não interfere nas Rodadas 1–17.
   - Uma decisão por empresa.
   - Sem resultado aleatório.
========================================================= */

const ROUND = 18;

const PAGE = String(window.location.pathname || "")
  .split("/")
  .pop()
  .toLowerCase();

if (PAGE === "empresa.html") start();

/* =========================================================
   UTILIDADES
========================================================= */

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function detectRoomCode() {
  const url = new URL(window.location.href);

  const candidates = [
    url.searchParams.get("sala"),
    url.searchParams.get("room"),
    url.searchParams.get("codigo"),
    document.querySelector("#codigo")?.value,
    document.querySelector("#salaPill")?.textContent,
    localStorage.getItem("adm360:openingRoomCode"),
    localStorage.getItem("admArena360Room"),
    localStorage.getItem("admArenaRoom"),
    localStorage.getItem("admArenaRoomCode")
  ];

  for (const value of candidates) {
    const match = String(value || "")
      .toUpperCase()
      .match(/\bADM-\d{4}\b/);

    if (match && match[0] !== "ADM-0000") {
      return match[0];
    }
  }

  return "";
}

function getVisibleCompany(room) {
  const visibleName = normalizeName(
    document.querySelector("#empresaNome")?.textContent ||
    document.querySelector("#nomeEmpresa")?.value
  );

  if (!visibleName) return null;

  const found = Object.entries(room?.companies || {})
    .find(([, company]) =>
      normalizeName(company?.name) === visibleName
    );

  if (!found) return null;

  return {
    id: found[0],
