// Anonymous first-party feature and crash signals, written only to function logs.
import { preflight, json } from "../_shared/cors.ts";

const EVENTS = new Set([
  "app_open", "view_changed", "onboarding_completed", "onboarding_skipped",
  "workout_started", "workout_resumed", "workout_paused",
  "workout_completed", "sign_in_completed", "app_error",
  "activation_step", "activation_completed", "catchup_started",
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
  let raw:Record<string,unknown>;
  try{raw=await req.json();}catch(_){return json(req,{error:"invalid_json"},400);}
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
