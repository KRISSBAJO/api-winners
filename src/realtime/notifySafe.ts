// src/realtime/notifySafe.ts
import { pushNotif } from "./notify";

export function notifySafe(...args: Parameters<typeof pushNotif>) {
  return pushNotif(...args).catch((e) => {
    // Never crash the request because of a notif issue
    console.error("[notify] failed:", e);
  });
}
