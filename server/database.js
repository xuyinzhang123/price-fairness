const { DatabaseSync } = require("node:sqlite");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
function openDatabase(filename) {
  if(filename !== ":memory:") fs.mkdirSync(path.dirname(filename), {recursive:true});
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  db.exec(fs.readFileSync(path.join(__dirname,"schema.sql"),"utf8"));
  const repository = {
    getMood(id) {return db.prepare("SELECT mood FROM post_moods WHERE post_id=?").get(id)?.mood||"neutral";},
    getPlace(id) {
      const r=db.prepare("SELECT * FROM quote_places WHERE quote_id=?").get(id);
      return {placeName:r?.place_name||"",locationHint:r?.location_hint||"",scene:r?.scene||""};
    },
    createPost(input,image) {
      db.exec("BEGIN IMMEDIATE");
      try{
        const quote=repository.addQuote(input);
        const id=randomUUID(),mediaId=image?randomUUID():null,createdAt=new Date().toISOString();
        if(image)db.prepare("INSERT INTO media VALUES(?,?,?,?)").run(mediaId,image.mimeType,image.bytes,createdAt);
        db.prepare("INSERT INTO posts VALUES(?,?,?,?)").run(id,quote.id,mediaId,createdAt);
        db.prepare("INSERT INTO post_discovery VALUES(?,?)").run(id,input.cityVisible===true?1:0);
        db.prepare("INSERT INTO post_moods VALUES(?,?)").run(id,input.mood||"neutral");
        db.exec("COMMIT");return repository.getPost(id);
      }catch(e){db.exec("ROLLBACK");throw e}
    },
    listPosts(city,publicOnly=false,name="") {
      return db.prepare("SELECT p.id,p.quote_id,p.media_id,p.created_at,q.name,q.city,q.price_cents,q.price_type,q.observed_at,q.note FROM posts p JOIN quotes q ON q.id=p.quote_id"+(publicOnly?" WHERE q.city=? AND EXISTS(SELECT 1 FROM post_discovery d WHERE d.post_id=p.id AND d.city_visible=1) AND (?='' OR instr(q.name,?)>0)":"")+" ORDER BY p.created_at DESC LIMIT 100").all(...(publicOnly?[city,name,name]:[]))
       .map(r=>({...repository.getPlace(r.quote_id),mood:repository.getMood(r.id),id:r.id,quoteId:r.quote_id,name:r.name,city:r.city,price:r.price_cents/100,priceType:r.price_type,observedAt:r.observed_at,note:r.note,createdAt:r.created_at,image:r.media_id?"/api/media/"+r.media_id:""}));
    },
    getPost(id) {
      const row=db.prepare("SELECT p.id,p.quote_id,p.media_id,p.created_at,q.name,q.city,q.price_cents,q.price_type,q.observed_at,q.note FROM posts p JOIN quotes q ON q.id=p.quote_id WHERE p.id=?").get(id);
      if(!row)return null;
      return {...repository.getPlace(row.quote_id),mood:repository.getMood(id),cityVisible:repository.cityVisible(id),reactions:repository.reactions(id),id:row.id,quoteId:row.quote_id,name:row.name,city:row.city,price:row.price_cents/100,priceType:row.price_type,observedAt:row.observed_at,note:row.note,createdAt:row.created_at,image:row.media_id?"/api/media/"+row.media_id:"",
        replies:db.prepare("SELECT r.id,r.quote_id,r.note,r.created_at,q.price_cents,q.price_type,q.observed_at FROM replies r LEFT JOIN quotes q ON q.id=r.quote_id WHERE r.post_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT 200").all(id)
         .map(r=>({...repository.getPlace(r.quote_id),id:r.id,quoteId:r.quote_id,note:r.note,createdAt:r.created_at,price:r.price_cents===null?null:r.price_cents/100,priceType:r.price_type,observedAt:r.observed_at}))};
    },
    addReply(postId,input,isQuote) {
      const post=repository.getPost(postId);if(!post)return null;
      db.exec("BEGIN IMMEDIATE");
      try{
        const quote=isQuote?repository.addQuote({...input,name:post.name,city:post.city}):null;
        const reply={id:randomUUID(),quoteId:quote?quote.id:null,note:input.note||"",createdAt:new Date().toISOString()};
        db.prepare("INSERT INTO replies VALUES(?,?,?,?,?)").run(reply.id,postId,reply.quoteId,reply.note,reply.createdAt);
        db.exec("COMMIT");return reply;
      }catch(e){db.exec("ROLLBACK");throw e}
    },
    cityVisible(id) {return db.prepare("SELECT city_visible FROM post_discovery WHERE post_id=?").get(id)?.city_visible===1;},
    reactions(id) {
      const counts={normal:0,expensive:0,cheap:0};
      for(const row of db.prepare("SELECT choice,COUNT(*) AS count FROM reactions WHERE post_id=? GROUP BY choice").all(id))counts[row.choice]=row.count;
      return counts;
    },
    react(id,voterHash,choice) {
      db.prepare("INSERT INTO reactions VALUES(?,?,?,?) ON CONFLICT(post_id,voter_hash) DO UPDATE SET choice=excluded.choice,updated_at=excluded.updated_at")
       .run(id,voterHash,choice,new Date().toISOString());
      return repository.reactions(id);
    },
    getMedia(id) {return db.prepare("SELECT mime_type AS mimeType,bytes FROM media WHERE id=?").get(id)||null;},
    reserveCall(period,bucket,limit) {
      if(!Number.isSafeInteger(limit)||limit<=0)return false;
      const r=db.prepare("INSERT INTO api_usage(period,bucket,used) VALUES(?,?,1) ON CONFLICT(period,bucket) DO UPDATE SET used=used+1 WHERE used<?")
       .run(period,bucket,limit);
      return r.changes===1;
    },
    usage(period) {return db.prepare("SELECT bucket,used FROM api_usage WHERE period=?").all(period);},
    close(){ db.close(); },
    getSearch(key, now=Date.now()) {
      const row=db.prepare("SELECT result_json FROM search_cache WHERE cache_key=? AND expires_at>?").get(key,now);
      return row?JSON.parse(row.result_json):null;
    },
    cacheSearch(key,result,expiresAt) {
      db.prepare("INSERT INTO search_cache(cache_key,result_json,expires_at,created_at) VALUES(?,?,?,?) ON CONFLICT(cache_key) DO UPDATE SET result_json=excluded.result_json,expires_at=excluded.expires_at,created_at=excluded.created_at")
       .run(key,JSON.stringify(result),expiresAt,new Date().toISOString());
    },
    saveAnalysis(subject,result) {
      const id=randomUUID();
      db.prepare("INSERT INTO analyses(id,subject_json,result_json,created_at) VALUES(?,?,?,?)")
       .run(id,JSON.stringify(subject),JSON.stringify(result),new Date().toISOString());
      return id;
    },
    getAnalysis(id) {
      const row=db.prepare("SELECT * FROM analyses WHERE id=?").get(id);
      return row?{id:row.id,subject:JSON.parse(row.subject_json),result:JSON.parse(row.result_json),createdAt:row.created_at}:null;
    },
    addQuote(q) {
      const record={...q,id:randomUUID(),createdAt:new Date().toISOString()};
      db.exec("SAVEPOINT quote_write");
      try {
        db.prepare("INSERT INTO quotes (id,name,city,price_cents,price_type,observed_at,note,created_at) VALUES (?,?,?,?,?,?,?,?)")
         .run(record.id,record.name,record.city,Math.round(record.price*100),record.priceType,record.observedAt,record.note||"",record.createdAt);
        db.prepare("INSERT INTO quote_places VALUES(?,?,?,?)")
         .run(record.id,record.placeName||"",record.locationHint||"",record.scene||"");
        db.exec("RELEASE quote_write");
      }catch(e){db.exec("ROLLBACK TO quote_write");db.exec("RELEASE quote_write");throw e}
      return record;
    },
    list(name,city) {
      const conditions=[], values=[];
      if(name){conditions.push("name = ?");values.push(name)}
      if(city){conditions.push("city = ?");values.push(city)}
      return db.prepare("SELECT * FROM quotes"+(conditions.length?" WHERE "+conditions.join(" AND "):"")+" ORDER BY created_at DESC LIMIT 500")
        .all(...values).map(r=>({...repository.getPlace(r.id),id:r.id,name:r.name,city:r.city,price:r.price_cents/100,priceType:r.price_type,observedAt:r.observed_at,note:r.note,createdAt:r.created_at,source:"user"}));
    }
  };
  return repository;
}
module.exports={openDatabase};