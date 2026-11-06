const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
const boards=JSON.parse(fs.readFileSync(process.argv[3]+'/canvas.json')).boards;
const b=await chromium.launch();
for(const [f,m] of Object.entries(boards)){
 const p=await b.newPage({viewport:{width:m.w,height:m.h}});
 await p.goto('http://localhost:8765/'+f);await p.waitForTimeout(2500);
 const html=await p.evaluate(()=>{
  document.querySelectorAll('script').forEach(s=>s.remove());
  document.querySelectorAll('[data-dc-script],helmet').forEach(e=>{if(e.tagName==='HELMET'){e.remove()}});
  return {head:[...document.head.querySelectorAll('link[rel=stylesheet],style')].map(e=>e.outerHTML).join('\n'),
   body:document.body.innerHTML, title:document.title};});
 const name=f.replace('.dc.html','');
 const body=html.body.replace(/href="([A-Za-z0-9]+)\.dc\.html"/g,'href="$1.html"');
 fs.writeFileSync(`${out}/${name}.html`,`<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${html.title}</title>\n${html.head}\n<style>body{margin:0}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
 console.log(name,body.length, /dc-import|sc-for|\{\{/.test(body)?'LEFTOVER':'clean');await p.close()}
await b.close()})();
