import {runId,runDataURL,runContext,sourceView} from './run-context.js';
import { analyzeTool, unpack, markdown, escapeHTML as esc } from './payload-parser.js';
import { renderToolContent, codeBlock, truncation } from './payload-view.js';
import { createRecordReader } from './record-reader.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const names = { tool:'工具调用', thinking:'思考记录', text:'智能体回复' };
const tabs = { summary:'解析概览', input:'调用输入', output:'返回输出', raw:'原始记录' };
const paths = {
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  shell:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 8h18M7 12l3 2-3 2m6 0h4"/>',
  read:'<path d="M7 3h7l4 4v14H6V3h1m7 0v5h5M9 12h6m-6 4h6"/>',
  edit:'<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6ZM12 20h9"/>',
  thinking:'<path d="M9 18h6m-5 3h4M8 15c0-2-3-3-3-7a7 7 0 0 1 14 0c0 4-3 5-3 7z"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  arrow:'<path d="M5 19 19 5M8 5h11v11"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.shell}</svg>`;
$$('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const clock = time => new Date(time).toLocaleTimeString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'});
const elapsed = ms => {const sec=Math.floor(ms/1000);return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;};
const duration = ms => ms<1000?`${Math.round(ms)} 毫秒`:ms<60000?`${(ms/1000).toFixed(1)} 秒`:`${Math.floor(ms/60000)} 分 ${Math.round(ms%60000/1000)} 秒`;
const sequence = row => `#${row.seq}${row.lastSeq!==row.seq?'–'+row.lastSeq:''}`;
const state = {query:'',kind:'all',multi:false,empty:false,open:new Set(),tabs:new Map()};
let data, rows=[], visible=[], reader, toastTimer, searchTimer, scrollFrame;
const parsed=new Map(), content=new Map(), searchIndex=new Map();
const byId = id => rows.find(row=>row.id===id);
const infoFor = row => parsed.get(row.id);
const mobile = () => matchMedia('(max-width:700px)').matches;
function toast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,2600);}

