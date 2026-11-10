import {initWorkspaceShell} from './workspace-shell.js';
import {taskContext} from './task-context.js';
import {sidebar,navigation,rememberRun,setWorkspaceName} from './workspace-nav.js';
import {escapeHTML as esc} from './payload-parser.js';
import {icon,hydrateIcons,stickerPosition,agentPortrait} from './icons.js';
const requested=new URLSearchParams(location.search).get('run');
export const runId=requested&&/^[a-zA-Z0-9-]+$/.test(requested)?requested:'';
export const runDataURL=runId?`./runs/${runId}.json`:'./waterfall-data.json';
export const sourceView=new URLSearchParams(location.search).get('from')==='graph'?'graph':'detail';
const page=location.pathname.endsWith('process.html')?'process':'waterfall';
document.body.classList.add('run-workspace');
const side=document.createElement('aside');side.className='side run-sidebar';side.innerHTML=sidebar(page);document.body.prepend(side);initWorkspaceShell();hydrateIcons();
const statusLabels={completed:'运行完成',failed:'运行失败',running:'运行中',cancelled:'已取消'};
export function runContext(data){
 const r=data.run,clock=v=>v?new Date(v).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).replace('/','-'):'未提供';
 rememberRun(r.issue,r.id,sourceView);side.querySelector('nav').innerHTML=navigation(page,{issue:r.issue,run:r.id,view:sourceView});
 const detail=`./new.html#detail?issue=${encodeURIComponent(r.issue)}&run=${r.id}`,graph=`./new.html#graph?issue=${encodeURIComponent(r.issue)}&run=${r.id}`;
 document.querySelector('.breadcrumb').innerHTML=`<a href="./new.html#tasks">任务监控</a><span>/</span><a href="${detail}">${esc(r.issue)} · ${esc(r.issueTitle||'')}</a><span>/</span><span>#${esc(r.id.slice(-8))}</span>`;
 document.title=`${page==='process'?'执行过程':'时间瀑布'} · #${r.id.slice(-8)} · Multica`;
 document.querySelectorAll('.run-status').forEach(el=>{el.textContent=statusLabels[r.status]||r.status;el.className='run-status '+(/^[a-z_]+$/.test(r.status)?r.status:'');});
 const meta=document.querySelector('.run-meta');if(meta)meta.textContent=`${r.agentName}　·　${clock(r.startedAt)} — ${clock(r.completedAt)}　·　${data.rawCount} 条日志`;
 const avatar=document.querySelector('.heading-identity .agent-avatar');if(avatar){avatar.style.backgroundImage="url('./assets/theme-icons.png')";avatar.style.backgroundPosition=stickerPosition(agentPortrait(r.agentName));}
 document.documentElement.style.setProperty('--reply-avatar',stickerPosition(agentPortrait(r.agentName)));
 const p=document.querySelector('.process-heading .heading-identity>div>p');if(p)p.textContent=`${r.agentName}　·　${clock(r.startedAt)} — ${clock(r.completedAt)}`;
 let controls=document.querySelector('.run-context-controls');if(!controls){controls=document.createElement('div');controls.className='run-context-controls';document.querySelector('main').prepend(controls);}
 controls.innerHTML=`<a class="return-graph" href="${sourceView==='graph'?graph:detail}">${icon('back')}${sourceView==='graph'?'返回调用图':'返回任务时间线'}</a><nav aria-label="运行展示方式"><a href="${detail}">${icon('io')}输入与输出</a><a href="./waterfall.html?run=${r.id}&from=${sourceView}" ${page==='waterfall'?'aria-current="page"':''}>${icon('waterfall')}时间瀑布图</a><a href="./process.html?run=${r.id}&from=${sourceView}" ${page==='process'?'aria-current="page"':''}>${icon('process')}执行过程</a></nav><label>运行记录<select id="context-run" aria-label="切换运行记录" disabled><option>${esc(r.agentName)} · #${r.id.slice(-8)}</option></select></label>`;
 let subject=document.querySelector('#run-task-context');if(!subject){subject=document.createElement('div');subject.id='run-task-context';controls.before(subject);}
 subject.innerHTML=`<section class="task-context-card" aria-label="当前业务任务"><div class="task-subject"><div class="task-subject-copy"><small>业务任务 · ${esc(r.issue)}</small><h2>${esc(r.issueTitle||r.issue)}</h2></div></div></section>`;
 fetch('./new-data.json').then(res=>{if(!res.ok)throw new Error();return res.json();}).then(snapshot=>{
  const item=snapshot.issues.find(item=>item.runs.some(run=>run.id===r.id));if(!item)return;
  setWorkspaceName(snapshot.workspace);
  subject.innerHTML=taskContext(snapshot,item,r.id,sourceView);
  subject.querySelector('#task-select').onchange=event=>{
   const next=snapshot.issues.find(x=>x.issue.id===event.target.value);
   if(!next)return;
   const nextRun=[...next.runs].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
   location.href=nextRun?`./${page}.html?run=${nextRun.id}&from=${sourceView}`:`./new.html#detail?issue=${next.issue.id}`;
  };
  const picker=document.querySelector('#context-run');picker.innerHTML=item.runs.map(run=>`<option value="${esc(run.id)}" ${run.id===r.id?'selected':''}>${esc(run.agentName)} · #${run.id.slice(-8)} · ${esc(({completed:'完成',failed:'失败'})[run.status]||run.status)}</option>`).join('');picker.disabled=false;
  picker.onchange=()=>{location.href=`./${page}.html?run=${encodeURIComponent(picker.value)}&from=${sourceView}`;};
 }).catch(()=>{document.querySelector('#context-run').title='运行列表读取失败，当前记录仍可查看';});
 document.querySelectorAll('[data-case],[data-example]').forEach(b=>{if(!data.rows.some(row=>row.seq===Number(b.dataset.case||b.dataset.example)))b.hidden=true;});
}
