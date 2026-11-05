import "server-only";

/**
 * Mobile Money layer. PAYMENTS_MODE=sandbox (default) approves every request instantly,
 * except numbers ending in 0000, which fail so the error path can be tested.
 * To go live, implement the "live" branch of collect() and disburse() with the chosen aggregator.
 */
export type Network = "mtn" | "airtel";
export type PayResult = { ok: true; ref: string; network: Network } | { ok: false; error: string };

export function networkOf(msisdn: string): Network | null {
  const p = msisdn.replace(/^\+256/, "").slice(0, 2);
  if (["77", "78", "76", "39"].includes(p)) return "mtn";
  if (["70", "75", "74", "20"].includes(p)) return "airtel";
  return null;
}

const live = () => process.env.PAYMENTS_MODE === "live";
const sandboxRef = () => `sbx_${crypto.randomUUID().slice(0, 12)}`;

async function run(msisdn: string, amount: number, direction: "collect" | "disburse"): Promise<PayResult> {
  const network = networkOf(msisdn);
  if (!network) return { ok: false, error: "Use an MTN or Airtel Mobile Money number." };
  if (live()) return { ok: false, error: "Payments are not connected yet." };
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "Bad amount." };
  if (msisdn.endsWith("0000")) return { ok: false, error: `Sandbox: ${direction} declined by ${network.toUpperCase()}.` };
  return { ok: true, ref: sandboxRef(), network };
}

/** Take money from the user's Mobile Money wallet. */
export const collect = (msisdn: string, amount: number) => run(msisdn, amount, "collect");
/** Send money to the user's Mobile Money wallet. */
export const disburse = (msisdn: string, amount: number) => run(msisdn, amount, "disburse");

export const sandboxMode = () => !live();
