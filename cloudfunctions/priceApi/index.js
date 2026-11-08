const deployment=require("./deployment.json");
const cloud=require('wx-server-sdk');
const {randomUUID,createHash}=require('crypto');
const {quoteInput,text,price}=require('./validation');
const {decodeImage}=require('./media');
cloud.init({env:cloud.DYNAMIC_CURRENT_ENV});
const db=cloud.database();
const posts=db.collection('price_posts'),replies=db.collection('price_replies'),votes=db.collection('price_votes');
function clean(doc){if(!doc)return null;const {_id,_openid,owner,...rest}=doc;return {...rest,id:_id,quoteId:_id};}
async function getPost(id){try{return (await posts.doc(id).get()).data}catch(e){if(e.errCode===-1||String(e.errMsg||e.message).includes('not exist'))return null;throw e}}
async function reactions(id){const counts={normal:0,expensive:0,cheap:0};await Promise.all(Object.keys(counts).map(async choice=>{counts[choice]=(await votes.where({postId:id,choice}).count()).total}));return counts;}
async function images(items){const ids=[...new Set(items.map(p=>p.image).filter(Boolean))];if(!ids.length)return items;const result=await cloud.getTempFileURL({fileList:ids});const urls=new Map(result.fileList.map(f=>[f.fileID,f.tempFileURL]));return items.map(p=>({...p,image:urls.get(p.image)||''}));}
exports.main=async(event)=>{
 try{
 const {OPENID,APPID}=cloud.getWXContext();if(!OPENID||APPID!==deployment.appId)throw Error('请通过本小程序访问');
 const route=new URL(event.path||'','https://local.invalid'),method=event.method||'POST',body=event.data||{};
 if(route.pathname==='/api/health')return {status:'ok',capabilities:{recognition:false,search:false}};
 if(route.pathname==='/api/upload-target'&&method==='POST'){const ownerKey=createHash('sha256').update(OPENID).digest('hex');return {cloudPath:'prices/'+ownerKey+'/'+randomUUID()+'.jpg'};}
 if(route.pathname==='/api/recognize')return {status:'unconfigured'};
 if(route.pathname==='/api/analyze'){text(body.name,'名称');text(body.city,'城市');price(body.price);return {status:'insufficient',count:0,references:[],searchStatus:'disabled',windowDays:90};}
 if(route.pathname==='/api/mine'&&method==='GET')return {count:(await posts.where({owner:OPENID}).count()).total};
 if(route.pathname==='/api/posts'&&method==='GET'){
 const city=text(route.searchParams.get('city'),'城市'),name=(route.searchParams.get('name')||'').trim();
 const filter={city,cityVisible:true};if(name)filter.name=db.RegExp({regexp:text(name,'名称').replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),options:'i'});
 return {posts:await images((await posts.where(filter).orderBy('createdAt','desc').limit(100).get()).data.map(clean))};
 }
 if(route.pathname==='/api/posts'&&method==='POST'){
 const input=quoteInput(body),image=decodeImage(body),id=randomUUID();let fileID='';
 if(body.imageFileId){
  const ownerKey=createHash('sha256').update(OPENID).digest('hex');
  const expected='/prices/'+ownerKey+'/';const ref=body.imageFileId;
  if(typeof ref!=='string'||!ref.startsWith('cloud://'+deployment.cloudEnv+'.')||!ref.includes(expected)||!(/^[a-f0-9-]+[.]jpg$/).test(ref.split(expected)[1]||''))throw Error('照片归属无效，请重新选择上传');
  fileID=ref;
 }
 if(image){if(image.bytes.length>2*1024*1024)throw Error('照片过大，请选择较小的照片（2MB以内）');fileID=(await cloud.uploadFile({cloudPath:'prices/'+id+'.'+(image.mimeType==='image/png'?'png':image.mimeType==='image/webp'?'webp':'jpg'),fileContent:image.bytes})).fileID;}
 const record={...input,owner:OPENID,createdAt:new Date().toISOString(),cityVisible:body.cityVisible===true,image:fileID};
 try{await posts.doc(id).set({data:record})}catch(e){if(fileID)await cloud.deleteFile({fileList:[fileID]}).catch(()=>{});throw e}
 return {post:(await images([clean({...record,_id:id})]))[0]};
 }
 const match=route.pathname.match(/^\/api\/posts\/([a-f0-9-]+)(?:\/(comments|replies|reactions))?$/);
 if(match){
 const id=match[1],record=await getPost(id);if(!record)throw Error('这条晒价不存在');
 if(method==='GET'&&!match[2]){const post=(await images([clean({...record,_id:id})]))[0];post.replies=(await replies.where({postId:id}).orderBy('createdAt','desc').limit(100).get()).data.map(clean);post.reactions=await reactions(id);return {post};}
 if(method==='POST'&&match[2]==='reactions'){
 if(!['normal','expensive','cheap'].includes(body.choice))throw Error('请选择有效看法');
 const voteId=createHash('sha256').update(id+':'+OPENID).digest('hex');await votes.doc(voteId).set({data:{postId:id,owner:OPENID,choice:body.choice}});return {reactions:await reactions(id)};
 }
 if(method==='POST'&&['comments','replies'].includes(match[2])){
 const input=match[2]==='replies'?quoteInput({...body,name:record.name,city:record.city}):{note:text(body.note,'留言',200),price:null};
 const reply={...input,postId:id,owner:OPENID,createdAt:new Date().toISOString()};const added=await replies.add({data:reply});return {reply:clean({...reply,_id:added._id})};
 }
 }
 throw Error('未找到接口');
 }catch(e){console.error('priceApi request failed',e.errCode||e.code||'validation');return {error:e.errCode?'云端暂不可用，请确认集合和索引已创建':e.message||'请求失败'};}
};
