// ===== Enfòmasyon sit la (footer, kontak, rezo sosyal) =====
export const CONTACT_EMAIL = "upmizikcontact@gmail.com";

// WhatsApp UpMizik (MonCash la): +509 38 91 2317
export const WHATSAPP_NUMBER = "50938912317";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Bonjou UpMizik! 👋")}`;

// Mete lyen paj UpMizik yo isit la. Yon lyen null = ikòn nan parèt gri ak "Byento".
// Ikòn ki disponib: Facebook, Instagram, X, YouTube, TikTok (gade SocialIcons.tsx)
export const SOCIAL_LINKS: { name: "Facebook" | "Instagram" | "X" | "YouTube" | "TikTok"; url: string | null }[] = [
  { name: "TikTok", url: "https://www.tiktok.com/@upmizik01" },
  { name: "Instagram", url: "https://www.instagram.com/upmizik01" },
  { name: "YouTube", url: "https://www.youtube.com/@upmizik" },
];
