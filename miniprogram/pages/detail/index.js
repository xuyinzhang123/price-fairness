const api=require("../../utils/api");const store=require("../../utils/store");
Page({data:{post:null,error:"",showReferences:false,loading:true,note:"",cloud:false,analysis:null,reactions:{normal:0,expensive:0,cheap:0},selected:""},
onLoad(q){this.id=q.id||"";this.setData({cloud:api.enabled()})},
onShow(){this.load()},
async load(){
 this.setData({loading:true,error:"",analysis:null,reactions:{normal:0,expensive:0,cheap:0},selected:""});
 try{
  let post;
  if(api.enabled())post=(await api.request("/api/posts/"+this.id,undefined,"GET")).post;
  else{
   const all=store.read();post=all.find(p=>p.id===this.id);
   if(post)post={...post,replies:all.filter(p=>p.parentId===this.id)};
  }
  if(!post)throw new Error("这条晒价不存在");
  this.setData({post:{...post,image:api.imageUrl(post.image)},reactions:post.reactions||{normal:0,expensive:0,cheap:0},loading:false});
  if(api.enabled()){
   try{const analysis=await api.request("/api/analyze",{name:post.name,city:post.city,price:post.price,priceType:post.priceType,scene:post.scene,excludeId:post.quoteId});
    this.setData({analysis})}catch(_){this.setData({analysis:null})}
  }
 }catch(e){this.setData({error:e.message,loading:false})}
},
toggleReferences(){this.setData({showReferences:!this.data.showReferences})},
poster(){
 if(!this.data.post)return;
 wx.setStorageSync("price-fairness-poster",{post:this.data.post,analysis:this.data.analysis});
 wx.navigateTo({url:"/pages/poster/index?id="+encodeURIComponent(this.id)});
},
onShareAppMessage(){
 const p=this.data.post;
 if(!api.enabled()||!p)return {title:"这价格，冤不冤？",path:"/pages/camera/index"};
 return {title:p.name+"花了 ¥"+p.price+"，我冤不冤？来评评理",
  path:"/pages/detail/index?id="+encodeURIComponent(this.id),
  ...(p.image?{imageUrl:p.image}:{})};
},
async vote(e){
 if(this.voting)return;
 const choice=e.currentTarget.dataset.choice;if(!["normal","expensive","cheap"].includes(choice))return;
 if(!api.enabled()){wx.showToast({title:"连接后台后才能和朋友投票",icon:"none"});return}
 this.voting=true;
 try{
  let voterId=wx.getStorageSync("price-fairness-voter");
  if(!voterId){voterId="device-"+Date.now()+"-"+Math.random().toString(36).slice(2);wx.setStorageSync("price-fairness-voter",voterId)}
  const result=await api.request("/api/posts/"+this.id+"/reactions",{choice,voterId});
  this.setData({reactions:result.reactions,selected:choice});
 }catch(e){wx.showToast({title:e.message,icon:"none"})}finally{this.voting=false}
},
quote(){const p=this.data.post;wx.navigateTo({url:"/pages/quote/index?postId="+this.id+"&name="+encodeURIComponent(p.name)+"&city="+encodeURIComponent(p.city)})},
input(e){this.setData({note:e.detail.value})},
async comment(){
 if(this.sending||!this.data.note.trim())return;this.sending=true;
 try{
  if(api.enabled())await api.request("/api/posts/"+this.id+"/comments",{note:this.data.note.trim()});
  else store.save({parentId:this.id,note:this.data.note.trim(),kind:"comment"});
  this.setData({note:""});await this.load();
 }catch(e){wx.showToast({title:e.message,icon:"none"})}finally{this.sending=false}
},
preview(){if(this.data.post.image)wx.previewImage({urls:[this.data.post.image]})}
});