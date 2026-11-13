/* Builds a realistic demo database (5 recipes, 8 batches) with the verbatim core logic.
 * Output: scripts/demo-db.json — load it via Biblioteca → Restaurar en un navegador de prueba, never over real data. */
import fs from 'fs';
const store={}; globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
const C=await import('../src/lib/core/core.js');
C.bootDB(); C.loadExampleRecipe(); C.migrateSalts();
const db=C.getDB();
const DAY=86400000, today=new Date('2026-11-12T15:00:00Z');
function mkBatch(type, startDaysAgo, pieces, lot, opts={}){
  const ref=type.ref+lot;
  let cursor=new Date(today.getTime()-startDaysAgo*DAY);
  const maxT=Math.max(...pieces.map(p=>p.t)); const shape=pieces[0].shape||'tubular';
  const stages=type.stages.map(s=>{ let d=s.dEst; if(s.kind==='Curado'&&s.eb) d=C.ebDays(maxT,shape,true);
    const startedAt=new Date(cursor).toISOString(); const expectedEnd=C.addDays(cursor,d); cursor=new Date(expectedEnd);
    return {kind:s.kind,shape:s.shape||null,eb:s.eb||false,startedAt,expectedEnd,dEst:d,done:false,actualEnd:null,
      brine:s.brine?{saltPct:s.brine.saltPct,waterPct:s.brine.waterPct,saltIngredient:s.brine.saltIngredient,cureSalt:s.brine.cureSalt?{...s.brine.cureSalt}:{ingredient:null,gPerKg:0}}:null,
      recipe:(s.recipe||[]).map(r=>({...r})),inoc:s.inoc?{...s.inoc}:null,env:s.env?{...s.env}:null,ph:s.ph?{...s.ph}:null,
      smoke:s.smoke?{...s.smoke,woods:(s.smoke.woods||[]).slice()}:null,press:s.press||false,notes:''};});
  // mark stages done whose expectedEnd < today (optionally hold one overdue)
  stages.forEach((s,i)=>{ if(new Date(s.expectedEnd)<today && i!==opts.overdueIdx){ s.done=true; s.actualEnd=s.expectedEnd; }});
  if(opts.overdueIdx!=null) for(let i=opts.overdueIdx+1;i<stages.length;i++){stages[i].done=false;stages[i].actualEnd=null;}
  const b={id:C.uid('bat'),ref,lot,typeId:type.id,typeName:type.name,typeRef:type.ref,ebPlus20:true,
    status:opts.status||'in_progress',startedAt:new Date(today.getTime()-startDaysAgo*DAY).toISOString(),targetYield:type.yield?.target??62,
    pieces:pieces.map((p,i)=>({id:C.uid('pc'),code:ref+String.fromCharCode(65+i),initialWeight:p.w,thickness:p.t,shape:p.shape||'tubular',notes:'',weightLogs:[]})),
    stages,phLogs:[],receiving:{coreT:opts.coreT??2.5,supplier:'Carnes La Pradera',date:new Date(today.getTime()-startDaysAgo*DAY).toISOString()},envLog:[],tasting:null,notes:''};
  // weight logs during secado: simulate first-order drying
  const sec=stages.find(s=>s.kind==='Secado');
  if(sec && new Date(sec.startedAt)<today){
    const t0=new Date(sec.startedAt).getTime(); const end=Math.min(today.getTime(), sec.done?new Date(sec.actualEnd).getTime():today.getTime());
    b.pieces.forEach(p=>{ const k=0.009+Math.random()*0.003; for(let t=t0+3*DAY;t<=end;t+=7*DAY){ const days=(t-t0)/DAY; const w=Math.round(p.initialWeight*(1-0.42*(1-Math.exp(-k*days*2.2)))); p.weightLogs.push({date:new Date(t).toISOString(),weight:w}); }});
  }
  if(b.status==='done'){ b.stages.forEach(s=>{s.done=true;s.actualEnd=s.actualEnd||s.expectedEnd}); b.finishedAt=b.stages.at(-1).actualEnd; }
  // env log
  for(let t=today.getTime()-Math.min(startDaysAgo,30)*DAY;t<=today.getTime();t+=DAY){ const st=stages.find(s=>new Date(s.startedAt).getTime()<=t && t<new Date(s.actualEnd||s.expectedEnd).getTime())||stages.at(-1);
    const base=st.kind==='Curado'?3:st.kind==='Fermentado'?26:13; const hr=st.kind==='Fermentado'?90:st.kind==='Curado'?null:76;
    b.envLog.push({date:new Date(t).toISOString(),stageKind:st.kind,tempC:+(base+Math.sin(t/DAY)*0.6).toFixed(1),hr:hr==null?null:+(hr+Math.cos(t/DAY)*3).toFixed(0),source:'govee'}); }
  db.batches.push(b); return b;
}
const base=db.types[0];
function cloneType(name,ref,cat,kinds,yieldT){ const t=JSON.parse(JSON.stringify(base)); t.id=C.uid('typ'); t.name=name; t.ref=ref; t.category=cat; t.yield={...(t.yield||{}),target:yieldT};
  const byK=Object.fromEntries(base.stages.map(s=>[s.kind,s]));
  t.stages=kinds.map(([k,d])=>({...JSON.parse(JSON.stringify(byK[k]||byK.Secado)),id:C.uid('stg'),kind:k,dEst:d,eb:k==='Curado'?(byK.Curado?.eb||false):false,
    env:k==='Fermentado'?{tMin:24,tMax:28,hMin:88,hMax:92}:k==='Curado'?null:{tMin:12,tMax:15,hMin:75,hMax:85}, ph:k==='Fermentado'?{start:5.8,end:5.0,dangerLow:4.4,dangerHigh:5.8}:null, brine:k==='Curado'?JSON.parse(JSON.stringify(byK.Curado.brine)):null, recipe:k==='Curado'?JSON.parse(JSON.stringify(byK.Curado.recipe)):[] }));
  db.types.push(t); return t; }
