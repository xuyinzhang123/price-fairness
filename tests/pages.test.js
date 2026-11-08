const {test}=require("node:test");const assert=require("node:assert/strict");
const vm=require("node:vm");const fs=require("node:fs");const path=require("node:path");
function page(name,api,store,wx={}){
 let instance;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../miniprogram/pages",name,"index.js"),"utf8"),{
  Page(p){instance=p;p.setData=function(patch){Object.assign(this.data,patch)}},
  require(id){if(id.endsWith("/location-match"))return require("../miniprogram/utils/location-match");if(id.endsWith("/location-suggestions"))return require("../miniprogram/utils/location-suggestions");if(id.endsWith("/poster"))return require("../miniprogram/utils/poster");if(id.endsWith("/api"))return api;if(id.endsWith("/store"))return store;throw new Error(id)},
  wx,clearTimeout
 });
 return instance;
}
test("publish sends photo bytes and opens persistent post detail",async()=>{
 let route,payload,navigated;
 const p=page("result",{enabled:()=>true,imagePayload:async()=>({imageBase64:"image",mimeType:"image/png"}),request:async(r,b)=>{route=r;payload=b;return {post:{id:"post-id",quoteId:"quote-id"}}}}, {},{
  navigateTo({url}){navigated=url},showToast(){}
 });
 p.data.draft={name:"蛋炒饭",city:"成都",price:25,image:"local-photo"};
 await p.publish();
 assert.equal(route,"/api/posts");assert.equal(payload.imageBase64,"image");assert.equal(payload.image,undefined);
 assert.equal(p.quoteId,"quote-id");assert.equal(navigated,"/pages/detail/index?id=post-id");
});
test("photo upload read failure does not publish a partial post",async()=>{
 let called=false,toast="";
 const p=page("result",{enabled:()=>true,imagePayload:async()=>{throw new Error("照片读取失败")},request:async()=>{called=true}}, {},{showModal(r){toast=r.content}});
 p.data.draft={name:"蛋炒饭",price:25,image:"gone"};
 await p.publish();assert.equal(called,false);assert.equal(p.data.published,false);assert.equal(toast,"照片读取失败");
});
test("price contribution uses original post relationship",async()=>{
 let route;const p=page("quote",{enabled:()=>true,request:async(r)=>{route=r}}, {},{showToast(){},navigateBack(){}});
 Object.assign(p.data,{name:"蛋炒饭",city:"成都",price:"15",postId:"original"});
 await p.submit();assert.equal(route,"/api/posts/original/replies");
});
test("local detail keeps comments attached and refreshes after reply",async()=>{
 const records=[{id:"original",name:"蛋炒饭",city:"成都",price:25}];
 const p=page("detail",{enabled:()=>false,imageUrl:s=>s},{read:()=>records,save(q){records.push({...q,id:"comment"})}}, {});
 p.onLoad({id:"original"});await p.load();assert.equal(p.data.post.replies.length,0);
 p.data.note="本地一般十五";await p.comment();
 assert.equal(p.data.post.replies.length,1);assert.equal(records[1].parentId,"original");
});
test("friend sharing points to original post, local-only sharing never leaks a local id",()=>{
 const p=page("detail",{enabled:()=>true},{});
 p.id="original";p.data.post={name:"蛋炒饭",price:25,image:"https://example.com/photo"};
 const share=p.onShareAppMessage();assert.equal(share.path,"/pages/detail/index?id=original");assert.ok(share.title.includes("评评理"));
 const local=page("detail",{enabled:()=>false},{});local.id="local-only";local.data.post={name:"面",price:12};
 assert.equal(local.onShareAppMessage().path,"/pages/camera/index");
});
test("city visibility defaults to off when publishing",async()=>{
 let body;
 const p=page("result",{enabled:()=>true,imagePayload:async()=>({}),request:async(_,b)=>{body=b;return {post:{id:"p",quoteId:"q"}}}}, {},{navigateTo(){},showToast(){}});
 p.data.draft={name:"面",price:12};await p.publish();assert.equal(body.cityVisible,false);
});

test("save result image does not publish or contribute a quote",async()=>{
 let saved=false,published=false;
 const p=page("result",{enabled:()=>true,request:async()=>{published=true}}, {save(){published=true}},{
 saveImageToPhotosAlbum(r){saved=true;r.success({})},showToast(){}
 });
 Object.assign(p.data,{preview:"rendered.png",cardBusy:false,busy:false});
 await p.saveCard();assert.equal(saved,true);assert.equal(published,false);assert.equal(p.data.published,false);
});
test("reopening judgement page does not create duplicate posts",async()=>{
 let calls=0,navigations=0;
 const p=page("result",{enabled:()=>true,imagePayload:async()=>({}),request:async()=>{calls++;return {post:{id:"p",quoteId:"q"}}}}, {},{navigateTo(){navigations++},showToast(){}});
 p.data.draft={name:"面",price:12};await p.publish();await p.publish();
 assert.equal(calls,1);assert.equal(navigations,2);
});
test("result card customization is available before posting, evidence collapsed by default",()=>{
 let snapshot,url;
 const p=page("result",{}, {},{setStorageSync(k,v){snapshot=v},navigateTo(r){url=r.url}});
 p.data.draft={name:"面",price:12};
 assert.equal(p.data.showReferences,false);assert.equal(p.data.showOptions,false);
 p.editCard();assert.equal(snapshot.post.id,"draft");assert.equal(url,"/pages/poster/index?id=draft");
 assert.equal(p.data.published,false);
});
test("confirm remembers city and defaults to actual paid price",async()=>{
 const values={};let url;
 const p=page("confirm",{enabled:()=>false},{},{getStorageSync(){return "成都"},setStorageSync(k,v){values[k]=v},navigateTo(r){url=r.url},showToast(){}});
 await p.onLoad({});assert.equal(p.data.city,"成都");assert.equal(p.data.paid,true);
 p.data.name="面";p.data.price="12";p.submit();
 assert.equal(values["price-fairness-draft"].priceType,"paid");assert.equal(url,"/pages/result/index");
});

