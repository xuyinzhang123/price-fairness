function period(now=new Date()){
 return new Date(now.getTime()+8*3600000).toISOString().slice(0,7);
}
function limit(env,key){
 const raw=env[key]===undefined?"0":String(env[key]);
 if(!/^[0-9]+$/.test(raw)||!Number.isSafeInteger(Number(raw)))throw new Error(key+" 必须是非负整数");
 return Number(raw);
}
function createLimitedFetch(db,env=process.env,fetchImpl=fetch,now=()=>new Date()){
 const enabled=env.EXTERNAL_AI_ENABLED==="true";
 const limits={recognition:limit(env,"AI_RECOGNITION_MONTHLY_LIMIT"),search:limit(env,"AI_SEARCH_MONTHLY_LIMIT"),
  model:limit(env,"AI_MODEL_MONTHLY_LIMIT"),workflow:limit(env,"AI_WORKFLOW_MONTHLY_LIMIT")};
 function classify(url,options){
  const u=new URL(url);
  if(u.origin==="https://open.feedcoopapi.com"&&u.pathname==="/search_api/web_search")return "search";
  if(u.origin==="https://open.bigmodel.cn"&&u.pathname==="/api/paas/v4/web_search")return "search";
  if(u.origin==="https://open.bigmodel.cn"&&u.pathname==="/api/paas/v4/chat/completions"){
   const body=JSON.parse(options.body);
   const image=body.messages?.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==="image_url"));
   return image?"recognition":"model";
  }
  if(u.origin==="https://api.coze.cn"&&u.pathname.startsWith("/v1/"))return "workflow";
  if(url===env.RECOGNITION_BRIDGE_URL)return "recognition";
  if(url===env.SEARCH_BRIDGE_URL)return "search";
  throw new Error("未登记的外部服务地址，已停止调用");
 }
 async function limited(url,options={}){
  if(!enabled)throw new Error("外部 AI 调用尚未启用");
  const bucket=classify(url,options);
  if(!db.reserveCall(period(now()),bucket,limits[bucket]))throw new Error("本月调用额度已用完或未设置");
  // Count attempts before sending. Failed requests consume local allowance conservatively.
  return fetchImpl(url,{...options,redirect:"error"});
 }
 limited.settings={enabled,limits};
 return limited;
}
module.exports={createLimitedFetch,period};