const {test}=require("node:test");const assert=require("node:assert/strict");
const {mkdtempSync,rmSync}=require("node:fs");const os=require("node:os");const path=require("node:path");
const {openDatabase}=require("../server/database");const {createServer}=require("../server/app");
const {decodeImage}=require("../server/media");
const providers={capabilities:{recognition:false,search:false},search:async()=>({status:"unconfigured",quotes:[]})};
const imageBase64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
const quote={name:"蛋炒饭",city:"成都",price:25,priceType:"paid",observedAt:new Date().toISOString()};
test("post image, attached quote and comment survive server restart without mixing posts",async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"fair-posts-"));const file=path.join(dir,"prices.sqlite");let db=openDatabase(file),server;
 let postId,mediaPath;
 try{
  server=createServer({db,providers});await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const base="http://127.0.0.1:"+server.address().port;
  const post=async(route,data)=>{const r=await fetch(base+route,{method:"POST",body:JSON.stringify(data)});return {status:r.status,...await r.json()}};
  const created=await post("/api/posts",{...quote,imageBase64,mimeType:"image/png"});
  assert.equal(created.status,201);postId=created.post.id;mediaPath=created.post.image;
  assert.notEqual(created.post.id,created.post.quoteId);
  const photo=await fetch(base+mediaPath);assert.equal(photo.headers.get("content-type"),"image/png");
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()),Buffer.from(imageBase64,"base64"));
  const reply=await post("/api/posts/"+postId+"/replies",{...quote,name:"恶意改名",city:"别的城市",price:15,note:"本地昨天吃的"});
  assert.equal(reply.status,201);
  const comment=await post("/api/posts/"+postId+"/comments",{note:"这个位置偏贵"});
  assert.equal(comment.status,201);
  const second=await post("/api/posts",{...quote,price:30});
  assert.equal((await (await fetch(base+"/api/posts/"+second.post.id)).json()).post.replies.length,0);
  const detail=(await (await fetch(base+"/api/posts/"+postId)).json()).post;
  assert.equal(detail.replies.length,2);
  assert.equal(db.list("蛋炒饭","成都").some(q=>q.price===15),true);
  assert.equal(db.list("恶意改名","别的城市").length,0);
  assert.equal(db.list().length,3); // Two posts + one price reply; comment is not a price.
  const result=await post("/api/analyze",{...quote,excludeId:created.post.quoteId});
  assert.equal(result.references.some(q=>q.id===created.post.quoteId),false);
  assert.equal(result.references.some(q=>q.price===15),true);
  const missing=await post("/api/posts/00000000/replies",quote);assert.equal(missing.status,404);
  const blank=await post("/api/posts/"+postId+"/comments",{note:" "});assert.equal(blank.status,400);
  const invalid=await post("/api/posts",{...quote,imageBase64,mimeType:"image/jpeg"});assert.equal(invalid.status,400);
  assert.equal(db.listPosts().length,2); // Failed photo submission left no post or quote.
  assert.equal(db.list().length,3);
  await new Promise(r=>server.close(r));server=null;db.close();db=openDatabase(file);
  assert.equal(db.getPost(postId).replies.length,2);
  assert.deepEqual(Buffer.from(db.getMedia(mediaPath.split("/").pop()).bytes),Buffer.from(imageBase64,"base64"));
 }finally{
  if(server)await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true});
 }
});
test("reject non-image content and mime mismatch before storing",()=>{
 assert.equal(decodeImage({}),null);
 assert.throws(()=>decodeImage({imageBase64:Buffer.from("<script>evil</script>").toString("base64"),mimeType:"image/png"}));
 assert.throws(()=>decodeImage({imageBase64,mimeType:"text/html"}));
 assert.throws(()=>decodeImage({imageBase64:"%%%=",mimeType:"image/png"}));
});
test("post transaction rolls back quote when media insertion fails",()=>{
 const db=openDatabase(":memory:");
 try{assert.throws(()=>db.createPost({...quote,note:""},{mimeType:"image/png",bytes:undefined}));assert.equal(db.list().length,0);assert.equal(db.listPosts().length,0)}
 finally{db.close()}
});
test("city dish search filters before limiting and excludes private posts",()=>{
 const db=openDatabase(":memory:");
 try{
  db.createPost({...quote,name:"肉丝炒饭",cityVisible:true});
  db.createPost({...quote,name:"面条",cityVisible:true});
  db.createPost({...quote,name:"蛋炒饭",cityVisible:false});
  db.createPost({...quote,name:"蛋炒饭",city:"上海",cityVisible:true});
  assert.deepEqual(db.listPosts("成都",true,"炒饭").map(p=>p.name),["肉丝炒饭"]);
  assert.equal(db.listPosts("成都",true,"不存在").length,0);
  assert.equal(db.listPosts("成都",true).length,2);
 }finally{db.close()}
});
