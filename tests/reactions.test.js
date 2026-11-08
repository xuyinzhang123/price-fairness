const {test}=require("node:test");const assert=require("node:assert/strict");
const {openDatabase}=require("../server/database");const {createServer}=require("../server/app");
test("city discovery is opt-in; reactions are mutable opinions, never price samples",async()=>{
 const db=openDatabase(":memory:");const providers={capabilities:{},search:async()=>({status:"unconfigured",quotes:[]})};
 const server=createServer({db,providers});await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const request=async(route,body)=>{const r=await fetch(base+route,body?{method:"POST",body:JSON.stringify(body)}:{});return {status:r.status,...await r.json()}};
 const q={name:"蛋炒饭",city:"成都",price:25,priceType:"paid",observedAt:new Date().toISOString()};
 try{
  const hidden=(await request("/api/posts",q)).post;
  const visible=(await request("/api/posts",{...q,cityVisible:true})).post;
  await request("/api/posts",{...q,city:"上海",cityVisible:true});
  assert.equal(hidden.cityVisible,false);assert.equal(visible.cityVisible,true);
  assert.equal((await request("/api/posts")).posts.length,0);
  const list=(await request("/api/posts?city="+encodeURIComponent("成都"))).posts;
  assert.equal(list.length,1);assert.equal(list[0].id,visible.id);
  assert.equal((await request("/api/posts/"+hidden.id)).status,200); // Unlisted, shareable, not access-controlled.
  const route="/api/posts/"+visible.id+"/reactions";
  const first=await request(route,{voterId:"device-1234567890123456",choice:"expensive"});
  assert.equal(first.reactions.expensive,1);
  await request(route,{voterId:"device-1234567890123456",choice:"expensive"});
  const changed=await request(route,{voterId:"device-1234567890123456",choice:"normal"});
  assert.equal(changed.reactions.expensive,0);assert.equal(changed.reactions.normal,1);
  assert.equal((await request(route,{voterId:"device-1234567890123456",choice:"bad"})).status,400);
  const count=db.list().length;
  await request(route,{voterId:"device-abcdefghijklmnop",choice:"cheap"});
  assert.equal(db.list().length,count);
  const result=await request("/api/analyze",{...q,excludeId:visible.quoteId});assert.equal(result.count,1);
  assert.deepEqual((await request("/api/posts/"+visible.id)).post.reactions,{normal:1,expensive:0,cheap:1});
 }finally{await new Promise(r=>server.close(r));db.close()}
});