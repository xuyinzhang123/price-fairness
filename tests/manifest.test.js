const {test}=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
test("every registered mini program page has script, template and valid page JSON",()=>{
 const root=path.join(__dirname,"../miniprogram");const app=JSON.parse(fs.readFileSync(path.join(root,"app.json"),"utf8"));
 for(const page of app.pages){for(const extension of [".js",".wxml",".json"])assert.ok(fs.existsSync(path.join(root,page+extension)),page+extension);
 assert.equal(typeof JSON.parse(fs.readFileSync(path.join(root,page+".json"),"utf8")),"object")}
});