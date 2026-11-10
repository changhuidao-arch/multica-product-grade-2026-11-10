import {initWorkspaceShell} from './workspace-shell.js';
import {taskContext} from './task-context.js';
import {navigation,rememberRun,sidebar,setWorkspaceName} from './workspace-nav.js';
import {diagnoseFailure} from './failure-diagnosis.js';
import {runtimeBrand, runtimeDisplayName, runtimeProviderText} from './runtime-vendor-icons.js';
import {escapeHTML as e,markdown} from './payload-parser.js';
import {icon,hydrateIcons,sticker,agentPortrait as portraitFor} from './icons.js';

const $=s=>document.querySelector(s), main=$('#main');
let data,selected='',scope='all',query='',graphStatus='all',graphAgent='',graphQuery='',sort='oldest',zoom=1,alertTab='history';
const collapsed=new Set(),expandedTimelines=new Set();
$('.side').innerHTML=sidebar('tasks');initWorkspaceShell();hydrateIcons();

const labels={tasks:'任务监控',detail:'任务详情与审阅',graph:'调用流程图',alerts:'异常提醒',performance:'执行性能',runtime:'运行时'};
const stateLabels={in_review:'待审核',in_progress:'处理中',backlog:'待规划',todo:'待处理',done:'已完成',blocked:'受阻',completed:'运行完成',failed:'失败',running:'运行中',queued:'排队中',cancelled:'已取消'};
const active=r=>['running','queued','dispatched','waiting_local_directory','deferred'].includes(r.status);
const stamp=v=>v?new Date(v).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).replace('/','-'):'未提供';
const duration=r=>{const n=Math.max(0,Date.parse(r.completedAt)-Date.parse(r.startedAt));return Number.isFinite(n)?`${Math.floor(n/60000)} 分 ${Math.floor(n/1000)%60} 秒`:'待核实';};
const num=v=>typeof v==='number'?v.toLocaleString():'未上报';
const badge=v=>`<span class="badge ${e(v)}">${e(stateLabels[v]||v)}</span>`;
function taskIcon(i){return data.issues.some(x=>x.issue.parentIssueId===i.id)?'folder':/代码审查/.test(i.title)?'owl':/方案设计评审/.test(i.title)?'certificate':/评审/.test(i.title)?'review':/需求/.test(i.title)?'document':/构建/.test(i.title)?'build':/编码/.test(i.title)?'terminal':/方案/.test(i.title)?'plan':/运行时/.test(i.title)?'monitor':'lock';}
const portrait=r=>portraitFor(r.agentName);
const route=()=>{const p=new URLSearchParams(location.hash.slice(1).replace(/^([^?]+)\??/,'page=$1&'));return {page:p.get('page')||'tasks',issue:p.get('issue'),run:p.get('run')};};
const itemFor=id=>data.issues.find(x=>x.issue.id===id||x.issue.identifier===id);
const kpi=(label,value,iconName,{sub='',empty=false,text=false}={})=>`<div class="kpi ${empty?'is-empty':''}"><span class="kpi-label">${icon(iconName)}${label}</span>${text?`<span class="kpi-text">${value}</span>`:`<b>${value}</b>`}${sub?`<span class="kpi-sub">${sub}</span>`:''}</div>`;

function nav(){
  const r=route();document.body.dataset.page=r.page;
  $('#nav').innerHTML=navigation(r.page);
  $('#heading').textContent=labels[r.page]||labels.tasks;
  $('#crumb').textContent=`工作区 / ${data.workspace}${r.issue?' / '+(itemFor(r.issue)?.issue.identifier||'任务'):''}`;
  document.title=`${labels[r.page]||labels.tasks} · Multica`;
}
function ordered(){const list=[],seen=new Set();function add(x,depth=0,hidden=false){if(seen.has(x.issue.id))return;seen.add(x.issue.id);if(!hidden)list.push({...x,depth});data.issues.filter(c=>c.issue.parentIssueId===x.issue.id).forEach(c=>add(c,depth+1,hidden||collapsed.has(x.issue.id)));}data.issues.filter(x=>!itemFor(x.issue.parentIssueId)).forEach(x=>add(x));data.issues.forEach(x=>add(x));return list;}

