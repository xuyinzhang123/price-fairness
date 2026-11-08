Page({
 camera(){wx.navigateTo({url:"/pages/capture/index"})}, album(){this.choose("album")},

 manual(){wx.navigateTo({url:"/pages/confirm/index"})},
 choose(source){wx.chooseMedia({count:1,mediaType:["image"],sourceType:[source],
 success: async res => {
   let path = res.tempFiles[0].tempFilePath;
   try { const saved = await new Promise((resolve,reject)=>wx.saveFile({tempFilePath:path,success:resolve,fail:reject})); path=saved.savedFilePath; }
   catch (_) { wx.showToast({title:"图片暂存，请及时完成",icon:"none"}); }
   wx.navigateTo({url:"/pages/confirm/index?image="+encodeURIComponent(path)});
 }})}
});