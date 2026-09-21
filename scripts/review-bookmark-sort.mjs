import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const session=`glass-sort-${process.pid}`,profile=await mkdtemp('/private/tmp/glass-tab-sort-'),output=resolve('artifacts/bookmark-sort-review');
const run=(...args)=>{const r=JSON.parse(execFileSync('agent-browser',['--session',session,'--json',...args],{encoding:'utf8',timeout:60000}));if(!r.success)throw new Error(JSON.stringify(r.error));return r.data;};
const evaluate=code=>run('eval',code).result;
const wait=code=>run('wait','--fn',code);
try {
 await mkdir(output,{recursive:true});
 run('--profile',profile,'--extension',resolve('.output/chrome-mv3'),'open','chrome://newtab');
 run('set','viewport','1440','900');
 const url=evaluate('location.href');
 const fixture=evaluate(`(async()=>{const a=await chrome.bookmarks.create({parentId:'1',title:'Z 2',url:'https://z.example'});const folder=await chrome.bookmarks.create({parentId:'1',title:'目录'});const b=await chrome.bookmarks.create({parentId:'1',title:'A',url:'https://a.example'});const c=await chrome.bookmarks.create({parentId:'1',title:'Z 10',url:'https://c.example'});await chrome.bookmarks.create({parentId:folder.id,title:'B',url:'https://b.example'});await chrome.bookmarks.create({parentId:folder.id,title:'A child',url:'https://a.example/child'});await chrome.storage.local.set({'favorites:v2':[c.id,a.id,b.id],'preference:v1:shuffle':false,'preference:v1:activeEffect':'grain-gradient'});return {a:a.id,b:b.id,c:c.id};})()`);
 const before=evaluate('chrome.bookmarks.getTree()');
 const modes=[['chrome',['Z 2','目录','A','Z 10']],['name-asc',['目录','A','Z 2','Z 10']],['name-desc',['目录','Z 10','Z 2','A']],['newest',['目录','Z 10','A','Z 2']],['oldest',['目录','Z 2','A','Z 10']],['recent',['目录','Z 2','A','Z 10']]];
 const results=[];
 for(const [mode,expected] of modes){
  run('press','Control+,');wait('document.querySelector("#bookmark-sort") !== null');
  run('select','#bookmark-sort',mode);
  wait(`document.querySelector('#bookmark-sort').value==='${mode}'`);
  run('press','Escape');run('reload');
  wait('document.querySelector("button[aria-label=全部书签]") !== null');
  run('focus','button[aria-label="全部书签"]');run('press','Enter');wait('document.querySelector(".bookmark-menu") !== null');
  const titles=evaluate("[...document.querySelectorAll('.bookmark-menu:not(.submenu) > .menu-row .truncate')].map(e=>e.textContent)");
  assert.deepEqual(titles,expected);results.push({mode,titles});
  run('press','Escape');
 }
 assert.deepEqual(evaluate('chrome.bookmarks.getTree()'),before);
 assert.deepEqual(evaluate("chrome.storage.local.get('favorites:v2')"),{'favorites:v2':[fixture.c,fixture.a,fixture.b]});
 run('mouse','move','200','500');
 const source=evaluate("(()=>{const a=document.querySelector('.effect-source');return {text:a.textContent,children:a.children.length,height:a.getBoundingClientRect().height,font:getComputedStyle(a).fontSize,href:a.href};})()");
 assert.equal(source.children,0);assert.ok(!source.text.includes('↗'));assert.equal(source.height,24);assert.equal(source.font,'11px');
 for(const width of [1440,390,320]){
  run('set','viewport',String(width),'844');run('press','Control+,');wait('document.querySelector("#bookmark-sort") !== null');evaluate("document.querySelector('#bookmark-sort').scrollIntoView({block:'center'})");
  const layout=evaluate("(()=>{const r=document.querySelector('#bookmark-sort').getBoundingClientRect();return {left:r.left,right:r.right,overflow:document.documentElement.scrollWidth>innerWidth}})()");assert.ok(layout.left>=0&&layout.right<=width&&!layout.overflow);
  run('screenshot',resolve(output,`settings-${width}.png`));run('press','Escape');
 }
 const errors=run('errors').errors;assert.deepEqual(errors,[]);
 await writeFile(resolve(output,'checks.json'),JSON.stringify({results,source,sourceTreeUnchanged:true,favoritesUnchanged:true,errors},null,2));
 console.log('Six sort modes persisted, Chrome tree and favorites unchanged, source compact without icon, 320/390/1440 layouts passed.');
} finally {try{run('close');await rm(profile,{recursive:true,force:true});}catch{}}
