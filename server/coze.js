const COZE_ORIGIN="https://api.coze.cn";
function parseObject(value){
 if(typeof value==="string"){
  const clean=value.trim().replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/,"");
  try{value=JSON.parse(clean)}catch(_){throw new Error("工作流输出必须为 JSON 对象")}
 }
 if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("工作流输出必须为 JSON 对象");
 return value;
}
function decodeWorkflow(data){
 const object=parseObject(data);
 return Object.hasOwn(object,"output")?parseObject(object.output):object;
}
function createCoze(env,fetchImpl=fetch){
 const recognition=!!(env.COZE_API_TOKEN&&env.COZE_RECOGNITION_WORKFLOW_ID);
 const search=!!(env.COZE_API_TOKEN&&env.COZE_SEARCH_WORKFLOW_ID);
 async function call(endpoint,body,signal){
  let response;
  try{response=await fetchImpl(COZE_ORIGIN+endpoint,{method:"POST",headers:{
   Authorization:"Bearer "+env.COZE_API_TOKEN,...(body instanceof FormData?{}:{"Content-Type":"application/json"})
  },body:body instanceof FormData?body:JSON.stringify(body),signal})}
  catch(_){throw new Error("扣子连接失败或超时")}
  if(!response.ok)throw new Error("扣子服务请求失败（HTTP "+response.status+"）");
  let envelope;try{envelope=await response.json()}catch(_){throw new Error("扣子返回内容格式不正确")}
  // Never forward raw vendor error messages: they can contain sensitive diagnostics.
  if(envelope.code!==0)throw new Error("扣子服务未成功完成请求");
  return envelope.data;
 }
 async function run(workflowId,parameters,signal){
  return decodeWorkflow(await call("/v1/workflow/run",{workflow_id:workflowId,parameters,
   ...(env.COZE_BOT_ID?{bot_id:env.COZE_BOT_ID}:{})},signal));
 }
 return {
  capabilities:{recognition,search},
  async recognize(imageBase64,mimeType){
   if(!recognition)return {status:"unconfigured"};
   const signal=AbortSignal.timeout(22000);
   const bytes=Buffer.from(imageBase64,"base64");
   const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[mimeType];
   if(!extension||bytes.length===0||bytes.length>5*1024*1024)throw new Error("图片格式不支持或超过 5MB");
   const form=new FormData();form.append("file",new Blob([bytes],{type:mimeType}),"dish."+extension);
   const uploaded=await call("/v1/files/upload",form,signal);
   if(!uploaded||typeof uploaded.id!=="string"||!uploaded.id)throw new Error("扣子未返回有效图片编号");
   return run(env.COZE_RECOGNITION_WORKFLOW_ID,{image:JSON.stringify({file_id:uploaded.id})},signal);
  },
  async search(query){
   if(!search)return {status:"unconfigured",quotes:[]};
   return run(env.COZE_SEARCH_WORKFLOW_ID,{
    name:query.name,city:query.city,
    current_time:new Date().toISOString(),
    instruction:"只提取可核验网页中的同城同名单品报价，不得使用估计价或人均消费。没有证据返回空数组。"
   },AbortSignal.timeout(22000));
  }
 };
}
module.exports={createCoze,decodeWorkflow};