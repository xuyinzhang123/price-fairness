const {test}=require("node:test");const assert=require("node:assert/strict");
const {createProviders}=require("../server/providers");
const env={AI_PROVIDER:"bigmodel",BIGMODEL_API_KEY:"test-secret",BIGMODEL_VISION_MODEL:"configured-vision",BIGMODEL_TEXT_MODEL:"configured-text"};
const reply=data=>({ok:true,json:async()=>data});
test("direct recognition preserves null price and sends image to official endpoint",async()=>{
 const p=createProviders(env,async(url,options)=>{
  assert.equal(url,"https://open.bigmodel.cn/api/paas/v4/chat/completions");
  const b=JSON.parse(options.body);assert.equal(b.model,"configured-vision");assert.equal(b.messages[1].content[0].image_url.url,"data:image/png;base64,AAAA");
  return reply({choices:[{message:{content:'{"name":"蛋炒饭","price":null,"city":""}'}}]});
 });
 assert.equal((await p.recognize("AAAA","image/png")).price,null);
});
test("direct search rejects invented sources, amounts and dates",async()=>{
 let calls=0;
 const p=createProviders(env,async(url)=>{
  calls++;
  if(url.endsWith("web_search"))return reply({search_result:[{link:"https://example.com/menu",content:"2026-11-01 成都蛋炒饭18元"}]});
  return reply({choices:[{message:{content:JSON.stringify({quotes:[
   {sourceIndex:0,price:18,priceType:"seen",observedAt:"2026-11-01T00:00:00Z",evidence:"成都蛋炒饭18元",dateEvidence:"2026-11-01",comparable:true},
   {sourceIndex:999,price:1,evidence:"乱填"},
   {sourceIndex:0,price:1,evidence:"成都蛋炒饭18元",dateEvidence:"2026-11-01",observedAt:"2026-11-01"},
   {sourceIndex:0,price:18,evidence:"成都蛋炒饭18元",dateEvidence:"2026-11-01",observedAt:"2026-11-02"}
  ]})}}]});
 });
 const r=await p.search({name:"蛋炒饭",city:"成都"});assert.equal(calls,2);assert.equal(r.quotes.length,1);assert.equal(r.quotes[0].url,"https://example.com/menu");
});
test("empty search does not invoke extraction model",async()=>{
 let calls=0;const p=createProviders(env,async()=>{calls++;return reply({search_result:[]})});
 assert.equal((await p.search({name:"面",city:"成都"})).quotes.length,0);assert.equal(calls,1);
});
test("missing direct configuration never makes requests",async()=>{
 const p=createProviders({AI_PROVIDER:"bigmodel"},()=>{throw new Error("unexpected request")});
 assert.equal(p.capabilities.search,false);assert.equal((await p.search({})).status,"unconfigured");
});