import {runId,runDataURL,runContext,sourceView} from './run-context.js';
import {icon} from './icons.js';
import { analyzeTool, unpack, readableDocument, markdown, printable, escapeHTML as esc } from './payload-parser.js';
import { codeBlock, fact, truncation, renderToolContent } from './payload-view.js';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const names = { thinking:'思考输出',text:'文字输出',tool:'工具',gap:'无日志间隔',other:'其他记录' };
const tabNames = { summary:'解析概览',input:'调用输入',output:'返回输出',raw:'原始记录' };
const state = { order:'trace',kind:'all',mode:'longest',query:'',page:0,selected:null,tabs:new Map(),start:0,span:0 };
let data, searchIndex, parsed, view, readerRow, readerTab='output', toastTimer;
const clock = time => new Date(time).toLocaleTimeString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'});
const axisTime = ms => {const s=Math.round(ms/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
function duration(ms) {if(ms==null)return '待核实';if(ms===0)return '时间点';if(ms<1000)return `${Math.round(ms)} 毫秒`;if(ms<60000)return `${(ms/1000).toFixed(ms%1000?1:0)} 秒`;const seconds=Math.round(ms/1000);return `${Math.floor(seconds/60)} 分 ${seconds%60} 秒`;}
const pair = row => row.seq == null ? '' : `#${row.seq}${row.lastSeq!==row.seq?'–'+row.lastSeq:''}`;
const title = row => row.kind==='tool' ? parsed.get(row.id).title : names[row.kind];
const rowById = id => data.rows.find(row=>row.id===id);
const rawRecord = row => row.entry || {before:row.before,after:row.after,start:row.start,end:row.end,note:row.note};
function toast(text) {clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3000);}
function bodyMarkup(row,tab,full=false) {
  if(tab==='raw')return codeBlock(JSON.stringify(rawRecord(row),null,2),'原始记录 · 保留字段与截断标记',full);
  if(row.kind==='tool') {
    const info=parsed.get(row.id);
    return renderToolContent(info,tab,full);
  }
  if(row.kind==='gap')return `<h3>此区间没有新的日志记录</h3><p class="muted">原因未知，不能推断为模型思考、工具执行或卡住。</p><dl class="facts">${fact('前一记录',row.before?`#${row.before.seq} · ${row.before.type}`:'运行开始')}${fact('后一记录',row.after?`#${row.after.seq} · ${row.after.type}`:'运行结束')}${fact('记录跨度',duration(row.duration))}</dl>`;
  const content=unpack(row.entry?.message?.content??row.entry?.message?.output,row.entry?.message?.contentTruncated);
  return truncation(content,'正文')+`<div class="document ${full?'':'inline-document'}">${markdown(content.text,{limit:full?0:2400})}</div>`;
}
function tabs(row) {return row.kind==='tool'?['summary','input','output','raw']:['summary','raw'];}
function detailMarkup(row) {
  const tab=state.tabs.get(row.id)||'summary';
  return `<section class="inline-detail" id="detail-${row.id}" aria-label="${esc(row.name)} ${pair(row)} 的行内详情"><header class="detail-top"><div><h3>${esc(title(row))}</h3><p>${esc(row.name)} · ${pair(row)}　${clock(row.start)} — ${clock(row.end)}　记录跨度 ${duration(row.duration)}</p></div><div class="detail-top-actions"><button class="primary" data-read="${row.id}">完整阅读 ↗</button><button class="quiet" data-close="${row.id}">收起</button></div></header><div class="detail-tabs" role="tablist" aria-label="片段内容">${tabs(row).map(key=>`<button role="tab" id="tab-${row.id}-${key}" aria-selected="${key===tab}" tabindex="${key===tab?0:-1}" aria-controls="body-${row.id}" data-tab="${key}">${tabNames[key]}</button>`).join('')}</div><div class="detail-body" role="tabpanel" id="body-${row.id}" aria-labelledby="tab-${row.id}-${tab}">${bodyMarkup(row,tab)}</div><footer class="detail-bottom"><span>${esc(row.note)}${row.kind==='tool'?'摘要来自字段解析，原文可核对。':''}</span><button data-read="${row.id}">在完整阅读中查找</button></footer></section>`;
}
function getView() {
  let all=data.rows.filter(row=>state.kind==='all'||row.kind===state.kind);
  const query=state.query.trim().toLowerCase();
  if(query)all=all.filter(row=>searchIndex.get(row.id).includes(query));
  const paginated=state.mode==='sequence'||!!query;
  const chosen=paginated?all:all.filter(row=>row.duration>0).slice().sort((a,b)=>b.duration-a.duration).slice(0,20).sort((a,b)=>a.offset-b.offset);
  if(state.order!=='trace')chosen.sort((a,b)=>state.order==='longest'?(b.duration??-1)-(a.duration??-1):(a.duration??Infinity)-(b.duration??Infinity));
  const pages=Math.max(1,Math.ceil(chosen.length/(paginated?40:20)));
  state.page=Math.min(Math.max(0,state.page),pages-1);
  return { all,chosen,paginated,pages,visible:paginated?chosen.slice(state.page*40,state.page*40+40):chosen };
}
function rowMarkup(row) {
  const left=Math.max(0,((row.offset??0)-state.start)/state.span*100);
  const right=Math.min(100,((row.offset??0)+(row.duration??0)-state.start)/state.span*100);
  const visible=row.offset!=null&&right>=0&&left<=100&&right>=left;
  const isOpen=state.selected===row.id;
  const info=parsed.get(row.id);
  const subtitle=row.kind==='tool'?info.title:row.kind==='gap'?row.summary:'';
  return `<article class="record" data-record="${row.id}"><button class="record-button" id="row-${row.id}" aria-expanded="${isOpen}" aria-controls="detail-${row.id}" data-toggle="${row.id}"><span class="record-label"><span class="chevron" aria-hidden="true">${icon('chevron')}</span><i class="kind-dot ${row.kind}" aria-hidden="true"></i><span class="label-text"><b>${esc(row.name)}${pair(row)?' · '+pair(row):''}</b>${subtitle?`<small>${esc(subtitle)}</small>`:''}</span>${info?.warnings.length?'<i class="row-warning" aria-label="含警告"></i>':''}</span><span class="record-axis"><span class="time-bar k-${row.kind}${!row.duration?' point':''}" style="left:${left}%;width:${Math.max(.2,right-left)}%;${visible?'':'display:none'}"></span></span><span class="duration">${duration(row.duration)}</span></button>${isOpen?detailMarkup(row):''}</article>`;
}
function updateURL() {
  const params=new URLSearchParams({kind:state.kind,mode:state.mode});if(state.order!=='trace')params.set('sort',state.order);if(runId)params.set('run',runId);params.set('from',sourceView);
  if(state.query)params.set('q',state.query);
  if(state.page)params.set('page',state.page+1);
  if(state.selected){params.set('open',state.selected);params.set('tab',state.tabs.get(state.selected)||'summary');}
  history.replaceState(null,'',`${location.pathname}?${params}`);
}
function renderRows({scrollTop=false,focus=null}={}) {
  const container=$('#timeline-scroll'),oldTop=container.scrollTop;
  view=getView();
  if(state.selected&&!view.visible.some(row=>row.id===state.selected))state.selected=null;
  $('#timeline').innerHTML=view.visible.length?view.visible.map(rowMarkup).join(''):'<div class="empty-state"><strong>没有匹配的片段</strong><p>可清空搜索或切换日志类型。</p><button id="clear-search">清空筛选</button></div>';
  $('#visible-count').textContent=view.paginated?`匹配 ${view.all.length} 个片段 · 当前 ${view.visible.length} 条`:`显示较长的 ${view.visible.length} / ${view.all.length} 个片段 · 按发生顺序`;
  $('#batch-count').textContent=`${state.page+1} / ${view.pages}`;
  $('#prev-batch').disabled=state.page===0;$('#next-batch').disabled=state.page===view.pages-1;
  $('#collapse-all').disabled=!state.selected;
  $$('[data-example]').forEach(button=>button.classList.toggle('active',state.selected===`record-${button.dataset.example}`));
  $('#clear-search')?.addEventListener('click',()=>{state.query='';state.kind='all';state.page=0;$('#search').value='';$('#kind').value='all';renderRows({scrollTop:true});});
  $$('[data-toggle]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.toggle,previous=state.selected;
    const anchor=button.getBoundingClientRect().top;
    state.selected=state.selected===id?null:id;renderRows({focus:id});
    const next=$(`#row-${id}`);if(!matchMedia('(max-width:700px)').matches)container.scrollTop+=next.getBoundingClientRect().top-anchor;
    else if(previous&&previous!==id)next.scrollIntoView({block:'nearest',behavior:'instant'});
  }));
  $$('[data-close]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.close;state.selected=null;renderRows({focus:id});}));
  $$('[data-tab]').forEach(button=>button.addEventListener('click',()=>{const row=rowById(state.selected);state.tabs.set(row.id,button.dataset.tab);renderRows();$(`#tab-${row.id}-${button.dataset.tab}`).focus({preventScroll:true});}));
  $$('[data-read]').forEach(button=>button.addEventListener('click',()=>openReader(rowById(button.dataset.read))));
  bindTabKeys($('#timeline'));
  container.scrollTop=scrollTop?0:oldTop;
  if(focus)$(`#row-${focus}`)?.focus({preventScroll:true});
  renderAxis();updateURL();
}
function renderAxis() {
  $('#axis').innerHTML=Array.from({length:5},(_,i)=>`<span style="left:${i*25}%">${axisTime(state.start+state.span*i/4)}</span>`).join('');
  $('#time-range').textContent=`${axisTime(state.start)} — ${axisTime(state.start+state.span)} / ${axisTime(data.total)}`;
  $('#pan-control').hidden=state.span>=data.total;
  $('#pan').max=String(Math.max(0,data.total-state.span));$('#pan').value=String(state.start);
  $('#zoom-out').disabled=state.span>=data.total;$('#zoom-in').disabled=state.span<=3000;
}
function bindTabKeys(root) {
  $$('[role="tablist"]',root).forEach(list=>list.onkeydown=event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const buttons=$$('[role="tab"]',list),index=buttons.indexOf(document.activeElement);if(index<0)return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length;buttons[next].click();buttons[next].focus();
  });
}
function openExample(seq) {
  const row=data.rows.find(row=>row.seq===Number(seq));if(!row)return;
  state.query='';state.kind='all';state.mode='sequence';$('#search').value='';$('#kind').value='all';$('#mode').value='sequence';
  state.page=Math.floor(data.rows.indexOf(row)/40);state.selected=row.id;
  state.tabs.set(row.id,seq==='747'?'input':seq==='796'?'input':seq==='61'?'output':'summary');
  state.start=0;state.span=data.total;renderRows();$(`#row-${row.id}`).scrollIntoView({block:'start',behavior:'instant'});$(`#row-${row.id}`).focus({preventScroll:true});
}
function closeSelected(){const id=state.selected;state.selected=null;renderRows({focus:id});}
function zoom(factor) {
  const center=state.start+state.span/2;state.span=Math.min(data.total,Math.max(3000,state.span*factor));state.start=Math.max(0,Math.min(data.total-state.span,center-state.span/2));renderRows();
}
function readerText() {
  if(readerTab==='raw')return JSON.stringify(rawRecord(readerRow),null,2);
  if(readerRow.kind==='gap')return `${clock(readerRow.start)} — ${clock(readerRow.end)}\n无日志间隔：${duration(readerRow.duration)}\n${readerRow.note}`;
  const info=parsed.get(readerRow.id);
  if(info)return readerTab==='input'?info.command||printable(info.fields.content??info.fields.text??info.input.value):readableDocument(info.text).text;
  return unpack(readerRow.entry?.message?.content??readerRow.entry?.message?.output).text;
}
function openReader(row) {
  readerRow=row;readerTab=state.tabs.get(row.id)||'summary';if(readerTab==='summary')readerTab=row.kind==='tool'?'output':'summary';
  $('#reader-title').textContent=title(row);$('#reader-kicker').textContent=`${row.name} · ${pair(row)} · ${clock(row.start)} — ${clock(row.end)}`;
  $('#reader-search').value='';renderReader();$('#reader').showModal();
}
$('#reader').addEventListener('click',event=>{if(event.target===$('#reader'))$('#reader').close();});
function renderReader() {
  const keys=tabs(readerRow).filter(key=>key!=='summary'||readerRow.kind!=='tool');
  const info=parsed.get(readerRow.id);
  $('#copy-content').textContent=readerTab==='raw'?'复制原始记录':readerTab==='input'?(info?.command?'复制命令':info?.fields.content||info?.fields.text?'复制文档正文':'复制输入参数'):readerRow.kind==='gap'?'复制区间说明':'复制返回正文';
  $('#reader-tabs').innerHTML=keys.map(key=>`<button role="tab" id="reader-tab-${key}" aria-selected="${key===readerTab}" tabindex="${key===readerTab?0:-1}" data-reader-tab="${key}" aria-controls="reader-content">${tabNames[key]}</button>`).join('');
  $('#reader-content').setAttribute('role','tabpanel');$('#reader-content').setAttribute('aria-labelledby',`reader-tab-${readerTab}`);
  $('#reader-content').innerHTML=`<div class="detail-body">${bodyMarkup(readerRow,readerTab,true)}</div>`;
  $$('[data-reader-tab]').forEach(button=>button.addEventListener('click',()=>{readerTab=button.dataset.readerTab;renderReader();$(`#reader-tab-${readerTab}`).focus();}));
  bindTabKeys($('#reader-tabs').parentElement);
  $('#reader-content').scrollTop=0;markMatches();
}
let marks=[],matchIndex=0;
function markMatches() {
  const root=$('#reader-content'),needle=$('#reader-search').value.trim();
  $$('mark',root).forEach(mark=>mark.replaceWith(document.createTextNode(mark.textContent)));root.normalize();
  if(needle){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let node;while(node=walker.nextNode())if(!node.parentElement.closest('button,summary'))nodes.push(node);
    for(const textNode of nodes){
      const text=textNode.data,lower=text.toLowerCase();let cursor=0,index=lower.indexOf(needle.toLowerCase());if(index<0)continue;const fragment=document.createDocumentFragment();
      while(index>=0){fragment.append(document.createTextNode(text.slice(cursor,index)));const mark=document.createElement('mark');mark.textContent=text.slice(index,index+needle.length);fragment.append(mark);cursor=index+needle.length;index=lower.indexOf(needle.toLowerCase(),cursor);}
      fragment.append(document.createTextNode(text.slice(cursor)));textNode.replaceWith(fragment);
    }
  }
  marks=$$('mark',root);matchIndex=0;selectMatch(false);
}
function selectMatch(scroll=true) {
  marks.forEach((mark,i)=>mark.classList.toggle('current',i===matchIndex));
  $('#match-count').textContent=$('#reader-search').value.trim()?marks.length?`${matchIndex+1} / ${marks.length}`:'无匹配':'';
  $('#prev-match').disabled=!marks.length;$('#next-match').disabled=!marks.length;
  if(scroll&&marks[matchIndex]){for(let parent=marks[matchIndex].parentElement;parent&&parent!==$('#reader-content');parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;marks[matchIndex].scrollIntoView({block:'center',behavior:'instant'});}
}
function download() {
  const blob=new Blob([JSON.stringify({source:data.source,run:data.run,record:rawRecord(readerRow)},null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${data.run.id.slice(-8)}-${readerRow.id}-captured.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已下载快照中的原始记录');
}
async function load() {
  $('#load-error').hidden=true;$('#loading').hidden=false;
  try {
    const response=await fetch(runDataURL);if(!response.ok)throw new Error('unavailable');data=await response.json();runContext(data);if(!data.rows?.length){$('#loading').textContent='这次运行的快照没有可展示的日志记录。可返回完整新版查看状态和原始错误。';return;}
    parsed=new Map(data.rows.filter(row=>row.kind==='tool').map(row=>[row.id,analyzeTool(row.entry)]));
    searchIndex=new Map(data.rows.map(row=>[row.id,[row.name,pair(row),row.summary,printable(rawRecord(row))].join('\n').toLowerCase()]));
    state.span=data.total;
    const params=new URLSearchParams(location.search);state.order=['longest','shortest'].includes(params.get('sort'))?params.get('sort'):'trace';state.kind=['all','tool','thinking','text','gap'].includes(params.get('kind'))?params.get('kind'):'all';state.mode=params.get('mode')==='sequence'?'sequence':'longest';state.query=params.get('q')||'';state.page=Math.max(0,(parseInt(params.get('page'))||1)-1);
    const selected=rowById(params.get('open'));if(selected){state.selected=selected.id;state.tabs.set(selected.id,tabs(selected).includes(params.get('tab'))?params.get('tab'):'summary');}
    $('#kind').value=state.kind;$('#mode').value=state.mode;$('#search').value=state.query;syncSort();
    $('#totals').innerHTML=['thinking','text','tool','gap'].map(kind=>`<span class="total"><i class="kind-dot ${kind}"></i>${names[kind]}<strong>${duration(data.totals[kind])}</strong></span>`).join('');
    $('#record-count').textContent=`${data.rawCount.toLocaleString()} 条原始日志 · ${data.rows.length} 个片段`;
    $('#overview').innerHTML=data.rows.filter(row=>row.offset!=null).map(row=>`<span class="k-${row.kind}" style="left:${row.offset/data.total*100}%;width:${Math.max(.15,(row.duration||0)/data.total*100)}%"></span>`).join('');
    $('#loading').hidden=true;$('#workspace').hidden=false;renderRows();
  } catch {$('#loading').hidden=true;$('#load-error').hidden=false;}
}
$('#retry-load').addEventListener('click',load);
$('#search').addEventListener('input',event=>{state.query=event.target.value;state.page=0;state.selected=null;renderRows({scrollTop:true});});
$('#kind').addEventListener('change',event=>{state.kind=event.target.value;state.page=0;state.selected=null;renderRows({scrollTop:true});});
$('#mode').addEventListener('change',event=>{state.mode=event.target.value;state.page=0;state.selected=null;renderRows({scrollTop:true});});
$('#prev-batch').addEventListener('click',()=>{state.page--;state.selected=null;renderRows({scrollTop:true});});
$('#next-batch').addEventListener('click',()=>{state.page++;state.selected=null;renderRows({scrollTop:true});});
$$('[data-example]').forEach(button=>button.addEventListener('click',()=>openExample(button.dataset.example)));
$('#collapse-all').addEventListener('click',closeSelected);
$('#zoom-in').addEventListener('click',()=>zoom(.5));$('#zoom-out').addEventListener('click',()=>zoom(2));$('#zoom-fit').addEventListener('click',()=>{state.start=0;state.span=data.total;renderRows();});
$('#pan').addEventListener('input',event=>{state.start=Number(event.target.value);renderRows();});
$('#close-reader').addEventListener('click',()=>$('#reader').close());
$('#reader-search').addEventListener('input',()=>{markMatches();selectMatch();});
$('#prev-match').addEventListener('click',()=>{matchIndex=(matchIndex-1+marks.length)%marks.length;selectMatch();});
$('#next-match').addEventListener('click',()=>{matchIndex=(matchIndex+1)%marks.length;selectMatch();});
$('#copy-content').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(readerText());toast('已复制当前内容');}catch{toast('复制未完成，可以下载原始记录');}});
$('#download-record').addEventListener('click',download);
load();

$('#sort-duration').onclick=()=>{state.order=state.order==='trace'?'longest':state.order==='longest'?'shortest':'trace';syncSort();state.page=0;renderRows({scrollTop:true});};

function syncSort(){const b=$('#sort-duration');b.dataset.order=state.order;b.textContent='记录跨度 '+({trace:'↕',longest:'↓',shortest:'↑'})[state.order];}
