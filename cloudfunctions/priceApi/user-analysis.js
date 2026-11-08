const {scorePrice}=require('./scoring');
const WINDOW_DAYS=90;
const normalized=v=>String(v||'').normalize('NFKC').replace(/\s+/g,'').trim();
function buildUserAnalysis(subject,records,{viewer='',subjectOwner='',now=Date.now(),truncated=false}={}){
 const seen=new Set(),references=[];const excludedOwners=new Set([subjectOwner||viewer].filter(Boolean));
 for(const q of [...records].sort((a,b)=>Date.parse(b.createdAt||b.observedAt)-Date.parse(a.createdAt||a.observedAt))){
  if(!q.owner||excludedOwners.has(q.owner)||q._id===subject.excludeId||q.postId===subject.excludeId&&q.owner===subjectOwner)continue;
  if(normalized(q.name)!==normalized(subject.name)||normalized(q.city)!==normalized(subject.city))continue;
  const time=Date.parse(q.observedAt);if(!Number.isFinite(time)||time>now||time<now-WINDOW_DAYS*86400000)continue;
  if(!Number.isFinite(q.price)||q.price<.01||q.price>1000000||q.priceType!==(subject.priceType||'paid'))continue;
  if((q.scene||'')!==(subject.scene||''))continue;
  if(seen.has(q.owner))continue;seen.add(q.owner);
  references.push({id:q._id,name:q.name,city:q.city,price:q.price,priceType:q.priceType,observedAt:q.observedAt,placeName:q.placeName||'',locationHint:q.locationHint||'',scene:q.scene||'',source:'user',verification:'user-reported'});
 }
 const wholeMeal=/一桌|这桌|整桌|一顿|这顿|一餐|账单|总价|总计|合计/.test(subject.name);
 const complex=/酒店|民宿|宾馆|客栈|大床房|双床房|机票|航班|hotel|flight/i.test(subject.name);
 const base={references,count:references.length,windowDays:WINDOW_DAYS,searchStatus:'disabled',algorithmVersion:'user-percentile-v1',updatedAt:new Date(now).toISOString(),sampleScope:'同城同名称、同价格类型、同场景的用户报价；规格尚未核实',truncated};
 if(wholeMeal)return {...base,status:'insufficient',reason:'conditions_required',message:'整顿或账单总价可以晒，但不能作为单品价格计算指数。'};
 if(complex)return {...base,status:'insufficient',reason:'conditions_required',message:'酒店或出行价格需要日期、房型等条件；当前仅展示报价，不给指数。'};
 const scored=scorePrice(subject.price,references.map(q=>q.price));return {...base,...scored,reason:scored.status==='ready'?'':'samples_required',message:scored.status==='ready'?'这是当前用户报价样本中的价格位置，不代表全城行情。':'需要至少 5 位其他用户的有效报价，目前 '+references.length+' 条。'};
}
module.exports={buildUserAnalysis};
