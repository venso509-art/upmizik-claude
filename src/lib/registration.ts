import { HTG_PER_USD } from "@/lib/donations";

// Frè enskripsyon atis la. Montan an goud awondi anlè, pou moun nan pa voye santim.
export const REGISTRATION_FEE_USD = 4.99;
export const REGISTRATION_FEE_HTG = Math.ceil(REGISTRATION_FEE_USD * HTG_PER_USD);
