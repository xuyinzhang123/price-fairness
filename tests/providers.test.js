const {test}=require("node:test");const assert=require("node:assert/strict");
const {createProviders}=require("../server/providers");const {decodeWorkflow}=require("../server/coze");
const env={AI_PROVIDER:"coze",COZE_API_TOKEN:"test-secret",COZE_RECOGNITION_WORKFLOW_ID:"recognition",COZE_SEARCH_WORKFLOW_ID:"search"};
const reply=(data,code=0)=>({ok:true,status:200,json:async()=>({code,data})});
test("unconfigured providers never issue requests",async()=>{
 const p=createProviders({},()=>{throw new Error("unexpected network")});
 assert.deepEqual(p.capabilities,{recognition:false,search:false});
 assert.equal((await p.recognize("AAAA","image/jpeg")).status,"unconfigured");
 assert.equal((await p.search({})).status,"unconfigured");
});
test("Coze recognition uploads image then serializes image file parameter",async()=>{
 const calls=[];const p=createProviders(env,async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith("/files/upload")){assert.ok(options.body instanceof FormData);assert.equal(options.body.get("file").type,"image/png");return reply({id:"file123"})}
  const body=JSON.parse(options.body);assert.equal(body.workflow_id,"recognition");
  assert.equal(body.parameters.image,JSON.stringify({file_id:"file123"}));
  return reply(JSON.stringify({output:JSON.stringify({name:" 蛋炒饭 ",price:null,city:""})}));
 });
 const result=await p.recognize(Buffer.from("test image").toString("base64"),"image/png");
 assert.equal(result.name,"蛋炒饭");assert.equal(result.price,null);assert.equal(calls.length,2);
 assert.ok(calls.every(c=>c.url.startsWith("https://api.coze.cn/")));
});
test("Coze search accepts direct structured output and filters malformed entries",async()=>{
 const p=createProviders(env,async(_,options)=>{const body=JSON.parse(options.body);assert.equal(body.parameters.city,"成都");return reply(JSON.stringify({quotes:[null,{},false]}))});
 const r=await p.search({name:"蛋炒饭",city:"成都"});assert.equal(r.status,"ready");assert.equal(r.quotes.length,1);
});
test("vendor failures never leak token or raw diagnostics",async()=>{
 const p=createProviders(env,async()=>reply(null,123));
 await assert.rejects(()=>p.search({name:"蛋炒饭",city:"成都"}),e=>!e.message.includes(env.COZE_API_TOKEN));
 const bad=createProviders(env,async()=>({ok:false,status:401}));
 await assert.rejects(()=>bad.search({}),/HTTP 401/);
});
test("malformed workflow output is rejected",()=>{
 assert.throws(()=>decodeWorkflow("not json"));assert.throws(()=>decodeWorkflow('{"output":"not json"}'));
 assert.deepEqual(decodeWorkflow('{"output":{"quotes":[]}}'),{quotes:[]});
 assert.deepEqual(decodeWorkflow(JSON.stringify({output:String.fromCharCode(96).repeat(3)+"json\n"+JSON.stringify({quotes:[]})+"\n"+String.fromCharCode(96).repeat(3)})),{quotes:[]});
});
test("bridge compatibility and price normalization",async()=>{
 const p=createProviders({RECOGNITION_BRIDGE_URL:"https://bridge.example/recognize"},async()=>({ok:true,json:async()=>({name:"炒饭",price:12.345,city:"成都"})}));
 assert.equal((await p.recognize("AAAA","image/jpeg")).price,12.35);
});
test("partial configuration does not advertise unavailable capabilities",()=>{
 assert.deepEqual(createProviders({AI_PROVIDER:"coze",COZE_API_TOKEN:"token"}).capabilities,{recognition:false,search:false});
 assert.deepEqual(createProviders({AI_PROVIDER:"coze",COZE_API_TOKEN:"token",COZE_SEARCH_WORKFLOW_ID:"search"}).capabilities,{recognition:false,search:true});
});
test("invalid recognition image fails before external upload",async()=>{
 const p=createProviders(env,()=>{throw new Error("unexpected network")});
 await assert.rejects(()=>p.recognize("","image/jpeg"),/图片/);
});

test("default provider never activates Coze using leftover credentials",async()=>{
 const p=createProviders({COZE_API_TOKEN:"token",COZE_SEARCH_WORKFLOW_ID:"search"},()=>{throw new Error("unexpected request")});
 assert.equal(p.capabilities.search,false);assert.equal((await p.search({})).status,"unconfigured");
});
test("disabled mode makes no calls even with bridge credentials",async()=>{
 const p=createProviders({AI_PROVIDER:"disabled",SEARCH_BRIDGE_URL:"https://example.com"},()=>{throw new Error("unexpected request")});
 assert.equal((await p.search({})).status,"unconfigured");
});