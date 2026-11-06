const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const dir=process.argv[2],out=process.argv[3];fs.mkdirSync(out,{recursive:true});
const canvas=JSON.parse(fs.readFileSync(dir+'/canvas.json')).boards;
const b=await chromium.launch();
for(const [f,m] of Object.entries(canvas)){
 const p=await b.newPage({viewport:{width:m.w,height:m.h},deviceScaleFactor:2});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8765/'+f);await p.waitForTimeout(2500);
 await p.screenshot({path:out+'/'+f.replace('.dc.html','')+'.png'});
 console.log(f,errs.length?('ERR '+errs[0]):'ok');await p.close()}
await b.close()})();
