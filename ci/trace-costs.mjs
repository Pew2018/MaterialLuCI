// Per-event inclusive costs remain separated by thread; never sum these rows as frame time.
export function traceCosts(events,start,end){
 const stacks=new Map(),complete=[],threads={};
 for(const e of events){
  const key=e.pid+":"+e.tid;
  if(e.ph==="M"&&e.name==="thread_name")threads[key]=e.args?.name;
  if(e.ph==="X")complete.push(e);
  else if(e.ph==="B"){let stack=stacks.get(key);if(!stack)stacks.set(key,stack=[]);stack.push(e);}
  else if(e.ph==="E"){const b=stacks.get(key)?.pop();if(b&&e.ts>=b.ts)complete.push({...b,ph:"X",dur:e.ts-b.ts,sourcePhase:"B/E"});}
 }
 const scoped=complete.filter(e=>e.ts<end&&e.ts+(e.dur||0)>start),costs={};
 for(const name of ["Layout","UpdateLayoutTree","Paint","RasterTask","RasterizerTaskImpl::RunOnWorkerThread","FunctionCall","RunTask","ThreadControllerImpl::RunTask","CompositeLayers","DrawFrame","Commit","ActivateLayerTree"]){
  const selected=scoped.filter(e=>e.name===name),byThread={};
  for(const e of selected){const key=e.pid+":"+e.tid,ms=Math.max(0,Math.min(end,e.ts+(e.dur||0))-Math.max(start,e.ts))/1000;const row=byThread[key]||(byThread[key]={name:threads[key]||"unknown",count:0,inclusiveMs:0,maxMs:0});row.count++;row.inclusiveMs+=ms;row.maxMs=Math.max(row.maxMs,ms);}
  costs[name]={count:selected.length,byThread};
 }
 return {costs,phases:Object.fromEntries(["X","B","E"].map(p=>[p,events.filter(e=>e.ph===p).length])),rasterEvidence:{allTrace:complete.filter(e=>/Raster/.test(e.name)).length,sample:scoped.filter(e=>/Raster/.test(e.name)).length},hotFunctions:scoped.filter(e=>e.name==="FunctionCall").sort((a,b)=>(b.dur||0)-(a.dur||0)).slice(0,15).map(e=>({thread:e.pid+":"+e.tid,durationMs:(e.dur||0)/1000,timeMs:(e.ts-start)/1000,...e.args?.data})),threads};
}
