const http=require("node:http");
const {createHash}=require("node:crypto");
const {decodeImage}=require("./media");
const {text,price,quoteInput}=require("./validation");
const {createAnalysisService}=require("./analysis-service");
async function readBody(req){
 let size=0;const chunks=[];
 for await (const part of req){size+=part.length;if(size>8*1024*1024)throw Object.assign(new Error("上传内容过大"),{status:413});chunks.push(part)}
 try{return JSON.parse(Buffer.concat(chunks).toString()||"{}")}catch(_){throw Object.assign(new Error("请求内容不是有效 JSON"),{status:400})}
}
function createServer({db,providers}){
 const analysisService=createAnalysisService({db,providers});
 return http.createServer(async(req,res)=>{
  function send(code,body){res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(body))}
  try{
   const url=new URL(req.url,"http://localhost");
   if(req.method==="GET"&&url.pathname==="/api/posts")return send(200,{posts:url.searchParams.get("city")?db.listPosts(text(url.searchParams.get("city"),"城市"),true,url.searchParams.get("name")?.trim()?text(url.searchParams.get("name"),"商品或服务名称"):""):[]});
   if(req.method==="POST"&&url.pathname==="/api/posts"){
     const body=await readBody(req);const input={...quoteInput(body),cityVisible:body.cityVisible===true},image=decodeImage(body);
     return send(201,{post:db.createPost(input,image)});
   }
   const mediaMatch=url.pathname.match(new RegExp("^/api/media/([a-f0-9-]+)$"));
   if(req.method==="GET"&&mediaMatch){
     const media=db.getMedia(mediaMatch[1]);if(!media)return send(404,{error:"照片不存在"});
     res.writeHead(200,{"Content-Type":media.mimeType,"Content-Length":media.bytes.length,"X-Content-Type-Options":"nosniff","Cache-Control":"private, max-age=3600"});
     return res.end(Buffer.from(media.bytes));
   }
   const postMatch=url.pathname.match(new RegExp("^/api/posts/([a-f0-9-]+)(?:/(replies|comments|reactions))?$"));
   if(postMatch){
     const post=db.getPost(postMatch[1]);if(!post)return send(404,{error:"这条晒价不存在"});
     if(req.method==="GET"&&!postMatch[2])return send(200,{post});
     if(req.method==="POST"&&postMatch[2]==="reactions"){
       const body=await readBody(req);
       if(!["normal","expensive","cheap"].includes(body.choice))throw new Error("请选择有效看法");
       if(typeof body.voterId!=="string"||!new RegExp("^[A-Za-z0-9-]{16,80}$").test(body.voterId))throw new Error("投票标识无效");
       return send(200,{reactions:db.react(post.id,createHash("sha256").update(body.voterId).digest("hex"),body.choice)});
     }
     if(req.method==="POST"&&postMatch[2]){
       const body=await readBody(req);
       const input=postMatch[2]==="replies"?quoteInput({...body,name:post.name,city:post.city}):{note:text(body.note,"留言",200)};
       return send(201,{reply:db.addReply(post.id,input,postMatch[2]==="replies")});
     }
   }
   if(req.method==="GET"&&url.pathname==="/api/health")return send(200,{status:"ok",capabilities:providers.capabilities});
   if(req.method==="GET"&&url.pathname==="/api/quotes")return send(200,{quotes:db.list(url.searchParams.get("name"),url.searchParams.get("city"))});
   if(req.method==="POST"&&url.pathname==="/api/quotes"){
     const input=quoteInput(await readBody(req));return send(201,{quote:db.addQuote(input)});
   }
   if(req.method==="POST"&&url.pathname==="/api/analyze"){
     const body=await readBody(req);
     const subject={name:text(body.name,"商品或服务名称"),city:text(body.city,"城市"),price:price(body.price),excludeId:body.excludeId};
     return send(200,await analysisService.analyze(subject));
   }
   if(req.method==="POST"&&url.pathname==="/api/recognize"){
     const body=await readBody(req);
     if(typeof body.imageBase64!=="string"||!body.imageBase64.length||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.imageBase64))throw new Error("图片内容格式不正确");
     if(!["image/jpeg","image/png","image/webp"].includes(body.mimeType))throw new Error("图片格式不支持，请手动填写");
     try{
      return send(200,await providers.recognize(body.imageBase64,body.mimeType))
     }
     catch(_){return send(502,{error:"识别服务暂不可用，可以手动填写"})}
   }
   send(404,{error:"未找到接口"});
  }catch(e){send(e.status||400,{error:e.status===413?e.message:"请求未完成："+e.message})}
 });
}
module.exports={createServer};