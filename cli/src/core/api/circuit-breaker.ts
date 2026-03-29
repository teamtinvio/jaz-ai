/**
 * Circuit breaker for Jaz API endpoints.
 *
 * Tracks consecutive failures per path template. After FAILURE_THRESHOLD
 * consecutive failures, opens the circuit (fail fast) for COOLDOWN_MS.
 * After cooldown, allows one probe request (half-open).
 *
 * Inspired by Red Hat's distributed systems guidance and Mastra's
 * layered error handling. Prevents cascading failures when an API
 * endpoint is down — the agent gets an immediate error message instead
 * of wasting 25 turns retrying the same broken call.
 */

interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}

/** Open circuit after this many consecutive failures on the same endpoint. */
const FAILURE_THRESHOLD = 5;
/** Cooldown before allowing a probe request (ms). */
const COOLDOWN_MS = 30_000;

const circuits = new Map<string, CircuitState>();

/**
 * Normalize API path to a template for circuit grouping.
 * e.g. /invoices/abc-123 → /invoices/{id}
 */
function normalizePath(path: string): string {
  return path.replace(/\/[a-f0-9-]{8,}(?=[/?#]|$)/gi, '/{id}');
}

/** Check if the circuit is open for this endpoint. Throws if requests should be blocked. */
export function checkCircuit(path: string): void {
  const key = normalizePath(path);
  const circuit = circuits.get(key);
  if (!circuit || circuit.state === 'closed') return;

  if (circuit.state === 'open') {
    if (Date.now() - circuit.lastFailure > COOLDOWN_MS) {
      circuit.state = 'half-open';
      return; // Allow one probe
    }
    const waitSec = Math.ceil((COOLDOWN_MS - (Date.now() - circuit.lastFailure)) / 1000);
    throw new Error(`Circuit open for ${key} — API endpoint appears down (${circuit.failures} consecutive failures). Retry in ${waitSec}s.`);
  }
  // half-open: allow through
}

/** Record a successful request — resets the circuit to closed. */
export function recordSuccess(path: string): void {
  const key = normalizePath(path);
  const circuit = circuits.get(key);
  if (circuit) {
    circuit.failures = 0;
    circuit.state = 'closed';
  }
}

/** Record a failed request — increments failure count, opens circuit if threshold reached. */
export function recordFailure(path: string): void {
  const key = normalizePath(path);
  const circuit = circuits.get(key) ?? { failures: 0, lastFailure: 0, state: 'closed' as const };
  circuit.failures++;
  circuit.lastFailure = Date.now();
  if (circuit.failures >= FAILURE_THRESHOLD) {
    circuit.state = 'open';
  }
  circuits.set(key, circuit);
}

/** Reset all circuits (for tests). */
export function resetCircuits(): void {
  circuits.clear();
}
