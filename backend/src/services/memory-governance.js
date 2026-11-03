import { createHash } from 'node:crypto';

const EXPLICIT_PATTERNS = [
  /(?:tolong\s+)?ingat(?:kan)?\s+(?:bahwa\s+)?(.{8,500})/i,
  /(?:simpan|catat)\s+(?:ini\s+)?(?:sebagai\s+)?(?:memori|informasi)?\s*:?\s*(.{8,500})/i,
  /aku ingin kamu mengingat\s+(.{8,500})/i,
];

// Avoid proposing highly sensitive information for long-term memory.
const SENSITIVE = /\b(diagnosis|penyakit|obat|kesehatan|terapi|depresi|kecemasan|agama|keyakinan|orientasi seksual|kata sandi|password|pin|nomor kartu|rekening|ktp|nik)\b/i;

export function extractExplicitMemoryCandidate(message) {
  const text = String(message ?? '').trim();
  if (!text || SENSITIVE.test(text)) return null;
  for (const pattern of EXPLICIT_PATTERNS) {
    const match = text.match(pattern);
    const content = match?.[1]?.trim().replace(/[.!?]+$/, '');
    if (content && content.length >= 8 && content.length <= 500) return content;
  }
  return null;
}

export function normalizeMemoryContent(content) {
  return String(content).normalize('NFKC').toLocaleLowerCase('id-ID').replace(/\s+/g, ' ').trim();
}

export function memoryContentHash(content) {
  return createHash('sha256').update(normalizeMemoryContent(content)).digest('hex');
}

export function scoreMemoryImportance(content) {
  const text = String(content).toLowerCase();
  let score = 0.5;
  if (/preferensi|suka|lebih memilih|panggil aku|nama saya/.test(text)) score += 0.2;
  if (/proyek|pekerjaan|tujuan|sedang membangun|rencana/.test(text)) score += 0.15;
  return Math.min(1, Number(score.toFixed(2)));
}

export function memoryExpiryFromDays(days) {
  if (days === null || days === undefined || days === '') return null;
  const value = Number(days);
  if (!Number.isInteger(value) || value < 1 || value > 3650) throw new RangeError('Memory expiry must be between 1 and 3650 days.');
  return new Date(Date.now() + value * 86400000).toISOString();
}
