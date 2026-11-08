function text(value, label, max=80) {
  if(typeof value!=="string" || !value.trim() || value.trim().length>max) throw new Error(label+"格式不正确");
  return value.trim().normalize("NFKC");
}
function price(value) {
  if(typeof value!=="number" || !Number.isFinite(value) || value<0.01 || value>1000000) throw new Error("价格须在 0.01 到 1000000 元之间");
  return Math.round(value*100)/100;
}
function observation(value, now=Date.now()) {
  if(typeof value!=="string" || !value.trim()) throw new Error("请填写价格发生时间");
  const time=Date.parse(value);
  if(!Number.isFinite(time)||time>now) throw new Error("价格发生时间无效或晚于当前时间");
  return new Date(time).toISOString();
}
function placeInput(body){
 const optional=(v,label,max)=>v===undefined||v===""?"":text(v,label,max);
 const scene=body.scene||"";
 if(!["","地摊","街边店","商场","景区","其他"].includes(scene))throw new Error("消费场景无效");
 return {placeName:optional(body.placeName,"店名或摊位",120),locationHint:optional(body.locationHint,"位置或地标",160),scene};
}
function quoteInput(body) {
  if(!["paid","seen"].includes(body.priceType)) throw new Error("请选择实付价或看到的报价");
  return {...placeInput(body),name:text(body.name,"商品或服务名称"),city:text(body.city,"城市"),price:price(body.price),
    priceType:body.priceType,observedAt:observation(body.observedAt),
    note:body.note===undefined||body.note===""?"":text(body.note,"说明",200)};
}
module.exports={text,price,observation,quoteInput};