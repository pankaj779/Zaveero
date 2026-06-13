function ownerPhoneDigits(): string | null {
  const raw =
    process.env.WHATSAPP_NOTIFY_PHONE ??
    process.env.WHATSAPP_PHONE ??
    process.env.OWNER_WHATSAPP_PHONE;
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

function truncate(text: string, max = 1200): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max - 3)}...`;
}

export async function sendOwnerWhatsApp(message: string): Promise<boolean> {
  const phone = ownerPhoneDigits();
  const apiKey = process.env.WHATSAPP_API_KEY ?? process.env.CALLMEBOT_API_KEY;
  if (!phone || !apiKey) return false;

  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", truncate(message));
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp notification failed (${res.status}): ${body}`);
  }

  return true;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(ownerPhoneDigits() && (process.env.WHATSAPP_API_KEY ?? process.env.CALLMEBOT_API_KEY));
}
