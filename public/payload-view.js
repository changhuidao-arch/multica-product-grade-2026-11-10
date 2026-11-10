import { analyzeTool, unpack, readableDocument, replacementDiff, markdown, printable, escapeHTML as esc } from './payload-parser.js';
function duration(ms) {if(ms==null)return '待核实';if(ms===0)return '时间点';if(ms<1000)return `${Math.round(ms)} 毫秒`;if(ms<60000)return `${(ms/1000).toFixed(ms%1000?1:0)} 秒`;const seconds=Math.round(ms/1000);return `${Math.floor(seconds/60)} 分 ${seconds%60} 秒`;}
const lineCount = text => text ? text.replace(/\r\n/g,'\n').replace(/\n$/,'').split('\n').length : 0;
export function codeBlock(text,label='内容',full=false) {
  const lines=printable(text).replace(/\r\n/g,'\n').split('\n');
  const selected=full?lines:lines.slice(0,18);
  const clipped=!full&&(lines.length>18||selected.join('\n').length>3200);
  const value=full?selected.join('\n'):selected.join('\n').slice(0,3200);
  return `<div class="code-slab"><div class="code-caption"><span>${esc(label)}</span><span>${lineCount(text)} 行${clipped?' · 预览前段':''}</span></div><pre>${esc(value)||'（空内容）'}${clipped?'\n…':''}</pre></div>`;
}
export function fact(label,value) {return value!==''&&value!=null?`<div class="fact-line"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`:'';}
export function truncation(info,label) {return info.partial?`<p class="capture-note">${label}在采集时已截断，仅展示保留下来的内容。${info.notice?esc(info.notice)+'。':''}完整阅读也无法恢复缺失部分。</p>`:'';}
function warningMarkup(info,compact=false) {
  if(!info.warnings.length&&!info.errors.length)return '';
  const items=[...info.warnings,...info.errors];
  if(compact)return `<section class="warning-list compact"><h4>需要留意 · ${info.warnings.length} 条警告${info.errors.length?` / ${info.errors.length} 条错误`:''}</h4>${items.map(line=>{
    const pom=/The POM for (\S+) is invalid/.exec(line);
    return `<details class="warning-item warning-compact"><summary>${pom?`<strong>${esc(pom[1])}</strong><span>POM 描述无效，传递依赖可能缺失</span>`:`<strong>${esc(line.replace(/^\s*\[(WARNING|ERROR)\]\s*/,''))}</strong>`}<span class="raw-hint">查看原文 ⌄</span></summary><pre>${esc(line)}</pre></details>`;
  }).join('')}</section>`;
  return `<section class="warning-list"><h4>需要留意 · ${info.warnings.length} 条警告${info.errors.length?` / ${info.errors.length} 条错误`:''}</h4>${items.map(line=>{
    const pom=/The POM for (\S+) is invalid/.exec(line);
    return `<div class="warning-item">${pom?`<strong>${esc(pom[1])}</strong><p>POM 描述无效，相关传递依赖可能无法获取。</p><details><summary>查看原始警告</summary><pre>${esc(line)}</pre></details>`:esc(line.replace(/^\s*\[(WARNING|ERROR)\]\s*/,''))}</div>`;
  }).join('')}</section>`;
}
function dependencies(info,full=false) {
  if(!info.dependencies.length)return '';
  const shown=full?info.dependencies:info.dependencies.slice(0,5);
  return `<h4>返回中识别到的依赖 <span class="muted">${info.dependencies.length} 项，已按坐标去重</span></h4><table class="dependency-table"><thead><tr><th>依赖</th><th>版本</th><th>范围</th></tr></thead><tbody>${shown.map(item=>`<tr><td>${esc(item.name)}<small>${esc(item.group)}</small></td><td><code>${esc(item.version)}</code></td><td>${esc(item.scope)}</td></tr>`).join('')}</tbody></table>${shown.length<info.dependencies.length?'<p class="preview-limit">其余依赖可进入「完整阅读」查看。</p>':''}`;
}
function jsonTree(value,full=false,depth=0) {
  if(value===null)return '<span class="muted">空值（null）</span>';
  if(typeof value!=='object') {
    const text=String(value);
    if(text.length>220)return `<details class="json-long"><summary>${text.length} 字符 · 展开内容</summary><div class="document">${markdown(text,{limit:full?0:1400})}</div></details>`;
    return `<span>${esc(text)}</span>`;
  }
  if(depth>=3)return codeBlock(printable(value),'嵌套数据',full);
  const labels={identifier:'编号',title:'标题',status:'状态',description:'说明',createdAt:'创建时间',updatedAt:'更新时间',created_at:'创建时间',updated_at:'更新时间',assignee_id:'负责人 ID',assignee_type:'负责人类型',creator_id:'创建人 ID',creator_type:'创建人类型',author_id:'作者 ID',author_type:'作者类型',name:'名称',content:'内容',total:'总数',count:'数量',comments:'评论',items:'条目'};
  const priority=['identifier','title','name','status','description','content','items','comments'];
  const entries=Object.entries(value);
  if(!Array.isArray(value))entries.sort(([a],[b])=>(priority.includes(a)?priority.indexOf(a):99)-(priority.includes(b)?priority.indexOf(b):99));
  const shown=entries.slice(0,full?100:16);
  return `<dl class="json-fields">${shown.map(([key,v])=>`<div><dt>${Array.isArray(value)?'第 '+(Number(key)+1)+' 项':esc(labels[key]||key)}</dt><dd>${v&&typeof v==='object'?`<details class="json-nested"><summary>${Array.isArray(v)?'列表':'对象'} · ${Object.keys(v).length} 项</summary>${jsonTree(v,full,depth+1)}</details>`:jsonTree(v,full,depth+1)}</dd></div>`).join('')}</dl>${shown.length<entries.length?'<p class="preview-limit">更多字段保留在原始记录中。</p>':''}`;
}
function inputMarkup(info,full=false) {
  if(!info)return '';
  const f=info.fields;
  let html=truncation(info.input,'调用输入');
  if(info.command) {
    html+=`<dl class="facts">${fact('命令内切换目录',info.effectiveDirectory)}${fact('工具工作目录',f.cwd)}${fact('超时上限',f.timeout!=null?duration(Number(f.timeout)):'')}</dl>`;
    html+=codeBlock(info.command,'实际调用命令 · 只读展示',full);
    const extra=Object.fromEntries(Object.entries(f).filter(([key])=>!['command','cmd','cwd','timeout'].includes(key)));
    if(Object.keys(extra).length)html+=codeBlock(printable(extra),'其他参数',full);
  } else if(info.tool==='edit' && ('oldString' in f || 'newString' in f)) {
    const diff=replacementDiff(f.oldString,f.newString);
    const shown=full?diff:diff.slice(0,18);
    html+=`<dl class="facts">${fact('目标文件',info.path)}${fact('替换方式',f.replaceAll?'替换全部匹配':'替换匹配片段')}</dl><h4>本次替换片段 <span class="muted">删除 ${diff.filter(x=>x.type==='remove').length} 行 · 新增 ${diff.filter(x=>x.type==='add').length} 行</span></h4><div class="diff">${shown.map(line=>`<div class="diff-line ${line.type}"><span>${line.type==='add'?'+':line.type==='remove'?'−':' '}</span><code>${esc(line.text)||' '}</code></div>`).join('')}</div>${shown.length<diff.length?'<p class="preview-limit">下方还有差异，可进入「完整阅读」。</p>':''}`;
  } else if('content' in f || 'text' in f) {
    html+=`<dl class="facts">${fact(info.pathFromResult?'目标文件（来自返回）':'目标文件',info.path)}</dl>`;
    html+=`<div class="document ${full?'':'inline-document'}">${markdown(printable(f.content??f.text),{limit:full?0:2400})}</div>`;
  } else if(Object.keys(f).length) {
    if(Object.values(f).some(value=>value&&typeof value==='object'))return html+jsonTree(f,full);
    const labels={path:'目标路径',file_path:'目标路径',filePath:'目标路径',offset:'起始偏移',limit:'读取上限',id:'标识',query:'查询条件',replaceAll:'替换全部'};
    html+=`<dl class="facts">${Object.entries(f).map(([key,value])=>fact(labels[key]||key,typeof value==='object'?printable(value):value)).join('')}</dl>`;
  } else html+=codeBlock(info.input.text,'调用输入',full);
  return html;
}
function outputMarkup(info,full=false) {
  if(!info.returned)return '<p class="empty-copy">尚未读到匹配返回，暂不能判断结果。</p>';
  let html=truncation(info.output,'返回输出');
  if(info.output.value && typeof info.output.value==='object')return html+`<div class="brief-line"><span class="status-pill">结构化返回</span><span class="muted">保留字段值，按层级阅读</span></div>`+jsonTree(info.output.value,full);
  if(info.documents.length) {
    html+=`<div class="brief-line"><span class="status-pill">${info.documents.length} 份文档</span><strong>${esc(info.outcome)}</strong></div><p class="muted">${info.documents.every(doc=>doc.outlineOnly)?'本次返回的是标题索引；展开查看各文档的章节结构。':'按返回中的文件标记整理。'}</p>`;
    html+=`<div class="document-collection">${info.documents.map((doc,i)=>`<details class="document-outline" ${i===0?'open':''}><summary><span class="outline-file">${esc(doc.name)}</span><span>${doc.headings.length} 个标题</span><span aria-hidden="true">⌄</span></summary>${doc.outlineOnly?`<ul>${doc.headings.slice(0,full?doc.headings.length:4).map(h=>`<li class="outline-level-${Math.min(h.level,3)}">${esc(h.text)}</li>`).join('')}</ul>${!full&&doc.headings.length>4?'<p class="preview-limit">更多章节可进入「完整阅读」。</p>':''}`:`<div class="document">${markdown(doc.text,{limit:full?0:1800})}</div>`}</details>`).join('')}</div>`;
    return html;
  }
  if(info.tool==='shell') {
    html+=`<div class="brief-line"><span class="status-pill ${info.failed?'error':info.warnings.length?'warn':''}">${info.exitCode==null?'已收到返回':`退出码 ${info.exitCode}`}</span><strong>${esc(info.outcome)}</strong></div>`;
    if(info.reportedLines) html+=`<p class="muted">命令报告日志文件共 ${info.reportedLines} 行；本次返回 ${info.capturedLines} 行筛选结果，不能当作完整日志。</p>`;
    html+=warningMarkup(info)+dependencies(info,full);
    if(info.modules.length)html+=`<p class="fine-note">构建模块：${info.modules.map(esc).join(' / ')}</p>`;
    html+=codeBlock(info.text,'捕获的返回正文',full);
  } else if(info.tool==='read' || info.tool==='skill' || /^#{1,3}\s/m.test(info.text)) {
    const doc=readableDocument(info.text);
    html+=`<dl class="facts">${fact('来源文件',info.path)}${fact('读取范围',doc.sourceRange)}</dl><div class="document ${full?'':'inline-document'}">${markdown(doc.text,{limit:full?0:2600})}</div>`;
  } else {
    if(info.tool==='write' && /Created file successfully:/.test(info.text))html+='<div class="brief-line"><span class="status-pill">工具报告文件创建成功</span></div>';
    if(info.tool==='edit') {
      const replaced=/\((\d+) replacement/.exec(info.text),bytes=/edited:\s*(\d+)\s*→\s*(\d+) bytes/.exec(info.text);
      html+=`<dl class="facts">${fact('目标文件',info.path)}${fact('工具报告替换次数',replaced?.[1]??'')}${fact('文件字节变化',bytes?`${bytes[1]} → ${bytes[2]} bytes`:'')}</dl>`;
    }
    html+=codeBlock(info.text,'捕获的返回正文',full);
  }
  return html;
}
function summaryMarkup(info) {
  let html=`<div class="brief-line"><span class="status-pill ${info.failed?'error':info.warnings.length?'warn':''}">${info.failed?'需要检查':info.warnings.length?'返回含警告':info.returned?'已匹配返回':'等待返回'}</span><strong>${esc(info.outcome)}</strong></div>`;
  html+=warningMarkup(info,true);
  if(info.command) {
    const main=info.command.match(/\bmvn\b[^;|]+/)?.[0];
    html+=`<dl class="facts command-summary">${fact('命令摘要',main||info.command.slice(0,200))}</dl>`;
  }
  if(info.path)html+=`<dl class="facts">${fact(info.pathFromResult?'文件（来自返回）':'目标文件',info.path)}</dl>`;
  if(info.input.partial)html+=truncation(info.input,'调用输入');
  if(info.output.partial)html+=truncation(info.output,'返回输出');
  if(info.reportedLines)html+=`<p class="muted">日志文件 ${info.reportedLines} 行 → 命令筛选后返回 ${info.capturedLines} 行。退出码为 0 不代表没有警告。</p>`;
  if(info.tool==='edit' && 'oldString' in info.fields) {
    const diff=replacementDiff(info.fields.oldString,info.fields.newString);
    html+=`<p>本次替换片段：<strong>删除 ${diff.filter(x=>x.type==='remove').length} 行，新增 ${diff.filter(x=>x.type==='add').length} 行</strong>。点击「调用输入」查看差异。</p>`;
  } else if(info.tool==='write') {
    const text=printable(info.fields.content??info.fields.text);
    html+=`<div class="document">${markdown(text,{limit:650})}</div>`;
  } else if(info.tool==='read') {
    const doc=readableDocument(info.text);
    html+=`<p class="muted">${esc(doc.sourceRange)}${info.output.partial?'；快照正文已截断。':''}</p><div class="document">${markdown(doc.text,{limit:550})}</div>`;
  } else if(info.documents.length) {
    html+=`<p class="muted">${info.documents.map(doc=>esc(doc.name)).join(' · ')}。在「返回输出」中按文件查看章节。</p>`;
  } else if(!info.command)html+=codeBlock(info.text,'返回预览');
  return html;
}

export function renderToolContent(info,tab='summary',full=false) { return tab==='input'?inputMarkup(info,full):tab==='output'?outputMarkup(info,full):summaryMarkup(info); }
