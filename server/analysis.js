const {scorePrice}=require("../miniprogram/utils/scoring");
function buildAnalysis(subject,userQuotes,searchResult,now=Date.now()) {
  const cutoff=now-90*86400000;
  const seen=new Set();
  const candidates=[
    ...userQuotes.map(q=>({...q,source:"user"})),
    ...searchResult.quotes.map(q=>({...q,source:"web"}))
  ];
  const references=[];
  for(const q of candidates){
    if(q.name!==subject.name || q.city!==subject.city || (subject.excludeId && q.id===subject.excludeId)) continue;
    if(typeof q.price!=="number" || !Number.isFinite(q.price) || q.price<0.01) continue;
    const occurred=Date.parse(q.observedAt);
    if(!Number.isFinite(occurred)||occurred<cutoff||occurred>now) continue;
    let key;
    if(q.source==="web"){
      if(!["paid","seen"].includes(q.priceType)) continue;
      // Only explicitly confirmed single-item quotes with traceable evidence qualify.
      if(q.comparable!==true || !q.evidenceId || typeof q.evidenceId!=="string") continue;
      try {const u=new URL(q.url);if(!["https:","http:"].includes(u.protocol))continue}catch(_){continue}
      key="web:"+q.evidenceId;
    } else {
      if(!["paid","seen"].includes(q.priceType)) continue;
      // Conservative temporary deduplication until authenticated contributors are available.
      key=["user",q.name,q.city,Math.round(q.price*100),q.priceType,q.observedAt.slice(0,10),q.placeName||"",q.locationHint||"",q.scene||""].join("|");
    }
    if(seen.has(key))continue;
    seen.add(key);
    references.push({id:q.id||key,name:q.name,city:q.city,price:q.price,priceType:q.priceType,
      placeName:q.placeName||"",locationHint:q.locationHint||"",scene:q.scene||"",observedAt:q.observedAt,source:q.source,...(q.source==="web"?{url:q.url}:{})});
  }
  return {...scorePrice(subject.price,references.map(q=>q.price)),references,
    searchStatus:searchResult.status,algorithmVersion:"percentile-v1",windowDays:90,
    updatedAt:new Date(now).toISOString()};
}
module.exports={buildAnalysis};