#!/usr/bin/env node
/* Generate a VAPID keypair for Yardsmith web push.
   - The PUBLIC key goes into FF_PUSH_PUB in cloud-sync.js (committed).
   - The PRIVATE key goes ONLY into the push-daily Edge Function secrets
     (VAPID_PRIVATE_KEY). Never commit it.
   Rotating keys invalidates every existing subscription — each device must
   toggle reminders off/on again — so only regenerate if the private key leaks. */
import crypto from "node:crypto";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pub = publicKey.export({ format: "jwk" });
const prv = privateKey.export({ format: "jwk" });

// applicationServerKey format: 65-byte uncompressed EC point, base64url.
const raw = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(pub.x, "base64url"),
  Buffer.from(pub.y, "base64url"),
]);

console.log("VAPID public key  (FF_PUSH_PUB in cloud-sync.js, VAPID_PUBLIC_KEY secret):");
console.log("  " + raw.toString("base64url"));
console.log("");
console.log("VAPID private key (VAPID_PRIVATE_KEY secret ONLY — never commit):");
console.log("  " + Buffer.from(prv.d, "base64url").toString("base64url"));
console.log("");
console.log("Next: update FF_PUSH_PUB in cloud-sync.js (+ bump its ?v= pin in");
console.log("src/index.template.html and src/sw.template.js, then rebuild), and set");
console.log("both secrets on the push-daily Edge Function. See PUSH-SETUP.md.");
