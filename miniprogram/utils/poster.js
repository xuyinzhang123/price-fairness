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
 const mood=post&&post.mood||"neutral",ready=validAnalysis(analysis);
 const feelings={won:{headline:"这么多才这个价",caption:"感觉赚大了！",badge:"我的感受 · 感觉赚了"},ripped:{headline:"这单花了 ¥"+Number(post.price||0).toFixed(2).replace(/\.00$/,"")+"，感觉有点贵。",caption:"我是不是大冤种？",badge:"我的感受 · 怀疑冤了"}};
 const feeling=feelings[mood];
 const evidence=ready?"同城用户参考 "+analysis.count+" 条 · 近 "+(analysis.windowDays||90)+" 天"+(analysis.limited?" · 样本较少":""):"参考样本不足或条件不完整，暂不评分。";
 if(feeling)return {...feeling,evidence:ready?"第 "+analysis.score+" 百分位 · "+analysis.count+" 条参考 · 近 "+(analysis.windowDays||90)+" 天":evidence,system:ready?"系统参考：指数 "+analysis.score+" · "+analysis.title:""};
 if(!ready)return {headline:"这价格，冤不冤？",caption:"先让朋友评评理。",badge:"这单消费，值得晒",evidence,system:""};
 return {headline:analysis.score>=81?"这单，谁来安慰一下？":analysis.score<=20?"这单是不是赚到了？":"这价格，朋友怎么看？",caption:"价格位置：第 "+analysis.score+" 百分位",badge:"冤种指数 "+analysis.score+" · "+analysis.title,evidence,system:""};
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
 const dark=options.theme==="magazine",purple=dark?"#a98aff":"#7047eb",panel=dark?"#393044":"#7047eb",panelInk=dark?"#fffaf5":"#ffffff",lime="#e5f59a";
 ctx.fillStyle=t.bg;ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.fillStyle=purple;ctx.fillRect(0,0,WIDTH,192);
 line(ctx,"冤种指数",36,62,32,dark?"#24212b":"#ffffff",360,"bold");
 line(ctx,"PRICE FAIRNESS / 消费手记",36,92,13,dark?"#393044":"#eee7fb",450);
 line(ctx,post.name||"我的这单",36,158,40,dark?"#24212b":"#ffffff",420,"bold");
 ctx.fillStyle=lime;ctx.fillRect(478,105,206,65);
 line(ctx,"¥"+Number(post.price||0).toFixed(2),492,150,35,"#24212b",180,"bold");
 ctx.fillStyle=t.ink;ctx.fillRect(630,42,54,4);ctx.fillRect(652,54,32,4);
 const frame={x:32,y:208,w:656,h:408};
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
 line(ctx,options.hideCity?"消费后的一点小情绪":String(post.city||"")+" · "+(post.priceType==="paid"?"实际支付":"看到的报价"),36,654,22,t.muted,648);
 if(!options.hideCity&&(post.placeName||post.scene))line(ctx,[post.placeName,post.scene].filter(Boolean).join(" · "),36,682,17,t.muted,648);
 const feeling=post.mood==="won"||post.mood==="ripped";
 ctx.fillStyle=panel;ctx.fillRect(32,706,656,218);
 ctx.fillStyle=lime;ctx.fillRect(52,730,6,22);
 line(ctx,feeling?"消费后的心情 / MY TAKE":"这单消费 / PRICE NOTE",72,748,15,dark?"#d3c4eb":"#e7defb",570);
 if(feeling){
  line(ctx,copy.headline,52,799,post.mood==="ripped"?31:35,panelInk,616,"bold");
  line(ctx,copy.caption,52,866,46,panelInk,616,"bold");
 }else{
  line(ctx,copy.headline,52,801,35,panelInk,616,"bold");
  line(ctx,copy.caption,52,852,27,panelInk,616);
  line(ctx,copy.badge,52,894,18,dark?"#d3c4eb":"#e7defb",616);
 }
 if(validAnalysis(analysis)){
  if(copy.system)line(ctx,copy.system,36,954,20,t.muted,648);
  line(ctx,copy.evidence,36,981,17,t.muted,648);
 }else{line(ctx,"个人消费感受 · 暂无足够可比样本评分",36,966,18,t.muted,648)}
 const question=post.mood==="ripped"?(/(?:粉|面|粥|汤)$/.test(post.name||"")?"你们那边，这碗得多少钱？":"你们那边，这些得多少钱？"):post.mood==="won"?"你们那边，这些得多少钱？":"你觉得这个价格冤不冤？";
 ctx.fillStyle=purple;ctx.fillRect(36,1010,4,29);
 line(ctx,question,52,1034,26,t.ink,632,"bold");
 return copy;
}
module.exports={WIDTH,HEIGHT,THEMES,cropRect,brighten,validAnalysis,cardCopy,drawCard};