const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('mini program pages and suggestions load using JavaScript-only module resolution',async()=>{
 const root=path.resolve(__dirname,'../miniprogram'),cache=new Map();let page;
 const wx={getStorageSync:()=>'',setStorageSync(){},cloud:{callFunction:async()=>({result:{posts:[]}})}};
 function load(file){const resolved=path.extname(file)?file:file+'.js';assert.equal(path.extname(resolved),'.js','Mini program require must load a JavaScript module: '+resolved);if(cache.has(resolved))return cache.get(resolved).exports;const module={exports:{}};cache.set(resolved,module);const context={module,exports:module.exports,require:id=>{assert.ok(id.startsWith('.'));return load(path.resolve(path.dirname(resolved),id))},Page(p){page=p;p.setData=patch=>Object.assign(p.data,patch)},wx,setTimeout,clearTimeout,console};vm.runInNewContext(fs.readFileSync(resolved,'utf8'),context,{filename:resolved});return module.exports;}
 const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));for(const entry of app.pages){load(path.join(root,entry+'.js'));assert.ok(page,'Page registration missing: '+entry);}
 cache.clear();load(path.join(root,'pages/community/index.js'));await page.onShow();assert.equal(page.data.loading,false);page.cityInput({detail:{value:'德清'}});assert.ok(page.data.citySuggestions.some(r=>r.value==='湖州·德清县'));
});