function tasks(){
  const all=data.issues;
  const groups={all,review:all.filter(x=>x.issue.status==='in_review'),active:all.filter(x=>x.runs.some(active)),attention:all.filter(x=>x.issue.status==='blocked'),history:all.filter(x=>x.runs.some(r=>r.status==='failed'))};
  const stats={all:['全部任务','layers'],review:['待审核','review'],active:['活动运行','play'],attention:['运行需关注','warning'],history:['有历史失败','history']};
  const filtered=query?all.map(x=>({...x,depth:0})):ordered();
  const rows=filtered.filter(x=>groups[scope].includes(all.find(a=>a.issue.id===x.issue.id))&&`${x.issue.identifier} ${x.issue.title}`.toLowerCase().includes(query.toLowerCase()));
  main.innerHTML=`<div class="filters" role="group" aria-label="任务筛选">${Object.entries(stats).map(([k,[label,name]])=>`<button data-scope="${k}" class="${scope===k?'chosen':''} ${groups[k].length?'':'zero'}" aria-pressed="${scope===k}"><span class="stat-label">${icon(name)}${label}</span><b>${groups[k].length}</b></button>`).join('')}</div>
  <section class="card table-card"><div class="section-head"><h2>业务任务 <small>${rows.length} 个任务${groups.review.length?` · ${groups.review.length} 个任务待审核`:''}</small></h2><label class="search-field">${icon('search')}<input id="task-query" type="search" aria-label="搜索任务" placeholder="搜索任务名称或编号…" value="${e(query)}"></label></div>
  <div class="table-scroll"><table class="tasks"><thead><tr><th>任务 / 层级</th><th>业务状态</th><th>当前执行</th><th>运行记录</th><th>关注情况</th></tr></thead><tbody>${rows.map(x=>{
    const i=x.issue,children=all.filter(a=>a.issue.parentIssueId===i.id).length,failed=x.runs.filter(r=>r.status==='failed').length,running=x.runs.some(active);
    return `<tr class="${x.depth?'child':''}"><td><div class="task-name" style="padding-left:${x.depth*28}px">${children?`<button class="tree" data-collapse="${i.id}" aria-label="展开或收起子任务" aria-expanded="${!collapsed.has(i.id)}">${icon('chevron')}</button>`:'<span class="tree"></span>'}<a href="#detail?issue=${i.id}">${sticker(taskIcon(i))}<span><small>${e(i.identifier)}</small><strong>${e(i.title.replace(/^CXTE-3\s*/,''))}</strong></span></a>${children?`<small class="chip child-count">${children} 个子任务</small>`:''}</div></td><td>${badge(i.status)}</td><td><span class="run-state-text ${running?'is-active':''}">${running?'执行中':'无活动运行'}</span></td><td><span class="run-count ${x.runs.length?'':'zero'}"><b>${x.runs.length}</b> 次</span></td><td>${failed?`<a class="history" href="#alerts?issue=${i.id}">${icon('history')}历史失败 ${failed} 次</a>`:'<span class="no-alert">无当前告警</span>'}</td></tr>`;
  }).join('')}</tbody></table>${!rows.length?`<p class="empty"><strong>没有匹配任务</strong>清空搜索或切换筛选。</p>`:''}</div>
  <footer class="card-foot">业务状态与运行结果独立记录<span>${all.length} 个任务 · ${all.reduce((n,x)=>n+x.runs.length,0)} 次运行</span></footer></section>`;
}

