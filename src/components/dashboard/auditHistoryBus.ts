// Tiny event bus to coordinate audit history refresh and "VOIR" reopen
// between Dashboard, AuditsTab, and AuditHistory without prop-drilling.

export type AuditRecordFull = {
  id: string;
  sector: string;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputs: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any;
};

type Events = {
  "audit:saved": void;
  "audit:open": AuditRecordFull;
  "tasks:changed": void;
};


export function emitAudit<K extends keyof Events>(name: K, detail?: Events[K]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function onAudit<K extends keyof Events>(name: K, cb: (detail: Events[K]) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent).detail);
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}
