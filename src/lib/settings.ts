// Paramèt peman yo (tablo "settings" nan baz done a). Admin nan chanje yo sou /admin/peman.
export type AppSettings = {
  htgPerUsd: number;
  moncashNumber: string;
  natcashNumber: string;
  registrationFeeUsd: number;
  minDonationUsd: number;
  monthlyFeeUsd: number;
};

// Valè sekou si baz done a pa reponn (menm valè ak migration nan)
export const DEFAULT_SETTINGS: AppSettings = {
  htgPerUsd: 145,
  moncashNumber: "38 91 2317",
  natcashNumber: "35 37 1184",
  registrationFeeUsd: 4.99,
  minDonationUsd: 5,
  monthlyFeeUsd: 0.99,
};

export type SettingsRow = {
  htg_per_usd: number;
  moncash_number: string;
  natcash_number: string;
  registration_fee_usd: number;
  min_donation_usd: number;
  monthly_fee_usd: number;
};

export const SETTINGS_SELECT = "htg_per_usd, moncash_number, natcash_number, registration_fee_usd, min_donation_usd, monthly_fee_usd";

export function toSettings(row: SettingsRow | null | undefined): AppSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    htgPerUsd: Number(row.htg_per_usd),
    moncashNumber: row.moncash_number,
    natcashNumber: row.natcash_number,
    registrationFeeUsd: Number(row.registration_fee_usd),
    minDonationUsd: Number(row.min_donation_usd),
    monthlyFeeUsd: Number(row.monthly_fee_usd),
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