function runLinks(r){return `<a class="button" href="./waterfall.html?run=${r.id}&from=${route().page}">${icon('waterfall')}时间瀑布图</a><a class="button" href="./process.html?run=${r.id}&from=${route().page}">${icon('process')}执行过程</a>`;}
function inspector(item,run){
  if(!run)return `<section class="panel"><p class="empty"><strong>尚未选择运行</strong>选择一次运行查看输入与输出。</p></section>`;
  const comments=(data.comments[item.issue.id]?.comments||[]),replies=comments.filter(c=>c.sourceTaskId===run.id),input=comments.find(c=>c.id===run.triggerCommentId);
  const wait=Math.max(0,Math.round((Date.parse(run.startedAt)-Date.parse(run.createdAt))/1000));
  return `<aside class="panel inspector"><div class="section-head"><h2>所选运行</h2><select id="run-select" aria-label="选择运行">${item.runs.map(r=>`<option value="${r.id}" ${r.id===run.id?'selected':''}>${e(r.agentName)} · #${r.id.slice(-8)}</option>`).join('')}</select></div>
  <div class="identity">${sticker(portrait(run))}<div><strong>${e(run.agentName)}</strong><small>#${run.id.slice(-8)}</small></div>${badge(run.status)}</div>
  <dl class="timing"><div><dt>启动前等待</dt><dd>${wait} 秒</dd></div><div><dt>运行耗时</dt><dd>${duration(run)}</dd></div></dl>
  <div class="run-links">${runLinks(run)}</div>
  ${run.error?`<div class="failure"><strong>${icon('error')}运行失败</strong><pre>${e(run.error)}</pre></div>`:''}
  <details class="io" open><summary>本轮输出</summary>${replies.length?replies.map(c=>`<small>正式回复 · ${stamp(c.createdAt)}</small><div class="prose preview">${markdown(c.content||'空回复')}</div><button data-read="${c.id}">${icon('expand')}展开完整内容</button>`).join(''):'<p>当前记录没有与本轮明确关联的正式回复，可查看执行过程。</p>'}</details>
  <details class="io"><summary>本轮输入</summary><div class="prose">${markdown(input?.content||run.triggerSummary||'未提供触发正文')}</div><small>来自任务触发记录；完整 CLI 提示词未提供。</small></details>
  <details class="io"><summary>运行时间与数据范围</summary><p>开始 ${stamp(run.startedAt)}<br>结束 ${stamp(run.completedAt)}</p><p>运行完成不代表业务任务已验收。所有内容来自本地快照。</p></details></aside>`;
}
function taskHeader(item){
  const suffix=`?issue=${item.issue.id}${selected?'&run='+selected:''}`;
  return `<a class="back-task" href="#tasks">${icon('back')}返回任务列表</a>`+taskContext(data,item,selected,route().page,sticker(taskIcon(item.issue)))+`<div class="view-tabs"><a href="#detail${suffix}" ${route().page==='detail'?'aria-current="page"':''}>${icon('timeline')}运行时间线与审阅</a><a href="#graph${suffix}" ${route().page==='graph'?'aria-current="page"':''}>${icon('graph')}调用流程图</a><span>选择运行查看输入、输出与耗时</span></div>`;
}
function revealSelectedRun(){
  const list=$('#run-timeline-list'),row=list?.querySelector('.selected');
  if(!row||!$('.detail-grid.timeline-compact'))return;
  const a=list.getBoundingClientRect(),b=row.getBoundingClientRect();
  if(list.scrollHeight>list.clientHeight){if(b.top<a.top)list.scrollTop+=b.top-a.top;else if(b.bottom>a.bottom)list.scrollTop+=b.bottom-a.bottom;}
  if(list.scrollWidth>list.clientWidth){if(b.left<a.left)list.scrollLeft+=b.left-a.left;else if(b.right>a.right)list.scrollLeft+=b.right-a.right;}
}
function detail(){
  const item=itemFor(route().issue)||itemFor('CXTE-9');if(!item)return;
  const rs=[...item.runs].sort((a,b)=>sort==='longest'?(Date.parse(b.completedAt)-Date.parse(b.startedAt))-(Date.parse(a.completedAt)-Date.parse(a.startedAt)):sort==='newest'?Date.parse(b.createdAt)-Date.parse(a.createdAt):Date.parse(a.createdAt)-Date.parse(b.createdAt));
  const run=rs.find(x=>x.id===(route().run||selected))||rs.find(r=>/评审|审查/.test(r.agentName))||rs.at(-1);selected=run?.id||'';
  const start=Math.min(...rs.map(r=>Date.parse(r.createdAt))),end=Math.max(...rs.map(r=>Date.parse(r.completedAt)||Date.parse(r.startedAt)||Date.parse(r.createdAt)));
  const expanded=expandedTimelines.has(item.issue.id),gate=(data.comments[item.issue.id]?.comments||[]).some(c=>c.content?.includes('[GATE:REVIEW]'));
  main.innerHTML=taskHeader(item)+(item.issue.status==='in_review'?`<div class="callout warn review-banner">${icon('review')}<div><small>业务状态</small><h2>${gate?'等待人工放行':'等待人工审核'}</h2><span>运行结果与业务验收分别记录</span></div><button data-latest>查看最新正式回复 ${icon('arrowDown')}</button></div>`:'')+`<div class="detail-grid ${expanded?'timeline-expanded':'timeline-compact'}"><section class="panel run-timeline" aria-label="运行时间线"><div class="timeline-heading"><h2>运行记录 <small>${rs.length}</small></h2><button id="timeline-toggle" aria-expanded="${expanded}" aria-controls="run-timeline-list">${expanded?'收起时间线 ←':'展开时间线 →'}</button></div><div class="timeline-sort"><select id="run-sort" aria-label="运行排序"><option value="oldest">时间从早到晚</option><option value="newest">最近运行优先</option><option value="longest">运行耗时最长</option></select></div><p class="muted timeline-range">${rs.length?`${stamp(start)} — ${stamp(end)}`:'暂无时间范围'}</p><div class="time-axis"><span>智能体 / 运行</span><span>启动等待与执行区间</span><span></span></div><div id="run-timeline-list">${rs.map(r=>`<button class="time-row ${r.id===selected?'selected':''}" data-run="${r.id}" aria-pressed="${r.id===selected}" title="${e(r.agentName)} · #${r.id.slice(-8)} · ${e(stateLabels[r.status]||r.status)} · ${duration(r)}"><span class="run-identity">${sticker(portrait(r))}<b>${e(r.agentName)}</b><small class="run-reference">#${r.id.slice(-8)}</small></span><span class="track"><i style="left:${(Date.parse(r.createdAt)-start)/(end-start||1)*100}%;width:${Math.max(.5,(Date.parse(r.startedAt)-Date.parse(r.createdAt))/(end-start||1)*100)}%"></i><i class="execute ${r.status}" style="left:${(Date.parse(r.startedAt)-start)/(end-start||1)*100}%;width:${Math.max(.5,(Date.parse(r.completedAt)-Date.parse(r.startedAt))/(end-start||1)*100)}%"></i></span><small class="run-duration">${duration(r)}</small><span class="run-state">${badge(r.status)}</span></button>`).join('')||'<p class="empty">尚无运行记录</p>'}</div><p class="muted timeline-note">横轴是实际时间，条长表示等待与执行区间。</p></section>${inspector(item,run)}</div>`;
  $('#run-sort').value=sort;revealSelectedRun();
}
function graph(){
  const item=itemFor(route().issue)||itemFor('CXTE-4');
  const full=item.runs,rs=full.filter(r=>(graphStatus==='all'||r.status===graphStatus)&&(!graphAgent||r.agentId===graphAgent)&&`${r.id} ${r.agentName} ${r.triggerSummary||''}`.toLowerCase().includes(graphQuery.toLowerCase()));
  const edges=[];for(const r of rs)for(const [key,label]of [['delegatedFromTaskId','委派'],['rerunOfTaskId','重跑'],['retryOfTaskId','重试'],['parentTaskId','父运行']])if(r[key]&&rs.some(x=>x.id===r[key])&&!edges.some(x=>x.from===r[key]&&x.to===r.id))edges.push({from:r[key],to:r.id,label});
  const groups=[],seen=new Set();
  for(const r of rs){if(seen.has(r.id))continue;const group=[],queue=[r.id];while(queue.length){const id=queue.shift();if(seen.has(id))continue;seen.add(id);group.push(rs.find(x=>x.id===id));for(const edge of edges)if(edge.from===id)queue.push(edge.to);else if(edge.to===id)queue.push(edge.from);}groups.push(group.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)));}
  const isolated=groups.filter(g=>g.length===1);if(isolated.length>1){for(const g of isolated)groups.splice(groups.indexOf(g),1);groups.push(isolated.flat());}
  groups.sort((a,b)=>b.length-a.length);
  const run=full.find(x=>x.id===(route().run||selected))||full.find(x=>x.id.endsWith('d1701910'))||full[0];selected=run?.id||'';
  main.innerHTML=taskHeader(item)+`<div class="graph-controls"><select id="graph-status" aria-label="筛选运行状态"><option value="all">全部状态</option><option value="completed">运行完成</option><option value="failed">失败</option><option value="running">运行中</option></select><select id="graph-agent" aria-label="筛选智能体"><option value="">全部智能体</option>${[...new Map(full.map(r=>[r.agentId,r.agentName]))].map(([id,n])=>`<option value="${id}">${e(n)}</option>`).join('')}</select><label class="search-field">${icon('search')}<input id="graph-query" type="search" placeholder="运行编号 / 触发内容" aria-label="搜索运行" value="${e(graphQuery)}"></label><div class="zoom-group" role="group" aria-label="缩放"><button data-zoom="-.1" aria-label="缩小" title="缩小">${icon('minus')}</button><span>${Math.round(zoom*100)}%</span><button data-zoom=".1" aria-label="放大" title="放大">${icon('plus')}</button></div><button data-fit>${icon('fit')}适应宽度</button></div>
  <div class="graph-grid"><section><div class="graph-legend"><span class="lg">已完成</span><span class="lg bad">失败</span><span class="lg line">委派</span><span class="lg dash">重跑</span><span>${edges.length} 条已确认关系</span></div><div class="graph-scroll"><div class="chains" style="--zoom:${zoom}">${groups.map((group,n)=>`<section class="chain"><h3>${group.every(r=>!edges.some(e=>e.from===r.id||e.to===r.id))?'来源未关联':'调用链 '+(n+1)} <small>· ${group.length} 次运行</small></h3>${group.map(r=>`<button class="node ${r.id===selected?'selected':''}" data-run="${r.id}" aria-pressed="${r.id===selected}">${sticker(portrait(r))}<strong>${e(r.agentName)}</strong><small>#${r.id.slice(-8)}</small>${badge(r.status)}<span>${duration(r)}</span></button>${edges.filter(x=>x.from===r.id).map(x=>`<button class="edge ${x.label==='委派'?'':'dashed'}" data-edge="${x.from}|${x.to}" title="查看来源记录"><span>↓ ${x.label} → <code>#${x.to.slice(-8)}</code></span></button>`).join('')}`).join('')}</section>`).join('')||'<p class="empty"><strong>没有符合筛选的运行</strong>调整状态、智能体或搜索条件。</p>'}</div></div><p class="muted graph-note">连线只采用服务端来源 ID；排列与间距不表示耗时。</p></section>${inspector(item,run)}</div>`;
  $('#graph-status').value=graphStatus;$('#graph-agent').value=graphAgent;
}
function alerts(){
  const list=(data.history||[]).filter(x=>!route().issue||x.issueId===route().issue),groups=new Map();
  for(const x of list){const key=x.issueId+'|'+x.error;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x);}
  const history=`<h2 class="section-title">历史运行失败 · ${list.length}</h2>${[...groups.values()].map((g,n)=>{const i=itemFor(g[0].issueId)?.issue,diagnosis=diagnoseFailure(g[0].error);return `<details class="alert-group" ${n===0?'open':''}><summary>${sticker(taskIcon(i||{title:''}))}<span><strong>${e(i?.identifier||'关联任务')}</strong><small>${e(i?.title||'')}</small></span><b>${icon('error')}${e(diagnosis?.title||'运行错误')}</b><span class="chip">${g.length} 次</span><time>${stamp(g[0].failedAt)}</time></summary><div class="alert-body"><p class="diagnosis">${e(diagnosis?.summary||'')}</p><details><summary>查看原始错误</summary><pre>${e(g[0].error||'未提供错误详情')}</pre></details>${g.map(f=>`<p class="alert-run"><span class="ref">#${f.runId.slice(-8)}</span><time>${stamp(f.failedAt)}</time><a class="button sm" href="#detail?issue=${f.issueId}&run=${f.runId}">查看任务与日志 ${icon('arrowUpRight')}</a></p>`).join('')}</div></details>`;}).join('')||'<p class="empty"><strong>没有历史失败</strong>所选范围内的运行均未记录失败。</p>'}`;
  main.innerHTML=`<div class="callout ok alert-clear">${icon('checkCircle')}<div><strong>当前无异常提醒</strong><span>当前无待处理提醒，历史失败可按任务追溯。</span></div></div>
  <div class="tab-row"><div class="segmented" role="group" aria-label="提醒范围"><button class="${alertTab==='current'?'chosen':''}" data-current-alerts aria-pressed="${alertTab==='current'}">待处理 <b>0</b></button><button class="${alertTab==='history'?'chosen':''}" data-history-alerts aria-pressed="${alertTab==='history'}">历史失败 <b>${list.length}</b></button></div><span>已核对 ${data.coverage.checkedIssues} / ${data.coverage.totalIssues} 个任务</span>${route().issue?'<a href="#alerts">查看全部任务</a>':''}</div>
  <div id="history">${alertTab==='current'?'<p class="empty"><strong>当前无待处理提醒</strong>新的异常会出现在这里。</p>':history}</div>
  <details class="scope"><summary>${icon('rules')}监控规则与阈值</summary><p>运行总耗时 ${data.rules.runMinutes} 分钟 · 启动等待 ${data.rules.queueMinutes} 分钟 · 无新进展 ${data.rules.noProgressMinutes} 分钟 · 工具等待 ${data.rules.toolMinutes} 分钟。</p><p>本地快照用于回放，规则调整需在原系统操作。</p></details>
  <details class="scope"><summary>${icon('scope')}历史数据范围与统计口径</summary><p>历史失败与当前提醒分别统计。历史补采 ${data.coverage.checkedIssues}/${data.coverage.totalIssues} 个任务；原始错误与运行 ID 均保留。</p></details>`;
}
function performance(){
  const m=data.metrics,t=m.tokens;
  main.innerHTML=`<p class="page-note">${icon('clock')}本次采集始于 ${stamp(data.startedAt)}</p>
  <div class="metric-strip kpi-grid">${kpi('活动运行',m.active,'play',{empty:!m.active})}${kpi('排队',m.queued,'queue',{empty:!m.queued})}${kpi('状态待核实',m.unknown,'help',{empty:!m.unknown})}${kpi('已确认终态',m.sampleSize,'checkCircle',{empty:!m.sampleSize})}</div>
  <div class="callout plain perf-callout review-banner">${icon('info')}<div><strong>${m.sampleSize?'已确认终态 '+m.sampleSize:'暂无终态样本'}</strong><span>启动前的历史运行不计入本次耗时与失败率。</span></div></div>
  <section class="panel"><div class="section-head"><h2>模型用量与成本</h2><span class="muted">${t.sampleSize} 次运行有用量记录</span></div><div class="metrics">${kpi('输入 Token',num(t.inputTokens),'token')}${kpi('输出 Token',num(t.outputTokens),'token')}${kpi('缓存读取',num(t.cacheReadTokens),'cache')}${kpi('缓存写入',num(t.cacheWriteTokens),'cache',{empty:!t.cacheWriteTokens})}${kpi('已上报成本 · USD',num(t.costUsd),'cost',{sub:'缺失费用不按 0 估算',text:typeof t.costUsd!=='number'})}</div></section>
  <details class="scope"><summary>${icon('users')}智能体并发 <small>${data.agents.length} 个智能体 · 查看各自上限</small></summary><div class="table-scroll"><table><thead><tr><th>智能体</th><th>配置上限</th></tr></thead><tbody>${data.agents.map(a=>`<tr><td>${e(a.name)}</td><td class="tnum">${a.maxConcurrentTasks??'未提供'}</td></tr>`).join('')}</tbody></table></div></details>
  <section class="panel resource"><div class="section-head"><h2>机器资源</h2><span class="badge in_review">采集未接入</span></div><div class="resource-grid"><div class="resource-empty">${icon('cpu')}<div><h3>CPU</h3><p>暂无指标</p></div></div><div class="resource-empty">${icon('memory')}<div><h3>内存</h3><p>暂无指标</p></div></div></div><p class="muted timeline-note">当前接口未提供机器资源数据</p></section>
  <details class="scope"><summary>${icon('scope')}仅统计已有用量记录，不代表全工作区实时用量</summary><p>${e(t.scope)}</p><p>${e(m.scope)}</p></details>`;
}
function runtime(){
  const rs=data.runtimes,count=s=>rs.filter(r=>r.status===s).length;
  main.innerHTML=`<p class="page-note">${icon('info')}查看快照采集时的节点连接状态。</p>
  <div class="runtime-strip kpi-grid">${kpi('可见节点',rs.length,'runtime')}${kpi('可接收任务',count('online'),'checkCircle',{empty:!count('online')})}${kpi('执行中',count('busy'),'play',{empty:!count('busy')})}${kpi('离线',count('offline'),'error',{empty:!count('offline')})}${kpi('最近上报',stamp(rs.map(r=>r.lastSeenAt).sort().at(-1)),'clock',{text:true})}</div>
  <section class="panel runtime-panel"><div class="section-head"><h2>运行时连接 <small>${rs.length} 个节点</small></h2><label class="search-field">${icon('search')}<input id="runtime-query" type="search" aria-label="搜索运行时" placeholder="搜索运行时或机器名称…"></label></div><div class="table-scroll"><table><thead><tr><th>运行时</th><th>提供方</th><th>快照时连接状态</th><th>最后在线</th></tr></thead><tbody>${rs.map(r=>{const display=runtimeDisplayName(r.name);return `<tr data-runtime="${e(r.name.toLowerCase())}"><td><div class="identity runtime-identity">${runtimeBrand(r.provider)}<div><strong>${e(display.name)}</strong><small>${e(display.host)}</small></div></div></td><td><span class="runtime-provider">${runtimeBrand(r.provider)}<span>${e(runtimeProviderText(r.provider))}</span></span></td><td><span class="badge ${r.status==='online'?'online':r.status==='busy'?'running':'offline'}">${r.status==='online'?'在线':e(r.status)}</span></td><td class="tnum">${stamp(r.lastSeenAt)}</td></tr>`;}).join('')}</tbody></table></div><p id="runtime-empty" hidden>没有匹配的运行时。</p><p class="muted">${icon('info')}连接状态不代表 CPU 或内存健康度</p></section>`;
}
function render(){
  if(!data)return;nav();
  ({tasks,detail,graph,alerts,performance,runtime}[route().page]||tasks)();
  const p=route();
  if(['detail','graph'].includes(p.page)){const item=itemFor(p.issue)||itemFor(p.page==='graph'?'CXTE-4':'CXTE-9');if(item)rememberRun(item.issue.id,selected,p.page);}
  $('#nav').innerHTML=navigation(p.page);
}
main.addEventListener('click',event=>{
  const b=event.target.closest('button,[data-read]');if(!b)return;
  if(b.id==='timeline-toggle'){
    const item=itemFor(route().issue)||itemFor('CXTE-9');
    const expanded=!expandedTimelines.has(item.issue.id);
    expanded?expandedTimelines.add(item.issue.id):expandedTimelines.delete(item.issue.id);
    const grid=$('.detail-grid');grid.classList.toggle('timeline-expanded',expanded);grid.classList.toggle('timeline-compact',!expanded);
    b.setAttribute('aria-expanded',String(expanded));b.textContent=expanded?'收起时间线 ←':'展开时间线 →';revealSelectedRun();
    return;
  }
  if(b.dataset.scope){scope=b.dataset.scope;tasks();$(`[data-scope="${scope}"]`)?.focus();}
  if(b.dataset.collapse){const id=b.dataset.collapse;collapsed.has(id)?collapsed.delete(id):collapsed.add(id);tasks();$(`[data-collapse="${id}"]`)?.focus();}
  if(b.dataset.run){selected=b.dataset.run;const p=route();history.replaceState(null,'',`#${p.page}?issue=${p.issue||(p.page==='graph'?'CXTE-4':'CXTE-9')}&run=${selected}`);render();}
  if(b.dataset.read){const c=Object.values(data.comments).flatMap(x=>x.comments||[]).find(x=>x.id===b.dataset.read);$('#reader-heading').textContent='完整记录';$('#reader-body').innerHTML=`<article class="prose">${markdown(c?.content||'未提供',{limit:0})}</article>`;$('#reader').showModal();$('#reader-body').scrollTop=0;}
  if(b.hasAttribute('data-latest'))$('.inspector')?.scrollIntoView({block:'start'});
  if(b.dataset.zoom){zoom=Math.max(.5,Math.min(1.5,zoom+Number(b.dataset.zoom)));graph();}
  if(b.hasAttribute('data-fit')){zoom=1;graph();const box=$('.graph-scroll'),chains=$('.chains');zoom=Math.min(1,box.clientWidth/chains.scrollWidth);graph();}
  if(b.dataset.edge){const [from,to]=b.dataset.edge.split('|');$('#reader-heading').textContent='已确认的运行关系';$('#reader-body').innerHTML=`<h3>已确认的运行关系</h3><p class="relation">来源 #${e(from)} ${icon('sortDown')} 目标 #${e(to)}</p><p>关系来自目标运行的来源字段，不根据时间推测。</p><button class="primary" data-target-run="${to}">查看目标运行</button>`;$('#reader').showModal();}
  if(b.hasAttribute('data-current-alerts')){alertTab='current';alerts();$('[data-current-alerts]').focus();}
  if(b.hasAttribute('data-history-alerts')){alertTab='history';alerts();$('[data-history-alerts]').focus();}
});
main.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='task-select'){selected='';location.hash=`${route().page}?issue=${encodeURIComponent(el.value)}`;return;}
  if(el.id==='run-select'){selected=el.value;const p=route();history.replaceState(null,'',`#${p.page}?issue=${p.issue||(p.page==='graph'?'CXTE-4':'CXTE-9')}&run=${selected}`);render();}
  if(el.id==='run-sort'){sort=el.value;detail();}
  if(el.id==='graph-status'){graphStatus=el.value;graph();}
  if(el.id==='graph-agent'){graphAgent=el.value;graph();}
});
main.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='task-query'||el.id==='graph-query'){const id=el.id,pos=el.selectionStart;if(id==='task-query'){query=el.value;tasks();}else{graphQuery=el.value;graph();}$('#'+id).focus();$('#'+id).setSelectionRange(pos,pos);}
  if(el.id==='runtime-query'){let count=0;document.querySelectorAll('[data-runtime]').forEach(row=>{row.hidden=!row.dataset.runtime.includes(el.value.toLowerCase());if(!row.hidden)count++;});$('#runtime-empty').hidden=count>0;}
});
$('#reader-body').addEventListener('click',event=>{const id=event.target.closest('[data-target-run]')?.dataset.targetRun;if(id){selected=id;$('#reader').close();const p=route();history.replaceState(null,'',`#graph?issue=${p.issue||'CXTE-4'}&run=${id}`);graph();}});
$('#close-reader').onclick=()=>$('#reader').close();
$('#reader').addEventListener('click',event=>{if(event.target===$('#reader'))$('#reader').close();});
$('#reload').onclick=()=>location.reload();
window.addEventListener('hashchange',()=>{selected='';alertTab='history';render();window.scrollTo(0,0);});
try{
  const response=await fetch('./new-data.json');if(!response.ok)throw new Error();
  data=await response.json();setWorkspaceName(data.workspace);render();
}catch{
  main.innerHTML=`<div class="load-state" role="alert">${icon('error')}<strong>快照读取失败</strong><p>请确认本地服务运行后，点击顶部重载快照。</p><button id="retry-snapshot">重新读取</button></div>`;$('#retry-snapshot').onclick=()=>location.reload();
}
