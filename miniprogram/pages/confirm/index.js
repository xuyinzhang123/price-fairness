const api=require("../../utils/api");
Page({data:{region:[],showPlace:false,placeName:"",locationHint:"",scene:"",scenes:["地摊","街边店","商场","景区","其他"],image:"",name:"",price:"",city:"",paid:true,recognition:"manual"},
async onLoad(q){
 this.setData({image:q.image?decodeURIComponent(q.image):"",city:wx.getStorageSync("price-fairness-city")||""});
 if(!this.data.image||!api.enabled())return;
 this.setData({recognition:"loading"});
 try{
  const r=await api.recognize(this.data.image);const patch={recognition:r.status};
  // Do not overwrite fields the user edited while recognition was in flight.
  if(r.status==="ready"){for(const key of ["name","city","price"])if(!this.data[key]&&r[key])patch[key]=String(r[key])}
  this.setData(patch);
 }catch(_){this.setData({recognition:"failed"})}
},
noop(){},closePlace(){this.setData({showPlace:false})},togglePlace(){this.setData({showPlace:!this.data.showPlace})},sceneChange(e){const value=e.currentTarget.dataset.scene;this.setData({scene:this.data.scene===value?"":value})},
change(e){this.setData({[e.currentTarget.dataset.field]:e.detail.value})},
cityChange(e){const value=e.detail.value;const region=Array.isArray(value)?value:[];let city=region.length?(region[1]==="市辖区"||region[1]==="县"?region[0]:region[1]):value;city=city||"";if(!city.includes("·"))city=city.replace(/市$/,"");this.setData({city,region});wx.setStorageSync("price-fairness-city",city)},
paidChange(e){this.setData({paid:e.detail.value})},
submit(){const d=this.data;const price=Number(d.price);
if(!d.name.trim()||!d.city.trim()||!Number.isFinite(price)||price<0.01||price>1000000){wx.showToast({title:"请填写名称、有效价格和城市",icon:"none"});return}
wx.setStorageSync("price-fairness-city",d.city.trim());
wx.setStorageSync("price-fairness-draft",{name:d.name.trim(),city:d.city.trim(),price:Math.round(price*100)/100,image:d.image,observedAt:new Date().toISOString(),placeName:d.placeName.trim(),locationHint:d.locationHint.trim(),scene:d.scene,priceType:d.paid?"paid":"seen"});
wx.navigateTo({url:"/pages/result/index"});
}});