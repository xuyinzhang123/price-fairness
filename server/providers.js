
const {createCoze}=require("./coze");
const {createBigModel}=require("./bigmodel");
const {createVolcSearch}=require("./volc-search");
function normalizeRecognition(result){
 if(!result||typeof result!=="object")throw new Error("识别结果格式不正确");
 return {status:"ready",name:typeof result.name==="string"?result.name.trim().slice(0,80):"",
  price:typeof result.price==="number"&&Number.isFinite(result.price)&&result.price>=0.01&&result.price<=1000000?Math.round(result.price*100)/100:null,
  city:typeof result.city==="string"?result.city.trim().slice(0,80):""};
}
function createProviders(env=process.env,fetchImpl=fetch){
 const mode=env.AI_PROVIDER||"bridge";
 if(!["bridge","coze","bigmodel","disabled"].includes(mode))throw new Error("AI_PROVIDER 配置无效");
 const useVolc=env.SEARCH_PROVIDER==="volc";
 const directEnv=mode==="bigmodel"?env:{};
 const direct=createBigModel(directEnv,fetchImpl,useVolc?createVolcSearch(env,fetchImpl):null);
 const coze=createCoze(mode==="coze"?env:{},fetchImpl);
 async function invoke(url,payload){
  const response=await fetchImpl(url,{method:"POST",headers:{"Content-Type":"application/json",
   ...(env.AI_BRIDGE_TOKEN?{Authorization:"Bearer "+env.AI_BRIDGE_TOKEN}:{})},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error("外部 AI 服务暂不可用");
  return response.json();
 }
 return {
  capabilities:{recognition:direct.capabilities.recognition||coze.capabilities.recognition||(mode==="bridge" && !!env.RECOGNITION_BRIDGE_URL),search:(direct.capabilities.search&&(!useVolc||!!env.VOLC_SEARCH_API_KEY))||coze.capabilities.search||(mode==="bridge" && !!env.SEARCH_BRIDGE_URL)},
  async recognize(imageBase64,mimeType){
   if(direct.capabilities.recognition)return normalizeRecognition(await direct.recognize(imageBase64,mimeType));
   if(coze.capabilities.recognition)return normalizeRecognition(await coze.recognize(imageBase64,mimeType));
   if(mode!=="bridge" || !env.RECOGNITION_BRIDGE_URL)return {status:"unconfigured",message:"AI 识别未配置，请手动填写"};
   return normalizeRecognition(await invoke(env.RECOGNITION_BRIDGE_URL,{imageBase64,mimeType}));
  },
  async search(query){
   let result;
   if(useVolc&&!env.VOLC_SEARCH_API_KEY)return {status:"unconfigured",quotes:[]};
   if(direct.capabilities.search)result=await direct.search(query);
   else if(coze.capabilities.search)result=await coze.search(query);
   else if(mode==="bridge" && env.SEARCH_BRIDGE_URL)result=await invoke(env.SEARCH_BRIDGE_URL,query);
   else return {status:"unconfigured",quotes:[]};
   if(!result||!Array.isArray(result.quotes))throw new Error("搜索服务返回格式不正确");
   return {status:"ready",quotes:result.quotes.slice(0,100).filter(q=>q&&typeof q==="object"&&!Array.isArray(q))};
  }
 };
}
module.exports={createProviders};