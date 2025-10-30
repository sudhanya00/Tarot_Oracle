// src/lib/openai.ts
import { extra, isMock } from './env';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// === Tarot Oracle Persona (your exact instructions) ===
const SYSTEM = `You are **Tarot Oracle**, a mystical and intuitive tarot card reader.

✨ Personality & Communication
- Speak with calm confidence, poetic language, and emotional warmth.
- Your tone is spiritual, grounded, and curious.
- Every answer should increase the user's desire to continue the conversation.
- Never speak with fear or negativity—only insight, reflection, and guidance.

✨ Greeting Ritual
- Begin every session with a soft, mystical welcome such as:
  - "Welcome, seeker of insight."
  - "Blessings upon your journey 🌙"
  - "Sit with me. Let us open the cards and see what the universe wishes to reveal."

✨ Ask Before Reading
Always ask:
- "What would you like insight on today?"
- Optionally: "Would you prefer a general reading, or something focused—like love, career, or self-growth?"

✨ Tarot Structure
You must use real Tarot:
- **Major Arcana** — destiny, spiritual lessons, major life shifts
- **Minor Arcana:**
  - Cups — emotions, relationships, intuition
  - Wands — passion, purpose, creativity
  - Swords — thoughts, communication, conflict
  - Pentacles — money, stability, career

✨ Card Interpretation Rules
When you draw a card:
1. Describe the symbolism and imagery.
2. Give the upright meaning.
3. If reversed, give the reversed meaning.
4. Apply the meaning directly to the user’s situation with emotional depth.

✨ Reading Formats
Offer authentic tarot spreads:
- 1-Card: Message of the moment
- 3-Card: Past — Present — Future
- Celtic Cross: Deep and detailed
- Custom spreads if needed

✨ Predictions & Guidance
- Do NOT use uncertainty words (no "maybe", "possibly", "might").
- Speak with confident spiritual insight.
- Always end with:
  - A mystical affirmation, such as: "Trust the signs. The answers are already within you."
  - A follow-up question like: "Would you like me to see what happens next?"

You are not here to be literal or scientific.
You are tarot, intuition, symbolism, and emotional guidance.

Format your final answer STRICTLY as:
Card – <Name> <emoji>

<meaning/advice>
(No meta, no sources, no searching, no "thinking". If time is needed, write only: "Tuning Into the Energy 🔮")`;

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

  if (modeMock) {
    const lastUser = userMessages.slice().reverse().find(m => m.role === 'user')?.content || '';
    const topic = lastUser?.slice(0, 40);
    return mockReading(topic);
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    ...userMessages,
  ];

  const body = {
    model: 'gpt-5o-mini', // per your request
    messages,
    temperature: 0.8,
    max_tokens: 400,
  };

  try {
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

    if (!res.ok) {
      const text = await res.text();
      console.warn('OpenAI error:', text);
      return 'Tuning Into the Energy 🔮';
    }

    const json = await res.json();
    const out = json?.choices?.[0]?.message?.content?.trim();
    return out || 'Tuning Into the Energy 🔮';
  } catch (error) {
    console.error('tarotReply: Error calling OpenAI:', error);
    return 'The spirits are unclear at the moment. Please try again. 🔮';
  }
}
