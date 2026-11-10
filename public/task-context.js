import {escapeHTML as e} from './payload-parser.js';
import {icon} from './icons.js';
const states={in_review:'待审核',in_progress:'处理中',backlog:'待规划',todo:'待处理',done:'已完成',blocked:'受阻',cancelled:'已取消'};
export function taskURL(snapshot,issue){
 try{if(!snapshot.taskWebBase)return '';const url=new URL(snapshot.taskWebBase);if(!['http:','https:'].includes(url.protocol))return '';url.pathname=url.pathname.replace(/\/$/,'')+'/'+encodeURIComponent(issue.identifier);return url.href;}catch{return '';}
}
export function taskContext(snapshot,item,run='',view='detail',portrait=''){
 const issue=item.issue,parent=snapshot.issues.find(x=>x.issue.id===issue.parentIssueId),children=snapshot.issues.filter(x=>x.issue.parentIssueId===issue.id),url=taskURL(snapshot,issue);
 const parentLabel=parent?parent.issue.identifier:issue.parentIssueId?'父任务未加载':issue.parentIssueKnown===false?'父任务未知':'无父任务';
 return `<section class="task-context-card" aria-label="当前业务任务">
 <div class="task-subject">${portrait}<div class="task-subject-copy"><small>业务任务 · ${e(issue.identifier)}</small><h2>${e(issue.title)}</h2></div><label class="task-switch">切换任务<select id="task-select" aria-label="选择业务任务">${snapshot.issues.map(x=>`<option value="${e(x.issue.id)}" ${x.issue.id===issue.id?'selected':''}>${e(x.issue.identifier)} · ${e(x.issue.title)}</option>`).join('')}</select></label></div>
 <div class="task-context-meta"><span>业务状态 <strong class="task-business-state ${e(issue.status)}">${e(states[issue.status]||issue.status)}</strong></span><span>${item.runs.length} 次运行 · ${new Set(item.runs.map(r=>r.agentId)).size} 名智能体</span>${url?`<a class="task-external" href="${e(url)}" target="_blank" rel="noopener noreferrer">在 Multica 查看任务 ${icon('external')}</a>`:''}</div>
 <details class="task-hierarchy"><summary>任务层级 · ${e(parentLabel)} · ${children.length} 个子任务</summary><div>${parent?`<a href="./new.html#${view==='graph'?'graph':'detail'}?issue=${parent.issue.id}">↑ 父任务 · ${e(parent.issue.identifier)} · ${e(parent.issue.title)}</a>`:''}${children.map(x=>`<a href="./new.html#${view==='graph'?'graph':'detail'}?issue=${x.issue.id}">${e(x.issue.identifier)} · ${e(x.issue.title)}</a>`).join('')||'<span>没有子任务</span>'}</div></details>
 </section>`;
}
