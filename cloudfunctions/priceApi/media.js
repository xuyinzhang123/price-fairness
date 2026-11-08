function decodeImage(body){
 if(!body.imageBase64)return null;
 const data=body.imageBase64;
 if(typeof data!=="string"||data.length>7*1024*1024||data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))throw new Error("图片编码无效或过大");
 const bytes=Buffer.from(data,"base64");if(bytes.length>5*1024*1024)throw new Error("照片不能超过 5MB");
 let actual="";
 if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))actual="image/png";
 if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)actual="image/jpeg";
 if(bytes.length>=12&&bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP")actual="image/webp";
 if(!actual||actual!==body.mimeType)throw new Error("请选择 JPEG、PNG 或 WebP 照片");
 return {mimeType:actual,bytes};
}
module.exports={decodeImage};