cloneType('Capocollo','CAPO','entera',[['Curado',12],['Secado',50],['Balanceo',10],['Madurado',20]],60);
cloneType('Bresaola','BRES','entera',[['Curado',14],['Secado',35],['Madurado',10]],58);
cloneType('Salchichón','SALCH','embutido',[['Curado',1],['Fermentado',2],['Secado',28],['Madurado',7]],65);
cloneType('Panceta Ahumada','PANC','entera',[['Curado',7],['Ahumado',1],['Secado',21]],78);
const T=db.types; console.log('types:',T.map(t=>`${t.name} [${t.ref}] ${t.stages.map(s=>s.kind+':'+s.dEst).join('>')}`).join('\n'));
const pick=i=>T[i%T.length];
mkBatch(T[0],118,[{w:1480,t:7},{w:1525,t:7.5},{w:1390,t:6.8}],'01',{status:'done'});
mkBatch(T[2],96,[{w:1320,t:6},{w:1295,t:6.2}],'01',{status:'done'});
mkBatch(T[1],74,[{w:2210,t:9},{w:2105,t:8.6}],'01');
mkBatch(T[0],48,[{w:1610,t:7.2},{w:1555,t:7}],'02');
mkBatch(T[3],22,[{w:980,t:5},{w:1010,t:5.2},{w:955,t:4.9},{w:1002,t:5}],'01');
mkBatch(T[4],9,[{w:1850,t:4}],'01',{coreT:5.2,overdueIdx:1});
mkBatch(T[2],5,[{w:1450,t:6.5},{w:1390,t:6.1}],'02');
mkBatch(T[1],2,[{w:2050,t:8.8},{w:1990,t:8.5}],'02');
// history for Analytics: finished batches with tastings (saved through the real saveTasting form path)
const { bridge, withForm } = await import('../src/lib/core/bridge.js');
const hist = [[T[0],300,'H1',[1490,1530],7],[T[0],250,'H2',[1610,1440],7.2],[T[0],210,'H3',[1550,1500],6.8],[T[0],170,'H4',[1460,1580],7.4],[T[1],260,'H1',[2150,2080],8.8],[T[1],200,'H2',[2010,2230],9],[T[2],180,'H1',[1300,1350],6]];
hist.forEach(([t,ago,lot,ws,th],k)=>{
  const b=mkBatch(t,ago,ws.map(w=>({w,t:th})),lot,{status:'done'});
  const days=[45,75,105].filter(d=>d<ago);
  days.forEach((d,j)=>{
    const f=new Date(new Date(b.startedAt).getTime()+d*DAY).toISOString().slice(0,10);
    const g=Math.min(10,5.5+j*1.1+(k%3)*0.5); const q=(x)=>String(Math.max(1,Math.min(5,Math.round(x))));
    const form={'t-fecha':f,'t-apariencia':q(3+j*0.6),'t-textura':q(2.6+j*0.7),'t-aroma':q(3+j*0.5),'t-aromaInt':'3','t-salado':q(3+(k%2)),'t-salado-q':q(4-(k%2)),'t-dulce':'2','t-dulce-q':'4','t-umami':q(2+j),'t-umami-q':q(3+j*0.6),'t-acido':q(2+(k%3)),'t-acido-q':q(4-(k%3)*0.6),'t-global':String(Math.round(g*2)/2),'t-notas':''};
    C.DEFECT_CATALOG.forEach((_,i)=>{ form['t-def-'+i]= i===k%4 && j===0 ? '1' : (i<4?'0':''); });
    bridge.win._ntState={'Nuez':1,'Pimentón':j===2?2:1};
    withForm(form,()=>C.saveTasting(b.id));
  });
  b.pieces.forEach((p,i)=>{ if(i===0){ const w=p.weightLogs.at(-1)?.weight; if(w) withForm({'aw-date':p.weightLogs.at(-1).date.slice(0,10),'aw-val':(0.905+(k%3)*0.008).toFixed(3),'aw-w':String(w),'aw-inst':'Rotronic','aw-note':''},()=>C.saveAwReading(b.id,p.id)); }});
});
T[0].priceKg=140000; T[0].costKg=32000; T[0].tasteTarget=8; T[1].priceKg=160000; T[1].costKg=45000;
C.saveDB();
fs.writeFileSync(new URL('./demo-db.json', import.meta.url),JSON.stringify(db));
console.log('batches',db.batches.length,'agenda items',C.todaysAgenda().length);
console.log(C.todaysAgenda().map(i=>i.kind+' · '+i.label).join('\n'));
