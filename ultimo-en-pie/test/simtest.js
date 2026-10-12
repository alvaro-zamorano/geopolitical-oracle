const fs=require('fs');
const src=['util','mathx','weapons','roster','world','sim'].map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n');
const api=new Function(src+'\nreturn {ROSTER,createMatch,runToEnd,stepMatch,genWorld,WEAPONS};')();
const N=+process.argv[2]||100;
const wins={}, dur=[], firstKill=[], alive60=[], causes={}; let errors=0, fails=0;
const byW={};
const t0=Date.now();
for(let s=1;s<=N;s++){
  try{
    const ev=[]; let fk=null;
    const M=api.createMatch(s*7919, api.ROSTER[s%50].id,{onEvent:(t,d)=>{ if(t==='kill'){ if(fk===null) fk=M.t; causes[d.weapon]=(causes[d.weapon]||0)+1; } }});
    let a60=null;
    while(!M.over && M.t<400){ api.stepMatch(M); if(a60===null && M.t>=60) a60=M.aliveN; }
    if(!M.over){fails++; continue;}
    dur.push(M.t); firstKill.push(fk); alive60.push(a60);
    const w=M.winner; const k=w?w.d.id:'none'; wins[k]=(wins[k]||0)+1;
    const wk=w?w.d.w:'none'; byW[wk]=(byW[wk]||0)+1;
    for(const f of M.fighters){ if(!isFinite(f.x)||!isFinite(f.hp)) { errors++; break; } }
  }catch(e){ errors++; console.log('ERR seed',s,e.stack.split('\n').slice(0,4).join(' | ')); if(errors>3) break; }
}
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
console.log('matches',N,'fails',fails,'errors',errors,'ms/match',((Date.now()-t0)/N).toFixed(1));
console.log('dur avg',avg(dur).toFixed(1),'min',Math.min(...dur).toFixed(1),'max',Math.max(...dur).toFixed(1));
console.log('first kill avg',avg(firstKill).toFixed(1),' alive@60 avg',avg(alive60).toFixed(1));
console.log('wins by weapon',JSON.stringify(Object.entries(byW).sort((a,b)=>b[1]-a[1])));
console.log('distinct winners',Object.keys(wins).length,'top',JSON.stringify(Object.entries(wins).sort((a,b)=>b[1]-a[1]).slice(0,8)));
console.log('causes',JSON.stringify(Object.entries(causes).sort((a,b)=>b[1]-a[1]).slice(0,14)));
