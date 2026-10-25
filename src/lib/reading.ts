// src/lib/reading.ts
// Readings open with a "Card: <Name> <emoji>" line (older ones used "Card – <Name> <emoji>").

const CARD_LINE = /^\s*Card\s*[:–—-]\s*(.+?)\s*(?:\n|$)/;

export function splitReading(content: string): { card?: string; body: string } {
  const match = content.match(CARD_LINE);
  if (!match) return { body: content };
  return { card: match[1], body: content.slice(match[0].length).replace(/^\s+/, '') };
}
