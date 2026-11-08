const {buildAnalysis}=require("./analysis");
function createAnalysisService({db,providers,now=Date.now,cacheTtlMs=6*3600000,failureTtlMs=30000}){
 const inFlight=new Map();
 function key(subject){return JSON.stringify(["search-v1",subject.city,subject.name])}
 async function search(subject){
  const cacheKey=key(subject);const cached=db.getSearch(cacheKey,now());
  if(cached)return {...cached,delivery:"cache"};
  if(inFlight.has(cacheKey))return {...await inFlight.get(cacheKey),delivery:"shared"};
  const pending=(async()=>{
   let result;
   try{result=await providers.search({name:subject.name,city:subject.city})}
   catch(_){result={status:"failed",quotes:[]}}
   if(result.status==="ready")db.cacheSearch(cacheKey,result,now()+cacheTtlMs);
   else if(result.status==="failed")db.cacheSearch(cacheKey,result,now()+failureTtlMs);
   return result;
  })();
  inFlight.set(cacheKey,pending);
  try{return {...await pending,delivery:"fresh"}}finally{inFlight.delete(cacheKey)}
 }
 return {
  async analyze(subject){
   const users=db.list(subject.name,subject.city);
   const existing=buildAnalysis(subject,users,{status:"not_needed",quotes:[]},now());
   let result;
   if(existing.count>=10){
    result={...existing,searchDelivery:"skipped",referenceMode:"user"};
   }else{
    const found=await search(subject);
    result={...buildAnalysis(subject,db.list(subject.name,subject.city),found,now()),searchDelivery:found.delivery,referenceMode:"mixed"};
   }
   const analysisId=db.saveAnalysis(subject,result);
   return {...result,analysisId};
  }
 };
}
module.exports={createAnalysisService};