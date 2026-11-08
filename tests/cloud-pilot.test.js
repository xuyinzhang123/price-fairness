const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
function handler(openid='user-a'){
 const data={price_posts:new Map(),price_replies:new Map(),price_votes:new Map()};let seq=0;
 const db={RegExp:r=>new RegExp(r.regexp,r.options),collection(name){const rows=data[name];return {doc(id){return {get:async()=>({data:rows.get(id)}),set:async({data:d})=>rows.set(id,{...d,_id:id})}},add:async({data:d})=>{const id='reply-'+(++seq);rows.set(id,{...d,_id:id});return {_id:id}},where(filter){const matches=()=>[...rows.values()].filter(r=>Object.entries(filter).every(([k,v])=>v instanceof RegExp?v.test(r[k]):r[k]===v));return {count:async()=>({total:matches().length}),orderBy(){return this},limit(){return this},get:async()=>({data:matches()})}}}}};
 const cloud={init(){},database:()=>db,getWXContext:()=>({OPENID:openid,APPID:'wx0000000000000000'}),getTempFileURL:async()=>({fileList:[]})};
 const sandbox={exports:{},URL,console,require(id){if(id==='wx-server-sdk')return cloud;if(id==='crypto')return require('node:crypto');return require('../cloudfunctions/priceApi/'+id.slice(2))}};
 vm.runInNewContext(fs.readFileSync('cloudfunctions/priceApi/index.js','utf8'),sandbox);return {call:sandbox.exports.main,data};
}
const quote={name:'全季酒店大床房',city:'成都',price:328,priceType:'paid',observedAt:new Date().toISOString()};
test('cloud pilot saves hotel, searches public records and attaches replies',async()=>{
 const {call,data}=handler();const a=(await call({path:'/api/posts',data:{...quote,cityVisible:true}})).post;
 await call({path:'/api/posts',data:quote});await call({path:'/api/posts',data:{...quote,city:'上海',cityVisible:true}});
 assert.equal(a.owner,undefined);assert.equal(data.price_posts.size,3);
 const found=await call({path:'/api/posts?city=成都&name=酒店',method:'GET'});assert.equal(found.posts.length,2);assert.ok(found.posts.some(p=>p.isOwn&&!p.cityVisible));
 assert.equal((await call({path:'/api/posts?city=成都&name=.*',method:'GET'})).posts.length,0);
 await call({path:'/api/posts/'+a.id+'/replies',data:{...quote,price:288}});
 assert.equal((await call({path:'/api/posts/'+a.id,method:'GET'})).post.replies[0].price,288);
 await call({path:'/api/posts/'+a.id+'/reactions',data:{choice:'cheap',voterId:'spoof'}});
 await call({path:'/api/posts/'+a.id+'/reactions',data:{choice:'normal',voterId:'another-spoof'}});
 assert.equal(data.price_votes.size,1);assert.equal((await call({path:'/api/posts/'+a.id,method:'GET'})).post.reactions.normal,1);
 assert.equal((await call({path:'/api/analyze',data:quote})).status,'insufficient');
});
test('cloud pilot rejects calls without trusted WeChat identity',async()=>{const {call}=handler('');assert.ok((await call({path:'/api/posts',data:quote})).error)});

test('cloud upload references must belong to current caller and environment',async()=>{
 const {call,data}=handler();const target=await call({path:'/api/upload-target',data:{}});
 const fileID='cloud://cloud1-example.bucket/'+target.cloudPath;
 const result=await call({path:'/api/posts',data:{...quote,imageFileId:fileID}});assert.ok(result.post);assert.equal([...data.price_posts.values()][0].image,fileID);
 const forged=await call({path:'/api/posts',data:{...quote,imageFileId:'cloud://cloud1-example.bucket/prices/someone-else/photo.jpg'}});assert.ok(forged.error);assert.equal(data.price_posts.size,1);
});

test('cloud analysis reads public posts and replies but excludes private thread replies',async()=>{
 const {call,data}=handler();const now=new Date().toISOString();
 for(let i=0;i<5;i++)data.price_posts.set('public-'+i,{_id:'public-'+i,owner:'other-'+i,name:'蛋炒饭',city:'湖州',price:10+i*2,priceType:'paid',scene:'',observedAt:now,createdAt:now,cityVisible:true});
 data.price_posts.set('private',{_id:'private',owner:'hidden',name:'蛋炒饭',city:'湖州',price:1,priceType:'paid',scene:'',observedAt:now,createdAt:now,cityVisible:false});
 data.price_replies.set('private-reply',{_id:'private-reply',postId:'private',owner:'hidden-reply',name:'蛋炒饭',city:'湖州',price:1,priceType:'paid',scene:'',observedAt:now});
 const a=await call({path:'/api/analyze',data:{name:'蛋炒饭',city:'湖州',price:28,priceType:'paid'}});assert.equal(a.status,'ready');assert.equal(a.score,100);assert.equal(a.title,'大冤种');assert.equal(a.count,5);assert.equal(a.references.some(r=>r.id==='private-reply'),false);
});

test('county search finds owner private post but never another users unlisted post',async()=>{
 const {call,data}=handler();const common={name:'干切牛肉',city:'濮阳·台前县',price:40,priceType:'paid',scene:'',createdAt:new Date().toISOString(),observedAt:new Date().toISOString()};
 data.price_posts.set('own',{...common,_id:'own',owner:'user-a',cityVisible:false});data.price_posts.set('hidden',{...common,_id:'hidden',owner:'someone-else',cityVisible:false});data.price_posts.set('public',{...common,_id:'public',owner:'someone-else',cityVisible:true});
 for(const city of ['台前','台前县','濮阳·台前县']){const result=await call({path:'/api/posts?city='+encodeURIComponent(city)+'&name='+encodeURIComponent('干切牛肉'),method:'GET'});assert.deepEqual(new Set(result.posts.map(p=>p.id)),new Set(['own','public']));}
});

test('published feeling persists independently from price analysis',async()=>{const {call}=handler();const result=await call({path:'/api/posts',data:{...quote,mood:'won'}});assert.equal(result.post.mood,'won');assert.equal((await call({path:'/api/posts/'+result.post.id,method:'GET'})).post.mood,'won');assert.ok((await call({path:'/api/posts',data:{...quote,mood:'forged-score'}})).error)});