test("primary action opens camera view without invoking album picker",()=>{
 let url,picker=false;
 const p=page("camera",{}, {},{navigateTo(r){url=r.url},chooseMedia(){picker=true}});
 p.camera();assert.equal(url,"/pages/capture/index");assert.equal(picker,false);
});
test("camera failure stays explicit and does not silently open album",()=>{
 let picker=false;
 const p=page("capture",{}, {},{chooseMedia(){picker=true}});
 p.error();assert.equal(p.data.failed,true);assert.equal(p.data.ready,false);assert.equal(picker,false);
});
test("capture photo forwards to confirmation and keeps duplicate taps guarded",async()=>{
 let target,calls=0;
 const p=page("capture",{}, {},{
 createCameraContext(){return {takePhoto(r){calls++;r.success({tempImagePath:"taken.jpg"})}}},
 saveFile(r){r.success({savedFilePath:"saved.jpg"})},redirectTo(r){target=r.url},showToast(){}
 });
 p.onReady();await p.take();assert.equal(calls,0);
 p.ready();await p.take();assert.equal(calls,1);assert.equal(target,"/pages/confirm/index?image=saved.jpg");
});
test("optional location closes without losing data or submitting",()=>{
 let submitted=false;
 const p=page("confirm",{}, {},{navigateTo(){submitted=true}});
 p.data.placeName="路口炒饭摊";p.togglePlace();assert.equal(p.data.showPlace,true);
 p.closePlace();assert.equal(p.data.showPlace,false);assert.equal(p.data.placeName,"路口炒饭摊");assert.equal(submitted,false);
});

test("result auxiliary panels are exclusive and close without changing sharing visibility",()=>{
 const p=page("result",{}, {},{});p.toggleReferences();assert.equal(p.data.showReferences,true);
 p.toggleOptions();assert.equal(p.data.showReferences,false);assert.equal(p.data.showOptions,true);
 p.closeSheet();assert.equal(p.data.showOptions,false);assert.equal(p.data.cityVisible,false);
});


test("community searches city and dish without clearing filters",async()=>{
 const records=[{id:"yes",city:"成都",name:"蛋炒饭",cityVisible:true},{id:"private",city:"成都",name:"蛋炒饭",cityVisible:false},{id:"other",city:"上海",name:"蛋炒饭",cityVisible:true},{id:"dish",city:"成都",name:"面条",cityVisible:true}];
 const p=page("community",{enabled:()=>false},{read:()=>records},{setStorageSync(){}});
 p.cityChange({detail:{value:" 成都 "}});p.nameChange({detail:{value:"炒饭"}});await p.search();
 assert.equal(p.data.city,"成都");assert.equal(p.data.items.length,1);assert.equal(p.data.items[0].id,"yes");
 await p.onShow();assert.equal(p.data.name,"炒饭");assert.equal(p.data.items.length,1);
});

test('city selector normalizes ordinary cities and municipalities and remembers selection',()=>{
 const saved={};const wx={setStorageSync(k,v){saved[k]=v}};
 for(const name of ['confirm','community']){
  const p=page(name,{}, {},wx);p.cityChange({detail:{value:['浙江省','湖州市','吴兴区']}});assert.equal(p.data.city,'湖州');assert.equal(saved['price-fairness-city'],'湖州');
  p.cityChange({detail:{value:['上海市','市辖区','黄浦区']}});assert.equal(p.data.city,'上海');
 }
});

test("native location input accepts custom county and applies a suggestion",()=>{
 const p=page("community",{enabled:()=>false},{read:()=>[]},{setStorageSync(){}});
 p.cityInput({detail:{value:"德清"}});assert.equal(p.data.city,"德清");assert.ok(p.data.citySuggestions.some(r=>r.value==="湖州·德清县"));
 p.cityInput({detail:{value:"我自己填写的地方"}});assert.equal(p.data.city,"我自己填写的地方");assert.equal(p.data.citySuggestions.length,0);
 p.cityPick({currentTarget:{dataset:{value:"湖州·德清县"}}});assert.equal(p.data.city,"湖州·德清县");assert.equal(p.data.citySuggestionsOpen,false);
});
