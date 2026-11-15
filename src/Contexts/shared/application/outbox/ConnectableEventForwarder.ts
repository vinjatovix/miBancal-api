import type { EventForwarder } from './EventForwarder.js';

export interface ConnectableEventForwarder extends EventForwarder {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export const isConnectableEventForwarder = (
  forwarder: EventForwarder
): forwarder is ConnectableEventForwarder => {
  const candidate = forwarder as Partial<ConnectableEventForwarder>;
  return (
    typeof candidate.connect === 'function' &&
    typeof candidate.disconnect === 'function'
  );
};
