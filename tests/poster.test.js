const {test}=require("node:test");const assert=require("node:assert/strict");
const {cropRect,brighten,cardCopy,drawCard,THEMES}=require("../miniprogram/utils/poster");
test("portrait crop honors vertical framing and stays in image bounds",()=>{
 const top=cropRect(600,1200,600,400,0),bottom=cropRect(600,1200,600,400,1);
 assert.equal(top.sy,0);assert.equal(bottom.sy,800);assert.equal(top.sw,600);assert.equal(bottom.sh,400);
});
test("landscape crop centers horizontally and rejects invalid image dimensions",()=>{
 const c=cropRect(1600,400,600,400);assert.equal(c.sx,500);assert.equal(c.sw,600);
 assert.throws(()=>cropRect(0,100,600,400));
});
test("brightening keeps alpha and caps highlights without changing original buffer",()=>{
 const original=new Uint8ClampedArray([100,200,250,127]);const processed=brighten(new Uint8ClampedArray(original),20);
 assert.deepEqual(Array.from(processed),[120,240,255,127]);assert.equal(original[0],100);
});
test("unknown and invalid scores never produce a numeric badge",()=>{
 const p={name:"蛋炒饭",price:25};
 for(const a of [null,{status:"insufficient",count:4},{status:"ready",count:4,score:99},{status:"ready",count:9,score:NaN}]){
  const copy=cardCopy(p,a);assert.equal(copy.headline,"这价格，冤不冤？");assert.equal(copy.caption,"先让朋友评评理。");assert.equal(copy.badge,"这单消费，值得晒");
 }
});
test("real score copy includes sample information and high/low tone",()=>{
 assert.ok(cardCopy({}, {status:"ready",score:92,count:12}).headline.includes("安慰"));
 assert.ok(cardCopy({}, {status:"ready",score:10,count:12}).headline.includes("赚到"));
 assert.ok(cardCopy({}, {status:"ready",score:50,count:8,limited:true}).evidence.includes("样本较少"));
});
function context(){
 const texts=[],images=[];
 return {texts,images,fillRect(){},save(){},beginPath(){},rect(){},clip(){},restore(){},
  measureText(s){return {width:Array.from(s).length*20}},fillText(text,x,y){texts.push({text,x,y})},
  drawImage(...args){images.push(args)},getImageData(){return {data:new Uint8ClampedArray([100,100,100,255])}},putImageData(){}};
}
test("all templates draw and hiding city removes city text while preserving source post",()=>{
 for(const theme of Object.keys(THEMES)){
  const ctx=context(),post={name:"蛋炒饭",city:"成都",price:25,priceType:"paid"};
  drawCard(ctx,post,null,{theme,hideCity:true},null);
  assert.equal(ctx.texts.some(t=>t.text.includes("成都")),false);
  assert.equal(post.city,"成都");assert.ok(ctx.texts.every(t=>t.x>=0&&t.y<1080));
 }
});
test("full-photo option uses image without source cropping",()=>{
 const ctx=context();drawCard(ctx,{name:"面",price:12},null,{fit:"contain"},{width:600,height:1200});
 assert.equal(ctx.images.length,1);assert.equal(ctx.images[0].length,5);
});
test("user feeling is independent of numeric result and works without samples",()=>{
 const analysis={status:"ready",score:92,title:"大冤种",count:12};const before=JSON.stringify(analysis);
 const won=cardCopy({mood:"won"},analysis);assert.equal(won.caption,"感觉赚大了！");assert.ok(won.badge.includes("我的感受"));assert.ok(won.system.includes("92"));assert.ok(won.system.includes("大冤种"));assert.equal(JSON.stringify(analysis),before);
 const unknown=cardCopy({mood:"ripped"},null);assert.equal(unknown.caption,"我是不是大冤种？");assert.equal(unknown.system,"");assert.ok(unknown.evidence.includes("暂不评分"));
});

test("feeling card keeps one small note without duplicate banners or disclaimers",()=>{
 const ctx=context();drawCard(ctx,{name:"涮牛肉",city:"南京·浦口区",price:140,mood:"won"},null,{},null);const texts=ctx.texts.map(t=>t.text);
 assert.ok(texts.includes("这么多才这个价"));assert.ok(texts.includes("感觉赚大了！"));assert.ok(texts.includes("你们那边，这些得多少钱？"));assert.equal(texts.some(t=>t.includes("我的感受")),false);assert.equal(texts.some(t=>t.includes("趣味参考")),false);assert.equal(texts.filter(t=>t.includes("评分")).length,1);
});
