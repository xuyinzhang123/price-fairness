const path=require("node:path");
const {openDatabase}=require("./database");
const {createProviders}=require("./providers");
const {createServer}=require("./app");
const {createLimitedFetch}=require("./quota");
const db=openDatabase(process.env.DATABASE_PATH||path.join(__dirname,"data","prices.sqlite"));
const server=createServer({db,providers:createProviders(process.env,createLimitedFetch(db))});
const host=process.env.HOST||"127.0.0.1";
server.listen(Number(process.env.PORT||8787),host,()=>console.log("冤种指数开发后台：http://"+host+":"+server.address().port));
function stop(){server.close(()=>{db.close();process.exit(0)})}
process.on("SIGINT",stop);process.on("SIGTERM",stop);