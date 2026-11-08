const store=require("../../utils/store");
const api=require("../../utils/api");
const {WIDTH,HEIGHT,drawCard}=require("../../utils/poster");
Page({data:{draft:{},count:0,published:false,busy:false,analysis:null,error:"",cloud:false,cityVisible:false,
 preview:"",cardBusy:true,cardError:"",showReferences:false,showOptions:false,saving:false,publishing:false},
onLoad(){this.setData({cloud:api.enabled()})},
onShow(){
 const draft=wx.getStorageSync("price-fairness-draft");
 if(!draft){wx.switchTab({url:"/pages/camera/index"});return}
 this.setData({draft});this.analyze();
},
onReady(){
 wx.createSelectorQuery().in(this).select("#result-card").fields({node:true,size:true}).exec(r=>{
  if(!r[0]||!r[0].node){this.setData({cardBusy:false,cardError:"卡片暂未生成，可以重试"});return}
  this.canvas=r[0].node;this.canvas.width=WIDTH;this.canvas.height=HEIGHT;this.renderCard();
 });
},
onUnload(){this.closed=true;this.renderId=(this.renderId||0)+1},
async analyze(){
 const draft=this.data.draft;if(!draft.name)return;
 if(!api.enabled()){this.setData({count:store.read().filter(x=>x.name===draft.name&&x.city===draft.city&&x.price>0).length});this.renderCard();return}
 this.setData({busy:true,error:""});
 try{const analysis=await api.request("/api/analyze",{...draft,excludeId:this.quoteId});this.setData({analysis,count:analysis.count})}
 catch(_){this.setData({analysis:null,error:"暂时没找到参考价，先让朋友评评理。"})}
 finally{this.setData({busy:false});this.renderCard()}
},
async renderCard(){
 if(!this.canvas||!this.data.draft.name)return;
 const id=this.renderId=(this.renderId||0)+1;this.setData({cardBusy:true,cardError:"",preview:""});
 try{
  let image=null;
  if(this.data.draft.image){
   if(!this.photo){
    const info=await new Promise((resolve,reject)=>wx.getImageInfo({src:this.data.draft.image,success:resolve,fail:reject}));
    image=this.canvas.createImage();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=info.path});this.photo=image;
   }else image=this.photo;
  }
  if(this.closed||id!==this.renderId)return;
  drawCard(this.canvas.getContext("2d"),this.data.draft,this.data.analysis,{theme:"receipt",fit:"cover",position:0.5,brightness:6},image);
  const output=await new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvas:this.canvas,fileType:"png",width:WIDTH,height:HEIGHT,destWidth:WIDTH,destHeight:HEIGHT,success:resolve,fail:reject},this));
  if(!this.closed&&id===this.renderId)this.setData({preview:output.tempFilePath,cardBusy:false});
 }catch(_){if(!this.closed&&id===this.renderId)this.setData({cardBusy:false,cardError:"照片没能生成卡片，再试一次？"})}
},
noop(){},closeSheet(){this.setData({showReferences:false,showOptions:false})},
toggleReferences(){this.setData({showReferences:!this.data.showReferences,showOptions:false})},
toggleOptions(){this.setData({showOptions:!this.data.showOptions,showReferences:false})},
visibilityChange(e){this.setData({cityVisible:e.detail.value})},
editCard(){
 const id=this.postId||"draft";wx.setStorageSync("price-fairness-poster",{post:{...this.data.draft,id},analysis:this.data.analysis});
 wx.navigateTo({url:"/pages/poster/index?id="+id});
},
previewCard(){if(this.data.preview)wx.previewImage({urls:[this.data.preview]})},
async saveCard(){
 if(!this.data.preview||this.data.cardBusy||this.data.busy||this.data.saving)return;this.setData({saving:true});
 try{await new Promise((resolve,reject)=>wx.saveImageToPhotosAlbum({filePath:this.data.preview,success:resolve,fail:reject}));wx.showToast({title:"已保存，去晒一下"})}
 catch(_){wx.showToast({title:"未能保存，可查看大图后重试",icon:"none"})}finally{this.setData({saving:false})}
},
async publish(){
 if(this.publishing)return;
 if(this.postId){wx.navigateTo({url:"/pages/detail/index?id="+this.postId});return}
 this.publishing=true;this.setData({publishing:true});
 try{
  if(api.enabled()){
   const {image,...payload}=this.data.draft;
   const r=await api.request("/api/posts",{...payload,cityVisible:this.data.cityVisible,...await api.imagePayload(image)});
   this.quoteId=r.post.quoteId;this.postId=r.post.id;
  }else {const post=store.save({...this.data.draft,cityVisible:this.data.cityVisible});this.postId=post.id;}
  this.setData({published:true});wx.navigateTo({url:"/pages/detail/index?id="+this.postId});
 }catch(e){wx.showModal({title:"晒价未发布",content:e.message||"上传失败，请稍后重试",showCancel:false})}finally{this.publishing=false;this.setData({publishing:false})}
},
quote(){wx.navigateTo({url:"/pages/quote/index?name="+encodeURIComponent(this.data.draft.name)+"&city="+encodeURIComponent(this.data.draft.city)})}
});