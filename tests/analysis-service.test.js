const {test}=require("node:test");const assert=require("node:assert/strict");
const {openDatabase}=require("../server/database");const {createAnalysisService}=require("../server/analysis-service");
const subject={name:"蛋炒饭",city:"成都",price:25};
function quote(price){return {...subject,price,priceType:"paid",observedAt:new Date().toISOString(),note:""}}
test("sufficient unique user quotes avoid external calls and archive exact result",async()=>{
 const db=openDatabase(":memory:");
 try{
  for(let i=10;i<20;i++)db.addQuote(quote(i));
  const service=createAnalysisService({db,providers:{search(){throw new Error("must not call")}}});
  const result=await service.analyze(subject);
  assert.equal(result.count,10);assert.equal(result.searchStatus,"not_needed");
  assert.deepEqual(db.getAnalysis(result.analysisId).result.references,result.references);
  assert.equal(db.getAnalysis(result.analysisId).subject.price,25);
 }finally{db.close()}
});
test("cache reuses search but recalculates for current price and newly added quotes",async()=>{
 const db=openDatabase(":memory:");let calls=0;
 const service=createAnalysisService({db,providers:{search:async()=>{calls++;return {status:"ready",quotes:[]}}}});
 try{
  await service.analyze(subject);
  db.addQuote(quote(10));
  const second=await service.analyze({...subject,price:30});
  assert.equal(calls,1);assert.equal(second.count,1);assert.equal(second.searchDelivery,"cache");
  assert.equal(db.getAnalysis(second.analysisId).subject.price,30);
 }finally{db.close()}
});
test("expired search cache is refreshed and separated by city",async()=>{
 const db=openDatabase(":memory:");let clock=Date.now(),calls=0;
 const service=createAnalysisService({db,now:()=>clock,cacheTtlMs:1000,providers:{search:async()=>{calls++;return {status:"ready",quotes:[]}}}});
 try{
  await service.analyze(subject);clock+=1001;await service.analyze(subject);
  await service.analyze({...subject,city:"上海"});assert.equal(calls,3);
 }finally{db.close()}
});
test("concurrent identical lookups share only search, not analysis results",async()=>{
 const db=openDatabase(":memory:");let calls=0,release;
 const wait=new Promise(r=>{release=r});
 const service=createAnalysisService({db,providers:{search:async()=>{calls++;await wait;return {status:"ready",quotes:[]}}}});
 try{
  const one=service.analyze(subject),two=service.analyze({...subject,price:30});
  release();const [a,b]=await Promise.all([one,two]);assert.equal(calls,1);
  assert.notEqual(a.analysisId,b.analysisId);assert.equal(b.searchDelivery,"shared");
 }finally{db.close()}
});
test("failures have short cooldown and do not become successful samples",async()=>{
 const db=openDatabase(":memory:");let clock=Date.now(),calls=0;
 const service=createAnalysisService({db,now:()=>clock,failureTtlMs:100,providers:{search:async()=>{calls++;throw new Error("offline")}}});
 try{
  const a=await service.analyze(subject);await service.analyze(subject);assert.equal(calls,1);
  assert.equal(a.searchStatus,"failed");assert.equal(a.count,0);
  clock+=101;await service.analyze(subject);assert.equal(calls,2);
 }finally{db.close()}
});
test("expired search evidence is re-filtered even inside a valid cache",async()=>{
 const db=openDatabase(":memory:");let clock=Date.now();
 const q={...quote(15),observedAt:new Date(clock-90*86400000+1000).toISOString(),url:"https://example.com/menu",evidenceId:"menu",comparable:true};
 const service=createAnalysisService({db,now:()=>clock,providers:{search:async()=>({status:"ready",quotes:[q]})}});
 try{
  assert.equal((await service.analyze(subject)).count,1);clock+=2000;
  assert.equal((await service.analyze(subject)).count,0);
 }finally{db.close()}
});