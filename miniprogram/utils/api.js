const config=require("../config");
const {prepareUpload}=require("./upload-image");
function enabled(){return !!(config.cloudEnv||config.apiBaseUrl)}
function request(path,data,method="POST"){
 if(config.cloudEnv)return wx.cloud.callFunction({name:config.cloudFunction||"priceApi",config:{env:config.cloudEnv},data:{path,data,method}}).then(r=>{if(!r.result||r.result.error)throw new Error(r.result&&r.result.error||"云端请求失败");return r.result}).catch(e=>{throw new Error(e.message||e.errMsg||"云端请求失败，请稍后重试")});
 return new Promise((resolve,reject)=>{
  wx.request({url:config.apiBaseUrl+path,method,data,timeout:30000,
   success(r){if(r.statusCode>=200&&r.statusCode<300)resolve(r.data);else reject(new Error(r.data&&r.data.error||"请求失败"))},
   fail(){reject(new Error("无法连接后台，请稍后重试"))}});
 });
}
async function recognize(filePath){
 if(!enabled()||config.cloudEnv)return {status:"unconfigured"};
 const file=await new Promise((resolve,reject)=>wx.getFileSystemManager().readFile({filePath,encoding:"base64",success:resolve,fail:reject}));
 const lower=filePath.toLowerCase();const mimeType=lower.endsWith(".png")?"image/png":lower.endsWith(".webp")?"image/webp":"image/jpeg";
 return request("/api/recognize",{imageBase64:file.data,mimeType});
}
async function imagePayload(filePath){
 if(!filePath)return {};
 filePath=await prepareUpload(filePath);
 if(config.cloudEnv){
  const target=await request("/api/upload-target",{});
  const uploaded=await wx.cloud.uploadFile({cloudPath:target.cloudPath,filePath,config:{env:config.cloudEnv}});
  return {imageFileId:uploaded.fileID};
 }
 const file=await new Promise((resolve,reject)=>wx.getFileSystemManager().readFile({filePath,encoding:"base64",success:resolve,fail:reject}));
 const head=file.data;let mimeType;
 if(head.startsWith("iVBOR"))mimeType="image/png";
 else if(head.startsWith("/9j/"))mimeType="image/jpeg";
 else if(head.startsWith("UklGR"))mimeType="image/webp";
 else throw new Error("请使用 JPEG、PNG 或 WebP 照片");
 return {imageBase64:file.data,mimeType};
}
function imageUrl(url){return url&&url.startsWith("/api/")?config.apiBaseUrl+url:url}
module.exports={enabled,request,recognize,imagePayload,imageUrl};