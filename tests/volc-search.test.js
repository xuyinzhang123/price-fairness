const {test}=require("node:test");const assert=require("node:assert/strict");
const {createVolcSearch}=require("../server/volc-search");const {createProviders}=require("../server/providers");
test("Volc search uses Custom API, city query and real content fields",async()=>{
 const search=createVolcSearch({VOLC_SEARCH_API_KEY:"test-secret"},async(url,options)=>{
  assert.equal(url,"https://open.feedcoopapi.com/search_api/web_search");
  const b=JSON.parse(options.body);assert.ok(b.Query.includes("成都"));assert.equal(b.SearchType,"web");assert.equal(b.Filter.NeedUrl,true);
  return {ok:true,json:async()=>({Result:{WebResults:[{Url:"https://example.com/menu",Title:"菜单",Content:"2026-11-01 成都蛋炒饭18元"},{Url:"https://example.com/short",Snippet:"仅短片段"}]}})};
 });
 const r=await search({name:"蛋炒饭",city:"成都"});assert.equal(r.search_result.length,1);
 assert.equal(r.search_result[0].link,"https://example.com/menu");
});
test("Volc missing key and vendor errors never fabricate results or leak raw messages",async()=>{
 let called=false;
 await assert.rejects(()=>createVolcSearch({},()=>{called=true})({name:"面",city:"成都"}));assert.equal(called,false);
 const s=createVolcSearch({VOLC_SEARCH_API_KEY:"secret"},async()=>({ok:true,json:async()=>({ResponseMetadata:{Error:{Message:"secret diagnostic"}},Result:null})}));
 await assert.rejects(()=>s({name:"面",city:"成都"}),e=>!e.message.includes("secret"));
});
test("hybrid mode retrieves through Volc and extracts through configured model",async()=>{
 const urls=[];
 const p=createProviders({AI_PROVIDER:"bigmodel",SEARCH_PROVIDER:"volc",VOLC_SEARCH_API_KEY:"volc-key",BIGMODEL_API_KEY:"model-key",BIGMODEL_TEXT_MODEL:"text"},
  async(url)=>{urls.push(url);return {ok:true,json:async()=>url.includes("feedcoopapi")?{Result:{WebResults:[{Url:"https://example.com",Content:"有证据的菜单"}]}}:{choices:[{message:{content:'{"quotes":[]}'}}]}}});
 assert.equal(p.capabilities.search,true);
 const r=await p.search({name:"蛋炒饭",city:"成都"});
 assert.equal(r.status,"ready");assert.equal(urls.length,2);
 assert.ok(urls[0].includes("feedcoopapi"));assert.ok(urls[1].endsWith("/chat/completions"));
});