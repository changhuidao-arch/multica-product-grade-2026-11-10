import { printable, unpack, readableDocument } from './payload-parser.js';
export function createRecordReader({render,infoFor,source,run,toast}) {
  const $=s=>document.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const names={summary:'内容',input:'调用输入',output:'返回输出',raw:'原始记录'};
  const clock=time=>new Date(time).toLocaleTimeString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'});
  let row,part,marks=[],matchIndex=0;
  const raw=()=>row.entry;
  function bodyText(){
    if(part==='raw')return JSON.stringify(raw(),null,2);
    const info=infoFor(row);
    if(info)return part==='input'?info.command||printable(info.fields.content??info.fields.text??info.input.value):readableDocument(info.text).text;
    return unpack(row.entry?.message?.content??row.entry?.message?.output).text;
  }
  function selectMatch(scroll=true){
    marks.forEach((m,i)=>m.classList.toggle('current',i===matchIndex));
    $('#match-count').textContent=$('#reader-search').value.trim()?marks.length?`${matchIndex+1} / ${marks.length}`:'无匹配':'';
    $('#prev-match').disabled=!marks.length;$('#next-match').disabled=!marks.length;
    if(scroll&&marks[matchIndex]){for(let p=marks[matchIndex].parentElement;p&&p!==$('#reader-content');p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;marks[matchIndex].scrollIntoView({block:'center',behavior:'instant'});}
  }
  function search(){
    const root=$('#reader-content'),needle=$('#reader-search').value.trim();
    $$('mark',root).forEach(m=>m.replaceWith(document.createTextNode(m.textContent)));root.normalize();
    if(needle){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];let node;while(node=walker.nextNode())if(!node.parentElement.closest('button'))nodes.push(node);
      for(const n of nodes){const text=n.data,lower=text.toLowerCase();let cursor=0,index=lower.indexOf(needle.toLowerCase());if(index<0)continue;const fragment=document.createDocumentFragment();while(index>=0){fragment.append(document.createTextNode(text.slice(cursor,index)));const mark=document.createElement('mark');mark.textContent=text.slice(index,index+needle.length);fragment.append(mark);cursor=index+needle.length;index=lower.indexOf(needle.toLowerCase(),cursor);}fragment.append(document.createTextNode(text.slice(cursor)));n.replaceWith(fragment);}
    }
    marks=$$('mark',root);matchIndex=0;selectMatch(false);
  }
  function update(){
    const info=infoFor(row),parts=row.kind==='tool'?['input','output','raw']:['summary','raw'];
    $('#reader-tabs').innerHTML=parts.map(key=>`<button role="tab" id="reader-tab-${key}" aria-selected="${part===key}" tabindex="${part===key?0:-1}" data-reader-tab="${key}" aria-controls="reader-content">${names[key]}</button>`).join('');
    $('#reader-content').setAttribute('role','tabpanel');$('#reader-content').setAttribute('aria-labelledby',`reader-tab-${part}`);
    $('#reader-content').innerHTML=`<div class="detail-body">${render(row,part,true)}</div>`;
    $('#copy-content').textContent=part==='raw'?'复制原始记录':part==='input'?(info?.command?'复制命令':info?.fields.content?'复制文档正文':'复制输入参数'):'复制正文';
    $$('[data-reader-tab]').forEach(b=>b.onclick=()=>{part=b.dataset.readerTab;update();$(`#reader-tab-${part}`).focus();});
    $('#reader-tabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const buttons=$$('[data-reader-tab]'),i=buttons.indexOf(document.activeElement);if(i<0)return;e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowLeft'?-1:1)+buttons.length)%buttons.length].click();};
    $('#reader-content').scrollTop=0;search();
  }
  $('#close-reader').onclick=()=>$('#reader').close();
  $('#reader-search').oninput=()=>{search();selectMatch();};
  $('#prev-match').onclick=()=>{matchIndex=(matchIndex-1+marks.length)%marks.length;selectMatch();};
  $('#next-match').onclick=()=>{matchIndex=(matchIndex+1)%marks.length;selectMatch();};
  $('#copy-content').onclick=async()=>{try{await navigator.clipboard.writeText(bodyText());toast('已复制当前内容');}catch{toast('复制未完成，可以下载原始记录');}};
  $('#download-record').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({source,run,record:raw()},null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`d1701910-process-${row.seq}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已下载快照中的原始记录');};
  return {open(value,tab='output') {row=value;part=tab==='summary'&&row.kind==='tool'?'output':row.kind!=='tool'&&tab!=='raw'?'summary':tab;$('#reader-title').textContent=infoFor(row)?.title||(row.kind==='thinking'?'思考记录':'智能体回复');$('#reader-kicker').textContent=`${row.name} · #${row.seq}${row.lastSeq!==row.seq?'–'+row.lastSeq:''} · ${clock(row.start)} — ${clock(row.end)}`;$('#reader-search').value='';update();$('#reader').showModal();}};
}
