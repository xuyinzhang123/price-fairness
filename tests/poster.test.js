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
  const copy=cardCopy(p,a);assert.equal(copy.headline,"冤不冤暂时不知道");assert.equal(copy.caption,"先让朋友评评理。");assert.equal(copy.badge,"等待朋友评理");
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