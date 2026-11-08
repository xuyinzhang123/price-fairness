const WIDTH=720,HEIGHT=1080;
const THEMES={
 receipt:{name:"简洁账单",bg:"#fbf8f4",ink:"#24212b",accent:"#7047eb",surface:"#eee7fb",badgeInk:"#ffffff",muted:"#77717f"},
 playful:{name:"趣味吐槽",bg:"#eee7fb",ink:"#24212b",accent:"#7047eb",surface:"#e2d5fb",badgeInk:"#ffffff",muted:"#6d5b85"},
 magazine:{name:"杂志封面",bg:"#24212b",ink:"#fffaf5",accent:"#a98aff",surface:"#393044",badgeInk:"#24212b",muted:"#c4b9d2"}
};
function cropRect(iw,ih,w,h,position=0.5){
 if(![iw,ih,w,h].every(n=>Number.isFinite(n)&&n>0))throw new Error("图片尺寸无效");
 const scale=Math.max(w/iw,h/ih),sw=w/scale,sh=h/scale;
 const p=Math.max(0,Math.min(1,Number(position)||0));
 return {sx:(iw-sw)*0.5,sy:(ih-sh)*p,sw,sh};
}
function brighten(data,amount){
 const gain=1+Math.max(0,Math.min(20,Number(amount)||0))/100;
 for(let i=0;i<data.length;i+=4){for(let c=0;c<3;c++)data[i+c]=Math.min(255,Math.round(data[i+c]*gain))}
 return data;
}
function validAnalysis(a){
 return !!(a&&a.status==="ready"&&Number.isFinite(a.score)&&a.score>=0&&a.score<=100&&a.count>=5);
}
function cardCopy(post,analysis){
 if(!validAnalysis(analysis))return {headline:"冤不冤暂时不知道",caption:"先让朋友评评理。",badge:"等待朋友评理",evidence:"参考样本不足或分析未完成，暂不评分。"};
 return {headline:analysis.score>=81?"这单，谁来安慰一下？":analysis.score<=20?"这单是不是赚到了？":"这价格，朋友怎么看？",
  caption:"钱都花了，来评评理。",badge:"冤种指数 "+analysis.score+" / 100",
  evidence:"同城参考 "+analysis.count+" 条 · 近 "+(analysis.windowDays||90)+" 天"+(analysis.limited?" · 样本较少":"")};
}
function fitLine(ctx,value,width){
 let text=String(value||"");
 if(ctx.measureText(text).width<=width)return text;
 while(text&&ctx.measureText(text+"…").width>width)text=Array.from(text).slice(0,-1).join("");
 return text+"…";
}
function line(ctx,text,x,y,size,color,width=608,weight="normal"){
 ctx.fillStyle=color;ctx.font=weight+" "+size+"px sans-serif";
 ctx.fillText(fitLine(ctx,text,width),x,y);
}
function drawCard(ctx,post,analysis,options={},image){
 const t=THEMES[options.theme]||THEMES.receipt,copy=cardCopy(post,analysis);
 ctx.fillStyle=t.bg;ctx.fillRect(0,0,WIDTH,HEIGHT);
 line(ctx,"冤种指数 / PRICE FAIRNESS",56,66,21,t.ink);
 if(options.theme==="magazine"){ctx.fillStyle=t.accent;ctx.fillRect(56,87,74,5)}
 line(ctx,post.name||"我的这单",56,145,44,t.ink,430,"bold");
 line(ctx,"¥"+Number(post.price||0).toFixed(2),495,145,34,t.ink,170,"bold");
 const frame={x:56,y:180,w:608,h:390};
 ctx.save();ctx.beginPath();ctx.rect(frame.x,frame.y,frame.w,frame.h);ctx.clip();
 if(image){
  if(options.fit==="contain"){
   ctx.fillStyle=t.surface;ctx.fillRect(frame.x,frame.y,frame.w,frame.h);
   const scale=Math.min(frame.w/image.width,frame.h/image.height);
   const w=image.width*scale,h=image.height*scale;
   ctx.drawImage(image,frame.x+(frame.w-w)/2,frame.y+(frame.h-h)/2,w,h);
  }else{
   const c=cropRect(image.width,image.height,frame.w,frame.h,options.position);
   ctx.drawImage(image,c.sx,c.sy,c.sw,c.sh,frame.x,frame.y,frame.w,frame.h);
  }
 }else{ctx.fillStyle=t.surface;ctx.fillRect(frame.x,frame.y,frame.w,frame.h);line(ctx,"钱都花了，来评评理。",98,385,34,t.ink,520,"bold")}
 ctx.restore();
 if(image&&options.brightness>0){
  const pixels=ctx.getImageData(frame.x,frame.y,frame.w,frame.h);
  brighten(pixels.data,options.brightness);ctx.putImageData(pixels,frame.x,frame.y);
 }
 line(ctx,options.hideCity?"消费后的一点小情绪":String(post.city||"")+" · "+(post.priceType==="paid"?"实际支付":"看到的报价"),56,620,24,t.muted);
 if(!options.hideCity&&(post.placeName||post.scene))line(ctx,[post.placeName,post.scene].filter(Boolean).join(" · "),56,644,18,t.muted);
 const high=validAnalysis(analysis)&&analysis.score>=81;
 ctx.fillStyle=high?"#ffe1dc":t.accent;ctx.fillRect(56,651,608,66);
 line(ctx,copy.badge,76,696,30,high?"#a83d38":t.badgeInk,568,"bold");
 line(ctx,copy.headline,56,785,38,t.ink,608,"bold");
 line(ctx,copy.caption,56,838,30,t.ink);
 line(ctx,copy.evidence,56,928,22,t.muted);
 line(ctx,"趣味参考，不代表商家评价。照片仅做裁切与亮度调整。",56,965,18,t.muted);
 line(ctx,"你觉得这个价格冤不冤？",56,1023,23,t.ink);
 return copy;
}
module.exports={WIDTH,HEIGHT,THEMES,cropRect,brighten,validAnalysis,cardCopy,drawCard};