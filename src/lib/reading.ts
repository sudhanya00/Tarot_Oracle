// src/lib/reading.ts
// Readings open with a "Card: <Name>" line (older ones used "Card – <Name> <emoji>").

// Emoji, variation selectors and joiners; kept out of card titles.
const EMOJI = /[☀-➿️‍]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]/g;
const CARD_LINE = /^\s*Card\s*[:–—-]\s*(.+?)\s*(?:\n|$)/;

export function splitReading(content: string): { card?: string; body: string } {
  const match = content.match(CARD_LINE);
  if (!match) return { body: content };
  const card = match[1].replace(EMOJI, '').trim();
  return { card: card || undefined, body: content.slice(match[0].length).replace(/^\s+/, '') };
}
