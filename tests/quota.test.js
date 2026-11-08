const {test}=require("node:test");const assert=require("node:assert/strict");
const {openDatabase}=require("../server/database");const {createLimitedFetch,period}=require("../server/quota");
const url="https://open.bigmodel.cn/api/paas/v4/web_search";
test("default gate blocks requests before network or counting",async()=>{
 const db=openDatabase(":memory:");let calls=0;
 try{const f=createLimitedFetch(db,{},async()=>{calls++});await assert.rejects(()=>f(url));assert.equal(calls,0);assert.equal(db.usage(period()).length,0)}finally{db.close()}
});
test("strict monthly allowance applies even under concurrent requests",async()=>{
 const db=openDatabase(":memory:");let calls=0;
 try{
  const f=createLimitedFetch(db,{EXTERNAL_AI_ENABLED:"true",AI_SEARCH_MONTHLY_LIMIT:"2"},async()=>{calls++;return {ok:true}});
  const r=await Promise.allSettled([f(url),f(url),f(url),f(url)]);
  assert.equal(r.filter(x=>x.status==="fulfilled").length,2);assert.equal(calls,2);assert.equal(db.usage(period())[0].used,2);
 }finally{db.close()}
});
test("China time month rollover has a new allowance and failed attempts remain counted",async()=>{
 const db=openDatabase(":memory:");let clock=new Date("2026-11-30T15:59:00Z"),calls=0;
 try{
  const f=createLimitedFetch(db,{EXTERNAL_AI_ENABLED:"true",AI_SEARCH_MONTHLY_LIMIT:"1"},async()=>{calls++;throw Error("offline")},()=>clock);
  await assert.rejects(()=>f(url));await assert.rejects(()=>f(url));assert.equal(calls,1);
  clock=new Date("2026-11-30T16:01:00Z");await assert.rejects(()=>f(url));assert.equal(calls,2);
  assert.equal(period(clock),"2026-12");
 }finally{db.close()}
});
test("unknown hosts and invalid limits never trigger network",async()=>{
 const db=openDatabase(":memory:");
 try{
  assert.throws(()=>createLimitedFetch(db,{AI_SEARCH_MONTHLY_LIMIT:"-1"}));
  const f=createLimitedFetch(db,{EXTERNAL_AI_ENABLED:"true",AI_SEARCH_MONTHLY_LIMIT:"1"},()=>{throw Error("unexpected network")});
  await assert.rejects(()=>f("https://unconfigured.example/search"),/未登记/);
 }finally{db.close()}
});
test("model, recognition and search have separate allowances",async()=>{
 const db=openDatabase(":memory:");let calls=0;
 try{
  const f=createLimitedFetch(db,{EXTERNAL_AI_ENABLED:"true",AI_RECOGNITION_MONTHLY_LIMIT:"1"},async()=>{calls++;return {ok:true}});
  const chat="https://open.bigmodel.cn/api/paas/v4/chat/completions";
  await f(chat,{body:JSON.stringify({messages:[{content:[{type:"image_url"}]}]})});
  await assert.rejects(()=>f(chat,{body:JSON.stringify({messages:[{content:"text"}]})}));
  await assert.rejects(()=>f(url));assert.equal(calls,1);
 }finally{db.close()}
});