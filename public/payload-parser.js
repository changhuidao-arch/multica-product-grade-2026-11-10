// Local, deterministic presentation of captured records. Never executes payloads.
export const printable = value => typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value, null, 2);
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function decodeStringPrefix(source, start) {
  let text = '';
  for (let i = start; i < Math.min(source.length, start + 200000); i++) {
    const c = source[i];
    if (c === '"') return { text, partial: false };
    if (c !== '\\') { text += c; continue; }
    const e = source[++i];
    if (e === 'u') {
      const hex = source.slice(i + 1, i + 5);
      if (!/^[a-f\d]{4}$/i.test(hex)) break;
      text += String.fromCharCode(parseInt(hex, 16)); i += 4;
    } else {
      const map = { '"':'"', '\\':'\\', '/':'/', n:'\n', r:'\r', t:'\t', b:'\b', f:'\f' };
      if (!(e in map)) break;
      text += map[e];
    }
  }
  return { text, partial: true };
}
// Recover only verified values in an explicitly truncated top-level object.
// An unfinished nested value is omitted; an unfinished string keeps its known prefix.
export function recoverObjectPrefix(source) {
  if(!/^\s*\{/.test(source))return null;
  let pos=source.indexOf('{')+1;
  const fields=Object.create(null);
  const whitespace=()=>{while(/\s/.test(source[pos]||'x'))pos++;};
  function stringEnd(start) {
    for(let i=start+1;i<source.length;i++){if(source[i]==='\\'){i++;continue;}if(source[i]==='"')return i+1;}
    return -1;
  }
  function valueEnd(start) {
    if(source[start]==='"')return stringEnd(start);
    if(source[start]==='{'||source[start]==='['){
      const stack=[];
      for(let i=start;i<source.length;i++){
        const c=source[i];if(c==='"'){const end=stringEnd(i);if(end<0)return -1;i=end-1;continue;}
        if(c==='{'||c==='[')stack.push(c);
        else if(c==='}'||c===']'){const before=stack.pop();if(before!==(c==='}'?'{':'['))return -1;if(!stack.length)return i+1;}
      }
      return -1;
    }
    const next=source.slice(start).search(/[,}\]]/);
    return next<0?-1:start+next;
  }
  while(pos<source.length){
    whitespace();if(source[pos]!== '"')break;
    const keyEnd=stringEnd(pos);if(keyEnd<0)break;
    let key;try{key=JSON.parse(source.slice(pos,keyEnd));}catch{break;}
    pos=keyEnd;whitespace();if(source[pos++]!==':')break;whitespace();
    const end=valueEnd(pos);
    if(end<0){if(source[pos]==='"')fields[key]=decodeStringPrefix(source,pos+1).text;break;}
    try{fields[key]=JSON.parse(source.slice(pos,end));}catch{break;}
    pos=end;whitespace();if(source[pos++]!==',')break;
  }
  return Object.keys(fields).length?fields:null;
}
export function unpack(value, truncated = false) {
  let current = value, partial = !!truncated, notice = '';
  for (let depth = 0; depth < 8; depth++) {
    if (current && typeof current === 'object' && !Array.isArray(current) && 'preview' in current && Object.keys(current).every(k => ['preview','notice'].includes(k))) {
      notice = current.notice || notice; current = current.preview; partial = true; continue;
    }
    if (typeof current !== 'string') return { value: current, text: printable(current), partial, notice };
    const text = current.trimStart();
    if (/^[\[{"]/.test(text) && text.length <= 2000000) {
      try { const parsed = JSON.parse(text); if (parsed !== current) { current = parsed; continue; } } catch { /* Keep malformed data available verbatim. */ }
      if (partial) {
        const prefix = /^\{\s*"(content|text|output|input)"\s*:\s*"/.exec(text);
        if (prefix) {
          const decoded = decodeStringPrefix(text, prefix[0].length);
          return { value: { [prefix[1]]: decoded.text }, text: decoded.text, partial: true, notice: notice || '仅能恢复已捕获的字符串前缀' };
        }
        const recovered=recoverObjectPrefix(text);
        if(recovered)return {value:recovered,text:printable(recovered),partial:true,notice:notice||'仅恢复已捕获的字段和字符串前缀，后续字段可能缺失'};
      }
    }
    return { value: current, text: current, partial, notice };
  }
  return { value: current, text: printable(current), partial, notice };
}
const linesOf = text => text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
export function documentSections(text) {
  const sections=[];
  for(const line of text.replace(/\r\n/g,'\n').split('\n')) {
    const start=/^#{1,4}\s+FILE:\s*(.+)$/.exec(line);
    if(start){sections.push({name:start[1].trim(),lines:[]});continue;}
    if(sections.length)sections.at(-1).lines.push(line);
  }
  return sections.map(section=>({name:section.name,text:section.lines.join('\n').trim(),outlineOnly:section.lines.filter(line=>line.trim()).every(line=>/^#{1,6}\s+/.test(line)),headings:section.lines.filter(line=>/^#{1,6}\s+/.test(line)).map(line=>{const m=/^(#{1,6})\s+(.+)$/.exec(line);return {level:m[1].length,text:m[2]};})}));
}
export function analyzeTool(entry = {}) {
  const input = unpack(entry.call?.input, entry.call?.inputTruncated);
  const output = unpack(entry.result?.output ?? entry.result?.content, entry.result?.outputTruncated || entry.result?.contentTruncated);
  const fields = input.value && typeof input.value === 'object' && !Array.isArray(input.value) ? input.value : {};
  const text = typeof output.value === 'string' ? output.value : printable(output.value);
  const documents = documentSections(text);
  const tool = entry.call?.tool || entry.result?.tool || '工具';
  const command = printable(fields.command ?? fields.cmd);
  const exitMatch = /^exit=(-?\d+)(?:\s+lines=(\d+))?/m.exec(text);
  const warnings = linesOf(text).filter(line => /^\s*\[WARNING\]/.test(line));
  const errors = linesOf(text).filter(line => /^\s*\[ERROR\]/.test(line));
  const dependencies = [];
  const seen = new Set();
  for (const line of linesOf(text)) {
    const m = /([\w.-]+):([\w.-]+):(jar|pom):([^\s:]+):(compile|runtime|test|provided|system|import)/.exec(line);
    if (!m || seen.has(m[0])) continue;
    seen.add(m[0]); dependencies.push({ group:m[1], name:m[2], type:m[3], version:m[4], scope:m[5] });
  }
  const modules = [...text.matchAll(/\[INFO\]\s+Building\s+(.+?)\s+\[(\d+)\/(\d+)\]/g)].map(m => m[1]);
  const workingDirectory = /(?:^|;)\s*Set-Location\s+(?:"([^"]+)"|'([^']+)'|([^;]+))/i.exec(command);
  const reportedPath = /(?:Created file successfully: |Edited |Read file )([^\r\n]+?)(?:, lines | \(|$)/m.exec(text)?.[1];
  const path = fields.path || fields.file_path || fields.filePath || reportedPath || '';
  const exitCode = exitMatch ? Number(exitMatch[1]) : null;
  const reportedLines = exitMatch?.[2] ? Number(exitMatch[2]) : null;
  const buildSuccess = /\[INFO\]\s+BUILD SUCCESS/.test(text);
  const returned = !!entry.result;
  const failed = entry.result?.isError === true || entry.result?.is_error === true || exitCode !== null && exitCode !== 0;
  let title = tool === 'shell' ? '执行命令' : tool === 'read' ? '读取文档' : tool === 'write' ? '写入文档' : tool === 'edit' ? '替换文件片段' : `${tool} 调用`;
  if (tool === 'shell' && /\bdependency:tree\b/.test(command)) title = '检查 Maven 依赖关系';
  else if (tool === 'shell' && /Select-String/.test(command)) title = '检索文件内容';
  if(documents.length && documents.every(doc=>doc.outlineOnly))title='提取文档标题索引';
  let outcome = !returned ? '尚未读到匹配返回' : failed ? '工具返回需要检查' : buildSuccess ? 'Maven 报告 BUILD SUCCESS' : exitCode === 0 ? '命令退出码为 0' : '已收到工具返回';
  if (warnings.length) outcome += `，含 ${warnings.length} 条警告`;
  if(documents.length && !failed)outcome=`返回 ${documents.length} 份文档${documents.every(doc=>doc.outlineOnly)?'的标题索引':''}`;
  return { tool, input, output, fields, text, command, path, pathFromResult: !fields.path && !fields.file_path && !fields.filePath && !!reportedPath,
    effectiveDirectory: workingDirectory ? (workingDirectory[1] || workingDirectory[2] || workingDirectory[3]).trim() : '',
    exitCode, reportedLines, capturedLines: text ? linesOf(text).length : 0, warnings, errors, dependencies, modules, documents, buildSuccess, returned, failed, title, outcome };
}
export function readableDocument(value) {
  let text = printable(value), sourceRange = '';
  const first = /^Read file (.+?), lines (\d+)-(\d+)\r?\n/.exec(text);
  if (first) { sourceRange = `工具声明读取第 ${first[2]}–${first[3]} 行`; text = text.slice(first[0].length).replace(/^\d+: ?/gm, ''); }
  return { text, sourceRange };
}
export function replacementDiff(oldText, newText) {
  const before = linesOf(printable(oldText)), after = linesOf(printable(newText));
  if (before.length * after.length > 150000) return [...before.map(text => ({type:'remove',text})), ...after.map(text => ({type:'add',text}))];
  const table = Array.from({length:before.length+1}, () => new Uint16Array(after.length+1));
  for(let i=before.length-1;i>=0;i--) for(let j=after.length-1;j>=0;j--) table[i][j]=before[i]===after[j]?1+table[i+1][j+1]:Math.max(table[i+1][j],table[i][j+1]);
  const diff=[];let i=0,j=0;
  while(i<before.length || j<after.length) {
    if(i<before.length && j<after.length && before[i]===after[j]) {diff.push({type:'same',text:before[i++]});j++;}
    else if(i<before.length && (j===after.length || table[i+1][j]>=table[i][j+1])) diff.push({type:'remove',text:before[i++]});
    else diff.push({type:'add',text:after[j++]});
  }
  return diff;
}
const inline = text => escapeHTML(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
export function markdown(text, { limit = 2400 } = {}) {
  const source = limit ? text.slice(0,limit) : text;
  const lines = source.replace(/\r\n/g,'\n').split('\n');
  let html='', fenced=false, inTable=false;
  for(let i=0;i<lines.length;i++) {
    const line=lines[i];
    if(/^```/.test(line)) { if(inTable){html+='</tbody></table></div>';inTable=false;}html+=fenced?'</code></pre>':'<pre class="document-code"><code>';fenced=!fenced;continue; }
    if(fenced) {html+=escapeHTML(line)+'\n';continue;}
    const isTable=/^\s*\|.*\|\s*$/.test(line);
    if(isTable) {
      if(/^\s*\|[\s:|\-]+\|\s*$/.test(line)) continue;
      const cells=line.trim().slice(1,-1).split('|').map(cell=>inline(cell.trim()));
      if(!inTable) {html+='<div class="document-table"><table><tbody>';inTable=true;}
      html+='<tr>'+cells.map(cell=>`<td>${cell}</td>`).join('')+'</tr>';continue;
    }
    if(inTable){html+='</tbody></table></div>';inTable=false;}
    const heading=/^(#{1,6})\s+(.+)/.exec(line);
    if(heading) {const level=Math.min(heading[1].length+1,5);html+=`<h${level}>${inline(heading[2])}</h${level}>`;}
    else if(/^\s*[-*+]\s+/.test(line)) html+=`<p class="document-list">• ${inline(line.replace(/^\s*[-*+]\s+/,''))}</p>`;
    else if(/^>\s?/.test(line)) html+=`<blockquote>${inline(line.replace(/^>\s?/,''))}</blockquote>`;
    else if(line.trim()) html+=`<p>${inline(line)}</p>`;
  }
  if(fenced) html+='</code></pre>';
  if(inTable) html+='</tbody></table></div>';
  if(limit && text.length>limit) html+='<p class="preview-limit">下方还有内容，可进入「完整阅读」。</p>';
  return html || '<p class="empty-copy">记录中没有正文。</p>';
}
