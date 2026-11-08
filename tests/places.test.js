const {test}=require("node:test");const assert=require("node:assert/strict");
const {openDatabase}=require("../server/database");const {buildAnalysis}=require("../server/analysis");
const {quoteInput}=require("../server/validation");const {DatabaseSync}=require("node:sqlite");
const {mkdtempSync,rmSync}=require("node:fs");const os=require("node:os"),path=require("node:path");
const quote={name:"蛋炒饭",city:"成都",price:15,priceType:"paid",observedAt:new Date().toISOString(),placeName:"人民路炒饭摊",locationHint:"地铁 A 口旁",scene:"地摊"};
test("place metadata survives original post, independent reply and scoring reference",()=>{
 const db=openDatabase(":memory:");
 try{
  const p=db.createPost(quoteInput(quote),null);
  assert.equal(p.placeName,quote.placeName);assert.equal(p.scene,"地摊");
  db.addReply(p.id,quoteInput({...quote,placeName:"另一家店",scene:"街边店",price:18}),true);
  const detail=db.getPost(p.id);assert.equal(detail.replies[0].placeName,"另一家店");
  assert.equal(detail.placeName,quote.placeName);
  const a=buildAnalysis({...quote,price:25},db.list(quote.name,quote.city),{status:"unconfigured",quotes:[]});
  assert.equal(a.references.length,2);assert.ok(a.references.some(r=>r.locationHint==="地铁 A 口旁"));
 }finally{db.close()}
});
test("distinct merchants with same price remain distinct references",()=>{
 const db=openDatabase(":memory:");
 try{
  db.addQuote(quoteInput(quote));db.addQuote(quoteInput({...quote,placeName:"另一摊"}));
  const a=buildAnalysis({...quote,price:20},db.list(),{status:"ready",quotes:[]});
  assert.equal(a.count,2);
 }finally{db.close()}
});
test("optional place fields accept omission but reject invalid scene and excessive length",()=>{
 assert.equal(quoteInput({...quote,placeName:undefined,locationHint:undefined,scene:undefined}).placeName,"");
 assert.throws(()=>quoteInput({...quote,scene:"自定义非法类型"}));
 assert.throws(()=>quoteInput({...quote,placeName:"店".repeat(121)}));
});
test("existing database opens with empty metadata and new places persist after restart",()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"fair-places-")),file=path.join(dir,"prices.sqlite");
 const raw=new DatabaseSync(file);raw.exec("CREATE TABLE quotes(id TEXT PRIMARY KEY,name TEXT,city TEXT,price_cents INTEGER,price_type TEXT,observed_at TEXT,note TEXT,created_at TEXT)");
 raw.prepare("INSERT INTO quotes VALUES(?,?,?,?,?,?,?,?)").run("old","面","成都",1200,"seen",quote.observedAt,"",quote.observedAt);raw.close();
 let db=openDatabase(file);
 try{
  assert.equal(db.list()[0].placeName,"");const p=db.createPost(quoteInput(quote),null);
  db.close();db=openDatabase(file);assert.equal(db.getPost(p.id).locationHint,quote.locationHint);
 }finally{db.close();rmSync(dir,{recursive:true,force:true})}
});