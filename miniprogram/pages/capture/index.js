Page({data:{ready:false,failed:false,busy:false},

onReady(){this.camera=wx.createCameraContext()},
ready(){this.setData({ready:true,failed:false})},
error(){this.setData({ready:false,failed:true})},
async take(){
 if(!this.data.ready||this.data.busy)return;
 this.setData({busy:true});
 try{
  const photo=await new Promise((resolve,reject)=>this.camera.takePhoto({quality:"high",success:resolve,fail:reject}));
  let path=photo.tempImagePath;
  try{path=(await new Promise((resolve,reject)=>wx.saveFile({tempFilePath:path,success:resolve,fail:reject}))).savedFilePath}catch(_){}
  wx.redirectTo({url:"/pages/confirm/index?image="+encodeURIComponent(path)});
 }catch(_){wx.showToast({title:"没有拍成功，请再试一次",icon:"none"})}
 finally{this.setData({busy:false})}
},
album(){wx.chooseMedia({count:1,mediaType:["image"],sourceType:["album"],success:r=>wx.redirectTo({url:"/pages/confirm/index?image="+encodeURIComponent(r.tempFiles[0].tempFilePath)})})}
});