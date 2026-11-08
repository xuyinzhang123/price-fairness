function createVolcSearch(env,fetchImpl=fetch){
 return async function(query,signal){
  if(!env.VOLC_SEARCH_API_KEY)throw new Error("尚未配置豆包搜索密钥");
  const response=await fetchImpl("https://open.feedcoopapi.com/search_api/web_search",{
   method:"POST",headers:{Authorization:"Bearer "+env.VOLC_SEARCH_API_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({Query:(query.city+" "+query.name+" 菜单 单价 价格").slice(0,100),SearchType:"web",Count:10,
    Filter:{NeedUrl:true,NeedContent:true},QueryControl:{QueryRewrite:false}}),
   signal
  });
  if(!response.ok)throw new Error("豆包搜索请求失败（HTTP "+response.status+"）");
  const data=await response.json();
  if(data.ResponseMetadata?.Error)throw new Error("豆包搜索未完成请求，请检查权限和剩余额度");
  if(!data.Result||!Array.isArray(data.Result.WebResults))throw new Error("豆包搜索返回格式不正确");
  return {search_result:data.Result.WebResults.filter(x=>x&&typeof x.Url==="string").map(x=>({
   link:x.Url,title:x.Title||"",content:x.Content||x.Summary||""
  })).filter(x=>x.content)};
 };
}
module.exports={createVolcSearch};