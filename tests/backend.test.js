const {test}=require("node:test");const assert=require("node:assert/strict");
const {mkdtempSync,rmSync}=require("node:fs");const os=require("node:os");const path=require("node:path");
const {openDatabase}=require("../server/database");const {createServer}=require("../server/app");
const {buildAnalysis}=require("../server/analysis");
const providers={capabilities:{recognition:false,search:false},search:async()=>({status:"unconfigured",quotes:[]}),recognize:async()=>({status:"unconfigured"})};
test("HTTP: persistence, duplicate filtering, subject exclusion and validation",async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"price-fairness-"));const file=path.join(dir,"prices.sqlite");let db=openDatabase(file);
 const server=createServer({db,providers});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const post=async(route,body)=>{const r=await fetch(base+route,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}};
 const quote={name:"蛋炒饭",city:"成都",priceType:"paid",observedAt:new Date().toISOString()};
 try{
  assert.equal((await post("/api/quotes",{...quote,price:0})).status,400);
  for(const price of [10,12,15,18,20,20])assert.equal((await post("/api/quotes",{...quote,price})).status,201);
  const subject=(await post("/api/quotes",{...quote,price:25})).body.quote;
  await post("/api/quotes",{...quote,city:"上海",price:100});
  const r=await post("/api/analyze",{...quote,price:25,excludeId:subject.id});
  assert.equal(r.body.count,5);assert.equal(r.body.score,100);assert.equal(r.body.searchStatus,"unconfigured");
  assert.equal(r.body.references.some(q=>q.id===subject.id),false);
 }finally{await new Promise(r=>server.close(r));db.close()}
 try{db=openDatabase(file);assert.equal(db.list().length,8)}finally{db.close();rmSync(dir,{recursive:true,force:true})}
});
test("search quotes require comparable conditions, date, source and unique evidence",()=>{
 const now=Date.now();const subject={name:"蛋炒饭",city:"成都",price:25};
 const q={...subject,price:15,priceType:"seen",comparable:true,url:"https://example.com/menu",evidenceId:"menu-a",observedAt:new Date(now-1000).toISOString()};
 const result=buildAnalysis(subject,[],{status:"ready",quotes:[q,{...q,url:"https://example.org/repost"},{...q,evidenceId:"b",city:"上海"},{...q,evidenceId:"c",comparable:false},{...q,evidenceId:"d",observedAt:""},{...q,evidenceId:"e",observedAt:new Date(now-91*86400000).toISOString()}]},now);
 assert.equal(result.count,1);assert.equal(result.status,"insufficient");
});
test("search failure still returns available user references",async()=>{
 const db=openDatabase(":memory:");const server=createServer({db,providers:{...providers,search:async()=>{throw new Error("timeout")}}});
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 try{const r=await fetch("http://127.0.0.1:"+server.address().port+"/api/analyze",{method:"POST",body:JSON.stringify({name:"面",city:"成都",price:12})});const b=await r.json();assert.equal(r.status,200);assert.equal(b.searchStatus,"failed");assert.equal(b.status,"insufficient")}
 finally{await new Promise(r=>server.close(r));db.close()}
});