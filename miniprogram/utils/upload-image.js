const MAX_BYTES=600*1024;
function fileSize(filePath){return new Promise((resolve,reject)=>wx.getFileSystemManager().getFileInfo({filePath,success:r=>resolve(r.size),fail:reject}))}
async function canvasCopy(filePath,info,edge,quality){
 if(!wx.createOffscreenCanvas)throw new Error('当前微信版本不支持备用图片处理');
 const ratio=Math.min(1,edge/Math.max(info.width,info.height));
 const width=Math.max(1,Math.round(info.width*ratio)),height=Math.max(1,Math.round(info.height*ratio));
 const canvas=wx.createOffscreenCanvas({type:'2d',width,height});const image=canvas.createImage();
 await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=info.path||filePath});
 const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);
 return (await new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvas,x:0,y:0,width,height,destWidth:width,destHeight:height,fileType:'jpg',quality,success:resolve,fail:reject}))).tempFilePath;
}
async function prepareUpload(filePath){
 let size;try{size=await fileSize(filePath)}catch(_){throw new Error('照片读取失败，请重新选择照片')}
 let info;try{info=await new Promise((resolve,reject)=>wx.getImageInfo({src:filePath,success:resolve,fail:reject}))}catch(_){throw new Error('照片无法处理，请重新拍照或选择其他照片')}
 if(!info.width||!info.height)throw new Error('照片尺寸无效，请重新选择');
 const supported=['jpeg','jpg','png','webp'].includes((info.type||'jpeg').toLowerCase());
 if(size<=MAX_BYTES&&supported)return filePath;
 for(const [edge,quality] of [[1600,80],[1200,65]]){
  const ratio=Math.min(1,edge/Math.max(info.width,info.height));
  try{
   const result=await new Promise((resolve,reject)=>wx.compressImage({src:filePath,quality,compressedWidth:Math.max(1,Math.round(info.width*ratio)),compressedHeight:Math.max(1,Math.round(info.height*ratio)),success:resolve,fail:reject}));
   if(await fileSize(result.tempFilePath)<=MAX_BYTES)return result.tempFilePath;
  }catch(_){}
 }
 for(const [edge,quality] of [[1200,.78],[960,.65],[720,.5]]){
  try{const path=await canvasCopy(filePath,info,edge,quality);if(await fileSize(path)<=MAX_BYTES)return path}catch(_){}
 }
 throw new Error('照片处理失败，请截图后重试，或更换照片');
}
module.exports={prepareUpload,MAX_BYTES};
