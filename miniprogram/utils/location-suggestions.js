const areas=require('../data/areas.json');
function suggestLocations(query,limit=6){const q=String(query||'').trim().replace(/\s+/g,'');if(!q)return [];return areas.filter(r=>(r.label+r.value).replace(/\s+/g,'').includes(q)).sort((a,b)=>(a.name===q?-1:0)-(b.name===q?-1:0)||a.value.length-b.value.length).slice(0,limit)}
module.exports={suggestLocations};
