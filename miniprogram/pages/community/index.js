const {locationMatches}=require("../../utils/location-match");
const {suggestLocations}=require("../../utils/location-suggestions");
const store=require("../../utils/store");const api=require("../../utils/api");
Page({data:{citySuggestions:[],citySuggestionsOpen:false,region:[],items:[],cloud:false,error:"",city:"",name:"",loading:false,searched:false},
onShow(){if(!this.data.city&&wx.getStorageSync)this.setData({city:wx.getStorageSync("price-fairness-city")||""});return this.search()},
cityInput(e){this.cityChange(e);this.setData({citySuggestions:suggestLocations(e.detail.value),citySuggestionsOpen:true})},
cityFocus(){clearTimeout(this.cityCloseTimer);this.setData({citySuggestions:suggestLocations(this.data.city),citySuggestionsOpen:true})},
cityBlur(){this.cityCloseTimer=setTimeout(()=>this.setData({citySuggestionsOpen:false}),200)},
cityPick(e){clearTimeout(this.cityCloseTimer);this.cityChange({detail:{value:e.currentTarget.dataset.value}});this.setData({citySuggestionsOpen:false})},
cityConfirm(){this.setData({citySuggestionsOpen:false});this.search()},
cityChange(e){const value=e.detail.value;const region=Array.isArray(value)?value:[];let city=region.length?(region[1]==="市辖区"||region[1]==="县"?region[0]:region[1]):value;city=city||"";if(!city.includes("·"))city=city.replace(/市$/,"");this.setData({city,region});wx.setStorageSync("price-fairness-city",city)},
nameChange(e){this.setData({name:e.detail.value})},
async search(){
 const city=this.data.city.trim(),name=this.data.name.trim(),requestId=(this.requestId||0)+1;this.requestId=requestId;
 this.setData({cloud:api.enabled(),error:"",city,name,items:[],loading:!!city,searched:!!city});
 if(!city)return;
 try{
 const items=api.enabled()?(await api.request("/api/posts?city="+encodeURIComponent(city)+"&name="+encodeURIComponent(name),undefined,"GET")).posts.map(p=>({...p,image:api.imageUrl(p.image)})):store.read().filter(p=>!p.parentId&&(p.cityVisible===true||p.source==="user")&&locationMatches(p.city,city)&&(!name||p.name.includes(name)));
 if(this.requestId===requestId)this.setData({items,loading:false});
 }catch(e){if(this.requestId===requestId)this.setData({error:e.message,items:[],loading:false})}
},
detail(e){wx.navigateTo({url:"/pages/detail/index?id="+e.currentTarget.dataset.id})},
camera(){wx.switchTab({url:"/pages/camera/index"})},
quote(e){const d=e.currentTarget.dataset;wx.navigateTo({url:"/pages/quote/index?postId="+d.id+"&name="+encodeURIComponent(d.name)+"&city="+encodeURIComponent(d.city)})}});
