import { parsePhoneNumberFromString } from 'libphonenumber-js'

export function normalizePhone(raw: string, defaultCountry = 'MY'): { phoneRaw: string; phoneE164: string | null } {
  const phoneRaw = raw.trim()
  try {
    const parsed = parsePhoneNumberFromString(phoneRaw, defaultCountry as any)
    return {
      phoneRaw,
      phoneE164: parsed?.isValid() ? parsed.format('E.164') : null,
    }
  } catch {
    return { phoneRaw, phoneE164: null }
  }
}
