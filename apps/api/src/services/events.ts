// ═══════════════════════════════════════════════════════════
// Event Bus — Decoupled event-driven architecture
// ═══════════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import { logger } from '../lib/logger.js';
import type { Incident } from '@chronicle/shared';

const log = logger.child({ service: 'events' });

export interface ChronicleEvents {
  'incident.created': { incident: Incident; orgId: string };
  'incident.updated': { incident: Incident; orgId: string; changes: Record<string, unknown> };
  'incident.resolved': { incident: Incident; orgId: string };
  'incident.severity_changed': { incident: Incident; orgId: string; oldSeverity: string; newSeverity: string };
  'incident.sla_breach': { incidentId: string; orgId: string; severity: string };
  'webhook.received': { source: string; orgId: string; payload: unknown };
  'agent.response': { incidentId: string; response: string; toolsUsed: string[] };
  'memory.written': { orgId: string; incidentId: string; memoryId: string };
}

class ChronicleEventBus extends EventEmitter {
  emitEvent<K extends keyof ChronicleEvents>(
    event: K,
    data: ChronicleEvents[K]
  ): void {
    log.debug({ event, data: JSON.stringify(data).substring(0, 200) }, `Event: ${event}`);
    this.emit(event, data);
  }

  onEvent<K extends keyof ChronicleEvents>(
    event: K,
    handler: (data: ChronicleEvents[K]) => void | Promise<void>
  ): void {
    this.on(event, async (data) => {
      try {
        await handler(data);
      } catch (err) {
        log.error({ err, event }, `Event handler error for ${event}`);
      }
    });
  }
}

// Singleton event bus
export const eventBus = new ChronicleEventBus();

// Increase max listeners for production use
eventBus.setMaxListeners(50);
