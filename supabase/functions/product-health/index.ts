// Anonymous first-party feature and crash signals, written only to function logs.
import { preflight, json } from "../_shared/cors.ts";

const EVENTS = new Set([
  "app_open", "view_changed", "onboarding_completed", "onboarding_skipped",
  "workout_started", "workout_resumed", "workout_paused",
  "workout_completed", "sign_in_completed", "app_error",
  "activation_step", "activation_completed", "catchup_started",
  "weekly_action_started", "weekly_review_completed", "weekly_review_shared",
  "reminder_enabled", "reminder_disabled", "reminder_settings_changed",
  "notification_opened", "readiness_completed", "adaptive_session_started",
  "welcome_back_shown", "welcome_back_choice",
  "paywall_shown", "paywall_buy_tap",
]);
const PROP_KEYS: Record<string, Set<string>> = {
  view_changed:new Set(["view"]),
  onboarding_completed:new Set(["started_plan","revisit"]),
  workout_started:new Set(["kind","week"]),
  workout_resumed:new Set(["kind","week"]),
  workout_paused:new Set(["kind","week","station"]),
  workout_completed:new Set(["kind","week","minutes"]),
  app_error:new Set(["type","source","line_bucket"]),
  activation_step:new Set(["step"]),
  catchup_started:new Set(["week"]),
  weekly_action_started:new Set(["action","week"]),
  weekly_review_completed:new Set(["week","band"]),
  weekly_review_shared:new Set(["week"]),
  reminder_enabled:new Set(["delivery","mode"]),
  reminder_disabled:new Set(["delivery"]),
  reminder_settings_changed:new Set(["mode","timing"]),
  notification_opened:new Set(["kind"]),
  readiness_completed:new Set(["band"]),
  adaptive_session_started:new Set(["band","override"]),
  welcome_back_shown:new Set(["weeks"]),
  welcome_back_choice:new Set(["choice","weeks"]),
  paywall_shown:new Set(["reason"]),
  paywall_buy_tap:new Set(["plan"]),
};
function token(value:unknown,max=24):string|number|boolean|null{
  if(typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return Math.max(0,Math.min(999,Math.round(value)));
  if(typeof value==="string"&&new RegExp(`^[a-z0-9_.-]{1,${max}}$`,"i").test(value)) return value;
  return null;
}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return preflight(req);
  if(req.method!=="POST") return json(req,{error:"POST only"},405);
  if(Number(req.headers.get("content-length")||0)>2048) return json(req,{error:"too_large"},413);
  // Read with a hard byte cap (chunked uploads carry no content-length), and
  // accept only a JSON object — `null` or an array would crash the field reads.
  let raw:Record<string,unknown>;
  try{
    const chunks:Uint8Array[]=[]; let size=0;
    const reader=req.body?req.body.getReader():null;
    while(reader){
      const r=await reader.read(); if(r.done) break;
      size+=r.value.byteLength;
      if(size>2048){ try{ await reader.cancel(); }catch(_){}; return json(req,{error:"too_large"},413); }
      chunks.push(r.value);
    }
    const buf=new Uint8Array(size); let off=0;
    for(const c of chunks){ buf.set(c,off); off+=c.byteLength; }
    const parsed=JSON.parse(new TextDecoder().decode(buf));
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)) return json(req,{error:"invalid_json"},400);
    raw=parsed as Record<string,unknown>;
  }catch(_){return json(req,{error:"invalid_json"},400);}
  const event=token(raw.event);
  if(typeof event!=="string"||!EVENTS.has(event)) return json(req,{error:"invalid_event"},400);
  const properties:Record<string,string|number|boolean>={};
  const supplied=raw.properties&&typeof raw.properties==="object"
    ? raw.properties as Record<string,unknown>:{};
  for(const key of PROP_KEYS[event]||new Set<string>()){
    const value=token(supplied[key]); if(value!==null) properties[key]=value;
  }
  // Do not log request headers, IP, auth, URL or the raw payload.
  console.log(JSON.stringify({kind:"product_health",event,session:token(raw.session,64),
    build:token(raw.build),platform:token(raw.platform),properties}));
  return json(req,{ok:true},202);
});
