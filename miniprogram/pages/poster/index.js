const {WIDTH,HEIGHT,drawCard}=require("../../utils/poster");
Page({data:{theme:"receipt",fit:"cover",position:0.5,brightness:6,hideCity:false,busy:true,error:"",preview:"",saving:false,showEditor:false},
onLoad(q){
 const draft=wx.getStorageSync("price-fairness-poster");
 if(!draft||!draft.post||draft.post.id!==q.id){this.setData({error:"请从晒价详情页重新生成分享卡",busy:false});return}
 this.post=draft.post;this.analysis=draft.analysis;
},
onReady(){
 if(!this.post)return;
 wx.createSelectorQuery().in(this).select("#poster").fields({node:true,size:true}).exec(result=>{
  const canvas=result[0]&&result[0].node;
  if(!canvas){this.setData({error:"画布暂不可用，请重新打开",busy:false});return}
  this.canvas=canvas;canvas.width=WIDTH;canvas.height=HEIGHT;
  this.render();
 });
},
onUnload(){this.renderId=(this.renderId||0)+1;this.closed=true},
async getImage(){
 if(!this.post.image)return null;
 if(this.image)return this.image;
 const source=await new Promise((resolve,reject)=>wx.getImageInfo({src:this.post.image,success:resolve,fail:reject}));
 const image=this.canvas.createImage();
 await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error("照片加载失败"));image.src=source.path});
 this.image=image;return image;
},
async render(){
 if(!this.canvas||!this.post)return;
 const id=this.renderId=(this.renderId||0)+1;
 this.setData({busy:true,error:"",preview:""});
 try{
  const image=await this.getImage();if(this.closed||id!==this.renderId)return;
  drawCard(this.canvas.getContext("2d"),this.post,this.analysis,this.data,image);
  const output=await new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvas:this.canvas,fileType:"png",
   x:0,y:0,width:WIDTH,height:HEIGHT,destWidth:WIDTH,destHeight:HEIGHT,success:resolve,fail:reject},this));
  if(!this.closed&&id===this.renderId)this.setData({preview:output.tempFilePath,busy:false});
 }catch(_){if(!this.closed&&id===this.renderId)this.setData({error:"分享卡生成失败，请检查照片是否还能打开，再试一次。",busy:false})}
},
toggleEditor(){this.setData({showEditor:!this.data.showEditor})},
theme(e){this.setData({theme:e.currentTarget.dataset.theme},()=>this.render())},
fit(e){this.setData({fit:e.detail.value?"contain":"cover"},()=>this.render())},
position(e){this.setData({position:e.detail.value/100},()=>this.render())},
brightness(e){this.setData({brightness:e.detail.value},()=>this.render())},
city(e){this.setData({hideCity:e.detail.value},()=>this.render())},
preview(){if(this.data.preview&&!this.data.busy)wx.previewImage({urls:[this.data.preview]})},
async save(){
 if(this.data.saving||this.data.busy||!this.data.preview)return;
 this.setData({saving:true});
 try{await new Promise((resolve,reject)=>wx.saveImageToPhotosAlbum({filePath:this.data.preview,success:resolve,fail:reject}));
  wx.showToast({title:"已保存，去朋友圈晒一下"})}
 catch(e){
  const denied=/auth deny|auth denied|authorize|permission/i.test(e.errMsg||"");
  wx.showModal({title:denied?"需要相册权限":"暂时没有保存成功",content:denied?"允许保存到相册后，才能保存分享卡。是否打开设置？":"你可以重试，或打开大图后手动保存。",confirmText:denied?"打开设置":"查看大图",
   success:r=>{if(r.confirm){if(denied)wx.openSetting({});else this.preview()}}});
 }finally{this.setData({saving:false,showEditor:false})}
}
});