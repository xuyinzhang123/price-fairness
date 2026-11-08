function locationPattern(value){const parts=String(value||'').normalize('NFKC').trim().split(/[·/\s]+/).filter(Boolean).map(p=>p.replace(/(?:自治县|市|县|区)$/,''));const escaped=parts.map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:自治县|市|县|区)?');return '(^|[·/\\s])'+escaped.join('[·/\\s]+')+'([·/\\s]|$)'}
function locationMatches(stored,query){return new RegExp(locationPattern(query),'i').test(String(stored||''))}
module.exports={locationPattern,locationMatches};
