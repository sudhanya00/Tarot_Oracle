// src/lib/openai.ts
import { extra, isMock } from './env';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// === Tarot Oracle Persona (your exact instructions) ===
const SYSTEM = `You are Tarot Oracle, a mystical and intuitive tarot card reader. You speak with calm confidence, always guiding the user through life's questions using symbolism, intuition, and the ancient wisdom of the tarot.
You explain each card's meaning in a grounded, spiritual, and emotionally resonant way. You may ask clarifying questions before drawing cards, and you never make absolute predictions—only offer insight, guidance, and self-reflection.

Behavior Rules:
- Greet users gently (e.g., “Welcome, seeker of insight” or “Blessings upon your journey 🌙”).
- For accurate readings, ask: “What would you like insight on today?” Optionally: “Would you prefer a general reading, or something specific—like love, career, or self-growth?”
- Use real Tarot structure: Major Arcana, Minor Arcana (Cups, Wands, Swords, Pentacles).
- Describe the symbolism, upright and reversed meanings, and how it applies to the user’s situation.
- Always interpret with empathy, not fear.
- Use 1-card, 3-card (past-present-future), Celtic Cross, or custom spreads based on user preference.
- Close with a mystical affirmation, like: “Trust the signs. The answers are already within you.”

Format your final answer STRICTLY as:
Card – <Name> <emoji>

<meaning/advice>
(No meta, no sources, no searching, no “thinking”. If time is needed, write only: "Tuning Into the Energy 🔮")`;

function mockReading(topic?: string) {
  const lines = [
    'Card – The Sun ☀️',
    '',
    `Warm clarity and joyful momentum surround you${topic ? ` in matters of ${topic}` : ''}.`,
    'Lean into optimism, act with confidence, and let your authentic light guide the next step.',
  ];
  return lines.join('\n');
}

// Core reply (mock or real)
export async function tarotReply(userMessages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const key = extra.OPENAI_API_KEY;
  const modeMock = isMock() || !key;

  console.log('tarotReply: isMock =', isMock(), 'hasKey =', !!key, 'modeMock =', modeMock);

  if (modeMock) {
    console.log('tarotReply: Using MOCK mode');
    const lastUser = userMessages.slice().reverse().find(m => m.role === 'user')?.content || '';
    const topic = lastUser?.slice(0, 40);
    return mockReading(topic);
  }

  console.log('tarotReply: Calling OpenAI API...');
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    ...userMessages,
  ];

  const body = {
    model: 'gpt-4o',
    messages,
    temperature: 0.8,
    max_tokens: 400,
  };

  console.log('tarotReply: Request body prepared, model:', body.model);

  try {
    console.log('tarotReply: Starting fetch request...');
    
    // Add timeout to prevent hanging forever
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('tarotReply: Request timeout after 30 seconds, aborting...');
      controller.abort();
    }, 30000); // 30 second timeout

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('tarotReply: Fetch completed, status:', res.status);

    if (!res.ok) {
      const text = await res.text();
      console.warn('tarotReply: OpenAI error response:', text);
      return 'Tuning Into the Energy 🔮';
    }

    const json = await res.json();
    const out = json?.choices?.[0]?.message?.content?.trim();
    console.log('tarotReply: Received response from OpenAI:', out?.substring(0, 100) + '...');
    return out || 'Tuning Into the Energy 🔮';
  } catch (error) {
    console.error('tarotReply: Error calling OpenAI:', error);
    return 'The spirits are unclear at the moment. Please try again. 🔮';
  }
}
