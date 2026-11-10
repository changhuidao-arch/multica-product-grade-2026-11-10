import {icon} from './icons.js';
export const navIcon = key => icon(key, 'nav-icon');

export function rememberRun(issue,run,view='detail'){sessionStorage.setItem('multica-run-context',JSON.stringify({issue,run,view}));}
export function currentContext(){try{return JSON.parse(sessionStorage.getItem('multica-run-context'))||{};}catch{return {};}}
export function navigation(page){
 const current=['detail','graph','waterfall','process'].includes(page)?'tasks':page;
 const entries=[['tasks','任务监控'],['alerts','异常提醒'],['performance','执行性能'],['runtime','运行时']];
 return entries.map(([key,label])=>`<a href="./new.html#${key}" title="${label}" aria-label="${label}" ${key===current?'aria-current="page"':''}>${navIcon(key)}<span>${label}</span></a>`).join('');
}
export function sidebarFooter(){const onSettings=location.pathname.endsWith('/settings.html');const back=location.pathname.split('/').pop()+location.search+location.hash;return `<div class="sidebar-footer"><a class="connection-link" href="./settings.html?return=${encodeURIComponent(back)}" ${onSettings?'aria-current="page"':''} title="偏好设置" aria-label="偏好设置">${navIcon('settings')}<span>偏好设置</span></a><a class="back" href="./" title="返回设计对比" aria-label="返回设计对比">${navIcon('back')}<span>返回设计对比</span></a></div>`;}
export function sidebar(page,context){return `<a class="brand" href="./new.html#tasks"><img src="./mark.svg" alt=""><span>Multica<small>任务观测台</small></span></a><div class="workspace-label" title="当前工作区"><i class="ws-avatar" id="workspace-avatar" aria-hidden="true">CX</i><span><small>当前工作区</small><strong id="run-workspace-name">cx_test_new</strong></span></div><nav id="nav" aria-label="工作区导航">${navigation(page,context)}</nav>${sidebarFooter()}`;}
export function setWorkspaceName(name){
 const label=document.querySelector('#run-workspace-name'),avatar=document.querySelector('#workspace-avatar');
 if(label)label.textContent=name;
 if(avatar)avatar.textContent=String(name||'').replace(/[^a-zA-Z0-9一-龥]/g,'').slice(0,2).toUpperCase()||'W';
}
