const store=require("../../utils/store");const api=require("../../utils/api");
Page({data:{showPlace:false,placeName:"",locationHint:"",scene:"",scenes:["地摊","街边店","商场","景区","其他"],name:"",city:"",price:"",note:"",paid:false},
onLoad(q){this.setData({postId:q.postId||"",name:decodeURIComponent(q.name||""),city:decodeURIComponent(q.city||""),cloud:api.enabled()})},
togglePlace(){this.setData({showPlace:!this.data.showPlace})},sceneChange(e){const value=e.currentTarget.dataset.scene;this.setData({scene:this.data.scene===value?"":value})},
change(e){this.setData({[e.currentTarget.dataset.field]:e.detail.value})},paidChange(e){this.setData({paid:e.detail.value})},
async submit(){
 if(this.saving)return;
 const d=this.data;const price=Number(d.price);if(!d.name||!d.city||!Number.isFinite(price)||price<0.01||price>1000000){wx.showToast({title:"请输入有效报价",icon:"none"});return}
 this.saving=true;
 const quote={name:d.name,city:d.city,price:Math.round(price*100)/100,note:d.note,observedAt:new Date().toISOString(),placeName:d.placeName.trim(),locationHint:d.locationHint.trim(),scene:d.scene,priceType:d.paid?"paid":"seen"};
 try{if(api.enabled())await api.request(d.postId?"/api/posts/"+d.postId+"/replies":"/api/quotes",quote);else store.save({...quote,parentId:d.postId});wx.showToast({title:"报价已保存"});wx.navigateBack()}
 catch(e){wx.showToast({title:e.message,icon:"none"})}finally{this.saving=false}
}});