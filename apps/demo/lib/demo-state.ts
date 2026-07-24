/**
 * In-memory chaos state for the ShopFlow demo victim app.
 * Toggled via /api/chaos — resets on server restart.
 */

export type ChaosScenario =
  | 'health_down'
  | 'payment_timeout'
  | 'checkout_bug'
  | 'stripe_webhook_fail'
  | 'search_slow'
  | 'gateway_overload';

export interface DemoState {
  scenarios: Record<ChaosScenario, boolean>;
  lastTriggered: Partial<Record<ChaosScenario, string>>;
  triggerCount: number;
}

const defaultScenarios = (): Record<ChaosScenario, boolean> => ({
  health_down: false,
  payment_timeout: false,
  checkout_bug: false,
  stripe_webhook_fail: false,
  search_slow: false,
  gateway_overload: false,
});

let state: DemoState = {
  scenarios: defaultScenarios(),
  lastTriggered: {},
  triggerCount: 0,
};

const SCENARIO_MAX_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours auto-deactivation safety limit (leaves ample time for judges)

export function getDemoState(): DemoState {
  const now = Date.now();
  (Object.keys(state.scenarios) as ChaosScenario[]).forEach((scenario) => {
    if (state.scenarios[scenario] && state.lastTriggered[scenario]) {
      const triggeredAt = new Date(state.lastTriggered[scenario]!).getTime();
      if (now - triggeredAt > SCENARIO_MAX_TTL_MS) {
        state.scenarios[scenario] = false;
      }
    }
  });

  return {
    scenarios: { ...state.scenarios },
    lastTriggered: { ...state.lastTriggered },
    triggerCount: state.triggerCount,
  };
}

export function isScenarioActive(scenario: ChaosScenario): boolean {
  return state.scenarios[scenario];
}

export function setScenario(scenario: ChaosScenario, active: boolean): DemoState {
  state.scenarios[scenario] = active;
  if (active) {
    state.lastTriggered[scenario] = new Date().toISOString();
    state.triggerCount += 1;
  }
  return getDemoState();
}

export function toggleScenario(scenario: ChaosScenario): DemoState {
  return setScenario(scenario, !state.scenarios[scenario]);
}

export function resetAllScenarios(): DemoState {
  state = {
    scenarios: defaultScenarios(),
    lastTriggered: {},
    triggerCount: state.triggerCount,
  };
  return getDemoState();
}

export const SCENARIO_META: Record<
  ChaosScenario,
  {
    label: string;
    description: string;
    chronicleSource: string;
    seededIncident: string;
    severity: string;
  }
> = {
  health_down: {
    label: 'Service Down',
    description: 'Health endpoint returns 503 — triggers UptimeRobot alert',
    chronicleSource: 'uptimerobot',
    seededIncident: 'SSL Certificate Expiry warning',
    severity: 'P3',
  },
  payment_timeout: {
    label: 'Payment Gateway Timeout',
    description: '/api/payments hangs then returns 504 Gateway Timeout',
    chronicleSource: 'chronicle-agent',
    seededIncident: 'API Gateway timeout on /payments',
    severity: 'P1',
  },
  checkout_bug: {
    label: 'Checkout JS Error',
    description: 'ReferenceError: checkoutToken is not defined on checkout page',
    chronicleSource: 'sentry',
    seededIncident: 'Unhandled ReferenceError in checkout flow',
    severity: 'P2',
  },
  stripe_webhook_fail: {
    label: 'Stripe Webhook Failures',
    description: 'Webhook signature validation fails — 100% error rate',
    chronicleSource: 'sentry',
    seededIncident: 'Stripe checkout webhook signatures validation failed',
    severity: 'P1',
  },
  search_slow: {
    label: 'Slow Search API',
    description: 'Search queries take ~12 seconds (missing index simulation)',
    chronicleSource: 'manual',
    seededIncident: 'Slow response times on Search API',
    severity: 'P3',
  },
  gateway_overload: {
    label: 'Gateway Overload',
    description: 'All API routes return 503 — connection pool exhausted',
    chronicleSource: 'chronicle-agent',
    seededIncident: 'Database connection pool exhausted',
    severity: 'P0',
  },
};
