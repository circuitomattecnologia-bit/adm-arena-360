import { FIREBASE } from "./firebase-config.js";

let fb = null;

export async function getFirebase(){
  if(!FIREBASE.enabled) return null;
  if(fb) return fb;
  const appMod = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js");
  const dbMod = await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js");
  const app = appMod.initializeApp(FIREBASE.config);
  const db = dbMod.getDatabase(app);
  fb = {app,db,...dbMod};
  return fb;
}

export function demoGet(key, fallback=null){
  try{ const v=localStorage.getItem("adm360:"+key); return v?JSON.parse(v):fallback }catch{return fallback}
}
export function demoSet(key, value){
  localStorage.setItem("adm360:"+key, JSON.stringify(value));
  window.dispatchEvent(new StorageEvent("storage",{key:"adm360:"+key,newValue:JSON.stringify(value)}));
}
export function roomCode(){
  return "ADM-"+Math.floor(1000+Math.random()*9000);
}
