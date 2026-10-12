const fs=require('fs');
const src=['util','mathx','weapons','roster','world','sim'].map(f=>fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')).join('\n');
const api=new Function(src+'\nreturn {ROSTER,createMatch,stepMatch};')();
const hist=new Array(20).fill(0), early={}; let fightTime=0, states={};
for(let s=1;s<=20;s++){
  const M=api.createMatch(s*104729, 'kenji',{onEvent:(t,d)=>{ if(t==='kill'){ hist[Math.min(19,Math.floor(M.t/10))]++; if(M.t<40) early[d.weapon]=(early[d.weapon]||0)+1; } }});
  while(!M.over&&M.t<300){ api.stepMatch(M); if(Math.round(M.t*60)%60===0 && M.t<60){ for(const f of M.fighters) if(f.alive) states[f.state]=(states[f.state]||0)+1; } }
}
console.log('kills per 10s bucket (20 matches):',hist.join(' '));
console.log('early (<40s) causes',JSON.stringify(early));
console.log('state samples <60s',JSON.stringify(states));
