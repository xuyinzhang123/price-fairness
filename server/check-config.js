const {createProviders}=require("./providers");
const {createLimitedFetch}=require("./quota");
const env=process.env;
const guarded=createLimitedFetch({reserveCall(){throw new Error("检查不应发起调用")} },env,()=>{throw new Error("检查不联网")});
const p=createProviders(env,guarded);
console.log(JSON.stringify({
 provider:env.AI_PROVIDER||"bridge",searchProvider:env.SEARCH_PROVIDER||"bigmodel",
 externalCallsEnabled:guarded.settings.enabled,
 configured:p.capabilities,
 monthlyLimits:guarded.settings.limits,
 credentials:{volcSearch:!!env.VOLC_SEARCH_API_KEY,bigmodel:!!env.BIGMODEL_API_KEY,coze:!!env.COZE_API_TOKEN,bridge:!!env.AI_BRIDGE_TOKEN},
 message:"仅检查参数完整性，不联网，不验证额度、密钥有效性或模型权限。"
},null,2));