import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../../../vercel.json',import.meta.url)));
test('production CRM rewrites include entry, nested routes and nested assets',()=>{
 for(const path of ['/app','/app/','/app/leads/','/app/assets/app.js']){
  const rule=config.rewrites.find(x=>new RegExp('^'+x.source+'$').test(path));assert.ok(rule,path);
  assert.equal(path.replace(new RegExp('^'+rule.source+'$'),rule.destination),'https://brandui-web.vercel.app'+(path==='/app'?'/app/':path));
 }
 assert.ok(config.headers.some(x=>x.source==='/app/(.*)'&&x.headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex'))));
});
