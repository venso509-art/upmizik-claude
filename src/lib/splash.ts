// Script ki kouri nan <head> lan, ANVAN premye pent la (fichye sèvè: pa "use client"):
// si moun nan deja wè splash la nan sesyon an, li kache l touswit (pa gen flash).
export const SPLASH_HEAD_SCRIPT = `try{if(sessionStorage.getItem("upmizik-splash")){document.documentElement.classList.add("up-splash-seen")}else{sessionStorage.setItem("upmizik-splash","1")}}catch(e){}`;