function toolTitle(row) {
  const info=infoFor(row),cmd=info.command;
  if(info.title!=='执行命令')return info.title;
  if(/\bmultica issue get\b/.test(cmd))return '读取任务说明';
  if(/\bmultica (?:issue )?comment(?:s)? list\b/.test(cmd))return '读取任务讨论';
  if(/\bgit status\b/.test(cmd))return '检查工作区状态';
  if(/\bgit diff\b/.test(cmd))return '查看文件变更';
  if(/\bGet-Content\b/.test(cmd))return '读取文件内容';
  if(/\bGet-ChildItem\b/.test(cmd))return '检查目录与文件';
  return info.title;
}
function payload(row,part='summary',full=false) {
  if(part==='raw')return codeBlock(JSON.stringify(row.entry,null,2),'原始记录 · 保留字段与截断标记',full);
  if(row.kind==='tool')return renderToolContent(infoFor(row),part,full);
  const value=content.get(row.id);
  return truncation(value,'正文')+`<div class="document">${markdown(value.text,{limit:full?0:row.kind==='text'?1700:1800})}</div>`;
}
function waterfallLink(row) {
  const page=Math.floor(data.rows.findIndex(r=>r.id===row.id)/40)+1;
  return `./waterfall.html?from=${sourceView}&${runId?'run='+runId+'&':''}kind=all&mode=sequence&page=${page}&open=${row.id}&tab=${state.tabs.get(row.id)||'summary'}`;
}
function toolDetails(row) {
  const part=state.tabs.get(row.id)||'summary',info=infoFor(row);
  return `<div class="flow-tool-detail" id="detail-${row.id}">
    <div class="exchange-line"><span><i class="exchange-dot"></i>调用 <time>${clock(row.start)}</time></span><i class="exchange-track"></i><span><i class="exchange-dot returned"></i>${info.returned?'返回 <time>'+clock(row.end)+'</time>':'未捕获返回'}</span></div>
    <div class="flow-detail-toolbar"><div class="detail-tabs" role="tablist" aria-label="${sequence(row)} 调用内容">${Object.entries(tabs).map(([key,label])=>`<button id="tab-${row.id}-${key}" role="tab" aria-selected="${key===part}" tabindex="${key===part?0:-1}" aria-controls="body-${row.id}" data-part="${key}" data-id="${row.id}">${label}</button>`).join('')}</div><button data-read="${row.id}">完整阅读 ↗</button></div>
    <div class="flow-preview"><div class="detail-body" id="body-${row.id}" role="tabpanel" aria-labelledby="tab-${row.id}-${part}">${payload(row,part)}</div></div>
    <div class="flow-detail-end"><span>记录跨度 ${duration(row.duration)} · 可能含上报延迟</span><a href="${waterfallLink(row)}">在时间瀑布中定位 ${icon('arrow')}</a></div>
  </div>`;
}
function eventBody(row) {
  const open=state.open.has(row.id),text=content.get(row.id)?.text||'';
  if(row.kind==='tool') {
    const info=infoFor(row),label=info.failed?'需检查':info.warnings.length?'含警告':info.returned?'已返回':'未返回';
    return `<div class="tool-card ${open?'is-open':''}"><button class="tool-trigger" id="trigger-${row.id}" aria-expanded="${open}" aria-controls="detail-${row.id}" data-toggle="${row.id}"><div><div class="tool-heading"><strong>${esc(toolTitle(row))}</strong><code class="tool-type">${esc(row.name)}</code></div><p class="event-meta"><span>调用 #${row.seq}${row.entry.result?' → 返回 #'+row.entry.result.seq:''}</span><span>记录跨度 ${duration(row.duration)}</span></p><p class="event-outcome ${info.warnings.length?'warn':''}">${esc(info.outcome)}</p></div><span class="tool-tail"><span class="return-status ${info.failed?'error':info.warnings.length?'warn':''}">${label}</span>${icon('chevron')}</span></button>${open?toolDetails(row):''}</div>`;
  }
  if(!text.trim())return `<p class="flow-empty-row">空白输出 · ${sequence(row)} <span>原始正文仅含空白字符</span></p><button class="empty-record-source" data-read="${row.id}" data-reader-part="raw">原始记录</button>`;
  if(row.kind==='thinking')return `<button class="thinking-trigger" id="trigger-${row.id}" aria-expanded="${open}" aria-controls="detail-${row.id}" data-toggle="${row.id}"><div><strong>思考记录</strong><span>${sequence(row)}</span>${!open?`<p>${esc(text.slice(0,240))}</p>`:''}</div>${icon('chevron')}</button>${open?`<div class="thinking-body" id="detail-${row.id}">${payload(row)}<div class="thought-actions"><span>快照中的思考输出 · 原文保留</span><button data-read="${row.id}">完整阅读 ↗</button></div></div>`:''}`;
  return `<div class="reply-byline"><strong>${esc(data.run.agentName)}</strong><span>回复 · ${sequence(row)}</span></div><div class="reply-bubble">${payload(row)}<div class="reply-actions"><button data-read="${row.id}">完整阅读 ↗</button><button data-read="${row.id}" data-reader-part="raw">原始记录</button><span>由 ${row.lastSeq-row.seq+1} 条连续输出合并</span></div></div>`;
}
function eventMarkup(row) {
  const node=row.kind==='thinking'?'thinking':row.kind==='text'?'text reply-avatar':'';
  const nodeIcon=row.kind==='text'?'':icon(row.kind==='thinking'?'thinking':['read','write'].includes(row.name)?'read':row.name==='edit'?'edit':'shell');
  return `<article class="flow-event ${row.kind}" id="event-${row.id}" data-record="${row.id}" data-offset="${row.offset}" aria-label="${names[row.kind]} ${sequence(row)}"><div class="flow-time"><time datetime="${new Date(row.start).toISOString()}">${clock(row.start)}</time><small>+${elapsed(row.offset)}</small></div><span class="flow-node ${node}" aria-hidden="true">${nodeIcon}</span><div class="event-main">${eventBody(row)}</div></article>`;
}
function updateURL() {
  const params=new URLSearchParams();if(runId)params.set('run',runId);params.set('from',sourceView);
  if(state.query)params.set('q',state.query);
  if(state.kind!=='all')params.set('kind',state.kind);
  if(state.multi)params.set('multi','1');
  if(state.empty)params.set('empty','1');
  if(state.open.size)params.set('open',[...state.open].map(id=>`${byId(id).seq}:${state.tabs.get(id)||'summary'}`).join(','));
  history.replaceState(null,'',`${location.pathname}${params.size?'?'+params:''}`);
}
function controls() {
  $('#collapse-entries').disabled=!state.open.size;
  $$('[data-case]').forEach(b=>b.classList.toggle('active',state.open.has('record-'+b.dataset.case)));
  const count=rows.filter(row=>!content.get(row.id)?.text?.trim()&&row.kind!=='tool').length;
  $('#flow-count').textContent=`${state.query?'搜索匹配':state.kind!=='all'?'筛选显示':'当前显示'} ${visible.length} 条 · 共 ${rows.length} 条过程记录${!state.empty?' · '+count+' 条空白输出已收起':''}`;
  $('#show-empty').checked=state.empty;$('#keep-open').checked=state.multi;
  $('#flow-kind').value=state.kind;
  $('#flow-search').value=state.query;
  const filtered=!!state.query||state.kind!=='all';
  $('#go-start').textContent=filtered?'首条匹配':'回到开头';
  $('#go-latest').textContent=filtered?'末条匹配 ↓':'回到最新 ↓';
  $('#go-start').disabled=$('#go-latest').disabled=!visible.length;
  updateURL();
}
function timeIndex() {
  if(!Number.isFinite(data.start)||!Number.isFinite(data.end)||!rows.length){$('#time-index').innerHTML='<p class="muted">本次快照未捕获可定位的日志。</p>';return;}
  const minute=60000,interval=Math.max(5*minute,Math.ceil((data.end-data.start)/120/minute)*minute),base=Math.floor(data.start/interval)*interval,end=data.end;
  const groups=[];
  for(let at=base;at<=end;at+=interval){
    const group=visible.filter(row=>row.start>=at&&row.start<at+interval);
    const from=clock(Math.max(at,data.start)).slice(0,5),to=clock(Math.min(at+interval,end)).slice(0,5);
    groups.push(`<button class="time-jump" data-jump="${group[0]?.id||''}" data-from="${at}" data-until="${at+interval}" ${group.length?'':'disabled'} aria-current="false"><i></i><span><b>${from} — ${to}</b><small>${group.length} 条记录</small></span></button>`);
  }
  $('#time-index').innerHTML=groups.join('');updateActiveTime();
}
function updateActiveTime() {
  if(!visible.length)return;
  const top=mobile()?0:$('#flow-scroll').getBoundingClientRect().top;
  const elements=$$('.flow-event');
  const target=elements.find(el=>el.getBoundingClientRect().bottom>top+60)||elements.at(-1);
  const row=byId(target?.dataset.record);if(!row)return;
  $$('.time-jump').forEach(button=>button.setAttribute('aria-current',String(row.start>=Number(button.dataset.from)&&row.start<Number(button.dataset.until))));
}
function scheduleTime(){cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(updateActiveTime);}
function resetScroll(){if(mobile())window.scrollTo({top:0,behavior:'instant'});else $('#flow-scroll').scrollTop=0;}
function jumpTo(id,{focus=false}={}) {
  const el=$('#event-'+id);if(!el)return;
  if(mobile())el.scrollIntoView({block:'start',behavior:'instant'});
  else {const container=$('#flow-scroll');container.scrollTop+=el.getBoundingClientRect().top-container.getBoundingClientRect().top-22;}
  if(focus)$( '[data-toggle], [data-read]',el)?.focus({preventScroll:true});
  updateActiveTime();
}
function renderFlow({reset=false}={}) {
  const q=state.query.trim().toLowerCase();
  const seq=/^#(\d+)$/.exec(q)?.[1];
  visible=rows.filter(row=>(state.kind==='all'||state.kind===row.kind)&&(state.empty||row.kind==='tool'||content.get(row.id).text.trim())&&(!q||(seq?row.kind==='tool'?row.seq===Number(seq)||row.entry.result?.seq===Number(seq):row.seq<=Number(seq)&&row.lastSeq>=Number(seq):searchIndex.get(row.id).includes(q))));
  for(const id of state.open)if(!visible.some(row=>row.id===id))state.open.delete(id);
  $('#flow-content').innerHTML=visible.length?`${!q&&state.kind==='all'?`<div class="task-context"><span>任务上下文 · ${esc(data.run.issue)}</span><strong>${esc(data.run.issueTitle)}</strong><p>来自任务标题 · 以下为本次运行的实际记录</p></div>`:`<p class="flow-search-summary">${q?'搜索结果':'已按类型筛选'} · 按发生顺序显示 ${visible.length} 条记录</p>`}${visible.map(eventMarkup).join('')}<div class="flow-end">${icon('check')}已到当前${q||state.kind!=='all'?'筛选':'快照'}的最后一条 · ${clock(visible.at(-1).end)}</div>`:'<div class="flow-no-results"><strong>没有找到匹配记录</strong><p>可搜索工具名、日志编号、文件名或正文内容。</p><button data-clear>清除筛选</button></div>';
  controls();timeIndex();if(reset)resetScroll();
}
function replaceEvent(id) {const row=byId(id),el=$('#event-'+id+' .event-main');if(row&&el)el.innerHTML=eventBody(row);}
function toggle(id) {
  const anchor=$('#event-'+id),before=anchor.getBoundingClientRect().top;
  const changed=new Set([id]);
  if(state.open.has(id))state.open.delete(id);
  else {if(!state.multi){state.open.forEach(value=>changed.add(value));state.open.clear();}state.open.add(id);}
  changed.forEach(replaceEvent);
  const delta=anchor.getBoundingClientRect().top-before;
  if(mobile())window.scrollBy({top:delta,behavior:'instant'});else $('#flow-scroll').scrollTop+=delta;
  $('#trigger-'+id)?.focus({preventScroll:true});controls();scheduleTime();
}
function collapseAll(){const changed=[...state.open];state.open.clear();changed.forEach(replaceEvent);controls();scheduleTime();}
function chooseCase(seq) {
  clearTimeout(searchTimer);state.query='';state.kind='all';
  if(!state.multi)state.open.clear();
  const row=rows.find(r=>r.seq===Number(seq));if(!row)return;
  state.open.add(row.id);state.tabs.set(row.id,Number(seq)===96?'output':[747,796].includes(Number(seq))?'input':'summary');
  renderFlow();jumpTo(row.id);
}
function setPart(id,part) {
  state.tabs.set(id,part);
  const root=$('#event-'+id),body=$('#body-'+id,root);
  $$('[data-part]',root).forEach(button=>{const active=button.dataset.part===part;button.setAttribute('aria-selected',active);button.tabIndex=active?0:-1;});
  body.setAttribute('aria-labelledby',`tab-${id}-${part}`);body.innerHTML=payload(byId(id),part);
  $('.flow-preview',root).scrollTop=0;
  $('.flow-detail-end a',root).href=waterfallLink(byId(id));
  $('#tab-'+id+'-'+part).focus({preventScroll:true});updateURL();
}
$('#flow-content').onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.toggle)toggle(button.dataset.toggle);
  if(button.dataset.part)setPart(button.dataset.id,button.dataset.part);
  if(button.dataset.read){const row=byId(button.dataset.read);reader.open(row,button.dataset.readerPart||state.tabs.get(row.id)||'summary');}
  if(button.hasAttribute('data-clear')){state.query='';state.kind='all';renderFlow({reset:true});$('#flow-search').focus();}
};
$('#flow-content').onkeydown=e=>{
  const button=e.target.closest('[data-part]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
  e.preventDefault();const keys=Object.keys(tabs),i=keys.indexOf(button.dataset.part);
  setPart(button.dataset.id,keys[e.key==='Home'?0:e.key==='End'?keys.length-1:(i+(e.key==='ArrowLeft'?-1:1)+keys.length)%keys.length]);
};
$('#flow-search').oninput=e=>{state.query=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>renderFlow({reset:true}),130);};
$('#flow-kind').onchange=e=>{clearTimeout(searchTimer);state.kind=e.target.value;renderFlow({reset:true});};
$('#keep-open').onchange=e=>{state.multi=e.target.checked;if(!state.multi&&state.open.size>1){const last=[...state.open].at(-1);const changed=[...state.open];state.open=new Set([last]);changed.forEach(replaceEvent);}controls();};
$('#show-empty').onchange=e=>{state.empty=e.target.checked;renderFlow();};
$('#collapse-entries').onclick=collapseAll;
$$('[data-case]').forEach(button=>button.onclick=()=>chooseCase(button.dataset.case));
$('#go-start').onclick=()=>{if(visible.length){resetScroll();updateActiveTime();}};
$('#go-latest').onclick=()=>{if(visible.length)jumpTo(visible.at(-1).id);};
$('#time-index').onclick=e=>{const button=e.target.closest('[data-jump]');if(button?.dataset.jump)jumpTo(button.dataset.jump);};
$('#flow-scroll').addEventListener('scroll',scheduleTime,{passive:true});
window.addEventListener('scroll',scheduleTime,{passive:true});
window.addEventListener('resize',scheduleTime);
function restore() {
  const p=new URLSearchParams(location.search);state.query=p.get('q')||'';state.kind=['tool','text','thinking'].includes(p.get('kind'))?p.get('kind'):'all';state.multi=p.get('multi')==='1';state.empty=p.get('empty')==='1';state.open.clear();
  for(const item of (p.get('open')||'').split(',').slice(0,190)) {const [seq,part]=item.split(':'),row=rows.find(r=>r.seq===Number(seq));if(!row||row.kind==='text')continue;if(!state.multi)state.open.clear();state.open.add(row.id);state.tabs.set(row.id,Object.hasOwn(tabs,part)?part:'summary');}
}
async function load() {
  $('#process-loading').hidden=false;$('#process-error').hidden=true;$('#process-workspace').hidden=true;
  const controlsToLoad=$$('.process-toolbar button,.process-toolbar input,.process-toolbar select,.flow-options button,.flow-options input');
  controlsToLoad.forEach(control=>control.disabled=true);
  try {
    const response=await fetch(runDataURL);if(!response.ok)throw new Error('Snapshot unavailable');data=await response.json();runContext(data);
    rows=data.rows.filter(row=>row.kind!=='gap');parsed.clear();content.clear();searchIndex.clear();
    for(const row of rows){
      if(row.kind==='tool')parsed.set(row.id,analyzeTool(row.entry));
      else content.set(row.id,unpack(row.entry?.message?.content??row.entry?.message?.output,row.entry?.message?.contentTruncated));
      searchIndex.set(row.id,`${row.name} ${names[row.kind]} ${sequence(row)} ${row.kind==='tool'?toolTitle(row):''} ${JSON.stringify(row.entry)}`.toLowerCase());
    }
    const empty=rows.filter(row=>row.kind!=='tool'&&!content.get(row.id).text.trim()).length;
    $('#capture-count').textContent=`${data.rawCount.toLocaleString('zh-CN')} 条原始日志，合并为 ${rows.length} 条过程记录。`;
    $('#empty-label').textContent=`${empty} 条空白输出默认收起，可在上方开启显示。`;
    $('#record-composition').innerHTML=['thinking','tool','text'].map(kind=>`<div class="composition-line ${kind}"><i></i><span>${names[kind]}</span><strong>${rows.filter(row=>row.kind===kind&&(kind==='tool'||content.get(row.id).text.trim())).length}</strong></div>`).join('');
    restore();reader=createRecordReader({render:payload,infoFor,source:data.source,run:data.run,toast});
    $('#process-loading').hidden=true;$('#process-workspace').hidden=false;controlsToLoad.forEach(control=>control.disabled=false);renderFlow();
    if(state.open.size)jumpTo([...state.open].at(-1));
  }catch(error){$('#process-loading').hidden=true;$('#process-error').hidden=false;$('#flow-count').textContent='尚未加载执行记录';}
}
$('#reload-process').onclick=load;
await load();
