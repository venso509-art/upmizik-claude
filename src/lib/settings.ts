// Paramèt peman yo (tablo "settings" nan baz done a). Admin nan chanje yo sou /admin/peman.
export type AppSettings = {
  htgPerUsd: number;
  moncashNumber: string;
  natcashNumber: string;
  accountName: string; // non ki sou kont MonCash/NatCash la
  registrationFeeUsd: number;
  minDonationUsd: number;
  monthlyFeeUsd: number;
  proPriceUsd: number; // Pwofil Pro
  proMonths: number;
};

// Valè sekou si baz done a pa reponn (menm valè ak migration nan)
export const DEFAULT_SETTINGS: AppSettings = {
  htgPerUsd: 145,
  moncashNumber: "38 91 2317",
  natcashNumber: "35 37 1184",
  accountName: "Clauvens EXAUS",
  registrationFeeUsd: 4.99,
  minDonationUsd: 5,
  monthlyFeeUsd: 0.99,
  proPriceUsd: 5.5,
  proMonths: 24,
};

export type SettingsRow = {
  htg_per_usd: number;
  moncash_number: string;
  natcash_number: string;
  account_name?: string;
  registration_fee_usd: number;
  min_donation_usd: number;
  monthly_fee_usd: number;
  pro_price_usd?: number;
  pro_months?: number;
};

export const SETTINGS_SELECT_BASE = "htg_per_usd, moncash_number, natcash_number, registration_fee_usd, min_donation_usd, monthly_fee_usd";
export const SETTINGS_SELECT = `${SETTINGS_SELECT_BASE}, account_name`;
export const SETTINGS_SELECT_PRO = `${SETTINGS_SELECT}, pro_price_usd, pro_months`;

export function toSettings(row: SettingsRow | null | undefined): AppSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    htgPerUsd: Number(row.htg_per_usd),
    moncashNumber: row.moncash_number,
    natcashNumber: row.natcash_number,
    accountName: row.account_name ?? DEFAULT_SETTINGS.accountName,
    registrationFeeUsd: Number(row.registration_fee_usd),
    minDonationUsd: Number(row.min_donation_usd),
    monthlyFeeUsd: Number(row.monthly_fee_usd),
    proPriceUsd: row.pro_price_usd != null ? Number(row.pro_price_usd) : DEFAULT_SETTINGS.proPriceUsd,
    proMonths: row.pro_months ?? DEFAULT_SETTINGS.proMonths,
  };
}

// Dola → goud (2 chif apre vigil)
export function usdToHtg(usd: number, s: AppSettings) {
  return Math.round(usd * s.htgPerUsd * 100) / 100;
}

// Frè enskripsyon an goud, awondi anlè pou moun nan pa voye santim (menm kalkil ak SQL la)
export function registrationFeeHtg(s: AppSettings) {
  return Math.ceil(s.registrationFeeUsd * s.htgPerUsd);
}

export function monthlyFeeHtg(s: AppSettings) {
  return usdToHtg(s.monthlyFeeUsd, s);
}

export function methodNumber(s: AppSettings, method: "moncash" | "natcash") {
  return method === "moncash" ? s.moncashNumber : s.natcashNumber;
}
