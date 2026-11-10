import {sidebar} from './workspace-nav.js';
import {initWorkspaceShell} from './workspace-shell.js';
import {escapeHTML as e} from './payload-parser.js';

const $=s=>document.querySelector(s),main=$('#settings-main'),draftKey='multica-connection-draft-v1';
$('.side').innerHTML=sidebar('settings');initWorkspaceShell();
try{document.body.dataset.theme=localStorage.getItem('new-theme')||'cream';}catch{}

const returnValue=new URLSearchParams(location.search).get('return')||'new.html#tasks';
let returnURL='./new.html#tasks';
try{const url=new URL(returnValue,location.href);if(url.origin===location.origin&&/\/(new|waterfall|process)\.html$/.test(url.pathname))returnURL=url.pathname+url.search+url.hash;}catch{}

let dirty=false,snapshot,storedAt='';
const thresholdNames=[['noProgressMinutes','无进展'],['toolMinutes','工具等待'],['queueMinutes','排队'],['runMinutes','运行总耗时']];
const keys=['monitorEnabled','aiDiagnosis',...thresholdNames.map(x=>x[0])];
function status(text,error=false){$('#settings-status').textContent=text;$('#settings-status').dataset.error=String(error);}
function confirmAction(title,description,accept){const dialog=$('#settings-confirm'),focus=document.activeElement;$('#confirm-title').textContent=title;$('#confirm-description').textContent=description;$('#confirm-accept').textContent=accept;dialog.returnValue='';dialog.showModal();$('#confirm-cancel').focus();return new Promise(resolve=>{dialog.addEventListener('close',()=>{focus?.focus();resolve(dialog.returnValue==='accept');},{once:true});});}
$('#confirm-cancel').onclick=()=>$('#settings-confirm').close('cancel');$('#confirm-accept').onclick=()=>$('#settings-confirm').close('accept');
function readDraft(){try{const saved=JSON.parse(localStorage.getItem(draftKey));if(saved?.values&&keys.every(k=>k in saved.values))return saved;}catch{}return null;}
function populate(values){const form=$('#connection-form');for(const key of keys){const el=form.elements[key];if(el.type==='checkbox')el.checked=Boolean(values[key]);else el.value=values[key]??'';}sync();dirty=false;}
function sync(){const form=$('#connection-form');form.elements.aiDiagnosis.disabled=!form.elements.monitorEnabled.checked;$('#draft-state').textContent=dirty?'有未保存改动':storedAt?'已保存本地草稿':'静态预览默认值';}

async function load(){try{
 const response=await fetch('./new-data.json');if(!response.ok)throw new Error();const data=await response.json();
 snapshot={monitorEnabled:false,aiDiagnosis:false,noProgressMinutes:10,toolMinutes:5,queueMinutes:5,runMinutes:30,...data.rules};
 const draft=readDraft();storedAt=draft?.savedAt||'';
 main.innerHTML=`<div class="settings-heading"><div><h2>本地监控偏好</h2><p>静态快照预览；不配置服务连接</p></div><a class="button settings-return" href="${e(returnURL)}">← 返回原页面</a></div>
 <div class="settings-notice">此页面只保存当前浏览器中的界面偏好，不连接任何服务器，不会启动监控或调用 AI。</div>
 <div class="settings-layout"><form id="connection-form" class="panel settings-form"><h3>监控显示选项</h3>
 <section class="settings-section"><label class="settings-check"><input name="monitorEnabled" type="checkbox">持续监控</label><label class="settings-check"><input name="aiDiagnosis" type="checkbox">异常发生时自动 AI 诊断</label><p class="settings-help">这些选项仅作为本机草稿保存，静态预览不会执行监控或 AI 诊断。</p></section>
 <details class="settings-section thresholds" open><summary>异常阈值 · 分钟</summary><div class="threshold-grid">${thresholdNames.map(([key,label])=>`<label>${label}<input name="${key}" type="number" min="1" max="1440" step="1" required></label>`).join('')}</div></details>
 <div class="settings-actions"><button type="submit" class="settings-primary">保存本地草稿</button><button type="button" id="restore-snapshot">恢复默认值</button></div><p id="settings-status" role="status" aria-live="polite"></p></form>
 <aside class="panel settings-summary"><h3>当前数据来源</h3><span class="summary-state">本地静态回放</span><dl><div><dt>工作区</dt><dd>${e(data.workspace)}</dd></div><div><dt>快照采集时间</dt><dd>2026-11-05 08:33</dd></div><div><dt>数据范围</dt><dd>10 个任务 · 22 次运行</dd></div><div><dt>配置状态</dt><dd id="draft-state"></dd></div></dl><p>偏好仅保存在此浏览器；任务页面仍使用静态快照。</p></aside></div>`;
 populate(draft?.values||snapshot);
 const form=$('#connection-form');form.addEventListener('input',()=>{dirty=true;sync();});form.addEventListener('change',()=>{dirty=true;sync();});
 form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;const values={};for(const key of keys){const el=form.elements[key];values[key]=el.type==='checkbox'?el.checked:Number(el.value);}if(!values.monitorEnabled)values.aiDiagnosis=false;
  try{storedAt=new Date().toISOString();localStorage.setItem(draftKey,JSON.stringify({values,savedAt:storedAt}));populate(values);status('本地草稿已保存。静态预览没有发起服务连接。');}catch{storedAt='';status('保存失败：浏览器存储不可用，改动仍保留在表单中。',true);}};
 $('#restore-snapshot').onclick=async()=>{if(!await confirmAction('恢复默认值？','将移除当前浏览器中的偏好草稿，并恢复静态预览的默认值。','恢复默认值'))return;try{localStorage.removeItem(draftKey);storedAt='';populate(snapshot);status('已恢复静态预览默认值。');}catch{status('无法移除本地草稿，请检查浏览器存储。',true);}};
 }catch{main.innerHTML='<section class="panel"><h2>静态快照读取失败</h2><p>请确认静态站点文件已完整部署。</p><button id="retry-settings">重新读取</button></section>';$('#retry-settings').onclick=load;}}

let navigating=false;
document.addEventListener('click',async event=>{const anchor=event.target.closest('a');if(!anchor||anchor.target==='_blank'||event.ctrlKey||event.metaKey)return;if(anchor.classList.contains('connection-link')){event.preventDefault();return;}if(!dirty)return;event.preventDefault();if(navigating)return;navigating=true;const leave=await confirmAction('尚有未保存的改动','离开将丢弃当前表单改动；已经保存的本地草稿不受影响。','放弃改动并离开');navigating=false;if(leave){dirty=false;location.href=anchor.href;}});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
load();
