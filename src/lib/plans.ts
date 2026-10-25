// src/lib/plans.ts
// Display data for the two ways to unlock readings. Prices are charged by Stripe
// (STRIPE_PRICE_ID_DAY / STRIPE_PRICE_ID_MONTH on the Cloud Functions side).

export type PlanId = 'day' | 'month';

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
};

export const PLANS: Record<PlanId, Plan> = {
  day: {
    id: 'day',
    name: 'Day Pass',
    price: '$3',
    cadence: 'for 24 hours',
    blurb: 'Unlimited readings for a day. One payment, no subscription.',
  },
  month: {
    id: 'month',
    name: 'Monthly',
    price: '$30',
    cadence: 'per month',
    blurb: 'Unlimited readings for about $1 a day. Cancel anytime.',
  },
};

export const PLAN_ORDER: PlanId[] = ['month', 'day'];

// "23h 12m left", "12m left": used for Day Pass countdowns.
export function formatTimeLeft(expiresAt: number, now = Date.now()): string {
  const ms = Math.max(0, expiresAt - now);
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 48) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(1, minutes)}m left`;
}
