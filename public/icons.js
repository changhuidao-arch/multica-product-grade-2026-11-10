// 统一的线性图标集：24 网格、1.75 描边、圆角端点。所有页面共用，避免用文字符号充当图标。
const paths = {
  tasks: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
  alerts: '<path d="M6 16.5h12l-1.6-2.6V10a4.4 4.4 0 0 0-8.8 0v3.9L6 16.5Z"/><path d="M10.2 19.5a2 2 0 0 0 3.6 0"/>',
  performance: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M21 20H3"/>',
  runtime: '<rect x="3" y="4" width="18" height="6.5" rx="2"/><rect x="3" y="13.5" width="18" height="6.5" rx="2"/><path d="M7 7.25h.01M7 16.75h.01M11 7.25h6M11 16.75h6"/>',
  settings: '<path d="M9 3v4.5M15 3v4.5"/><path d="M6.5 7.5h11V11a5.5 5.5 0 0 1-11 0V7.5Z"/><path d="M12 16.5V21"/>',
  back: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.3l1.7-1.8"/><path d="M20 20v-4.5h-4.5"/>',
  external: '<path d="M14 5h5v5"/><path d="M19 5 10.5 13.5"/><path d="M18 14v3.5A1.5 1.5 0 0 1 16.5 19h-10A1.5 1.5 0 0 1 5 17.5v-10A1.5 1.5 0 0 1 6.5 6H10"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M12 8v4l2.8 1.8"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.4"/>',
  warning: '<path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  error: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.8v5M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.2M12 7.8h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  play: '<path d="M7.5 5.2v13.6a.6.6 0 0 0 .9.5l11-6.8a.6.6 0 0 0 0-1L8.4 4.7a.6.6 0 0 0-.9.5Z"/>',
  review: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4.2V3.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.7"/><path d="m9 13 2.2 2.2L15.2 11"/>',
  queue: '<path d="M4 6.5h16M4 12h10M4 17.5h7"/><circle cx="18.5" cy="16" r="2.8"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9M12 16.6h.01"/>',
  timeline: '<path d="M4 6h9M8 12h12M4 18h7"/><path d="M17 6h3M4 12h.01M15 18h5"/>',
  graph: '<rect x="9" y="3" width="6" height="5" rx="1.5"/><rect x="3" y="16" width="6" height="5" rx="1.5"/><rect x="15" y="16" width="6" height="5" rx="1.5"/><path d="M12 8v4M6 16v-2.5a1.5 1.5 0 0 1 1.5-1.5h9a1.5 1.5 0 0 1 1.5 1.5V16"/>',
  waterfall: '<path d="M4 4v16h16"/><path d="M8 8h5M11 12h5M14 16h4"/>',
  process: '<path d="M5 5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-5 4V5.5Z"/><path d="M9 8.5h6M9 12h4"/>',
  io: '<path d="M4 8h13"/><path d="m13.5 4.5 3.5 3.5-3.5 3.5"/><path d="M20 16H7"/><path d="M10.500 12.500 7 16l3.500 3.500"/>',
  file: '<path d="M7 3h7l5 5v11.500A1.500 1.500 0 0 1 17.500 21h-10.500A1.500 1.500 0 0 1 5.500 19.500v-15A1.500 1.500 0 0 1 7 3Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  copy: '<rect x="8.5" y="8.5" width="11.500" height="11.500" rx="2"/><path d="M15.500 5.500v-.5a1.500 1.500 0 0 0-1.500-1.500h-9A1.500 1.500 0 0 0 3.500 5v9A1.500 1.500 0 0 0 5 15.500h.5"/>',
  download: '<path d="M12 4v11"/><path d="m7.500 11 4.500 4.500 4.500-4.500"/><path d="M5 19.500h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M4 9V5.500A1.500 1.500 0 0 1 5.500 4H9M15 4h3.500A1.500 1.500 0 0 1 20 5.500V9M20 15v3.500a1.500 1.500 0 0 1-1.500 1.500H15M9 20H5.500A1.500 1.500 0 0 1 4 18.500V15"/>',
  expand: '<path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/>',
  collapse: '<path d="M20 10h-6V4M14 10l6.500-6.500M4 14h6v6M10 14l-6.500 6.500"/>',
  sort: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
  sortDown: '<path d="M12 5v14"/><path d="m6.500 13.500 5.500 5.500 5.500-5.500"/>',
  sortUp: '<path d="M12 19V5"/><path d="m6.500 10.500 5.500-5.500 5.500 5.500"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m6.500 13.500 5.500 5.500 5.500-5.500"/>',
  arrowUp: '<path d="M12 19V5"/><path d="m6.500 10.500 5.500-5.500 5.500 5.500"/>',
  arrowUpRight: '<path d="M7 17 17 7"/><path d="M8.500 7H17v8.500"/>',
  shell: '<rect x="3" y="4.500" width="18" height="15" rx="3"/><path d="m7.500 10 3 2.500-3 2.500M13 15h3.500"/>',
  read: '<path d="M7 3h7l5 5v11.500A1.500 1.500 0 0 1 17.500 21h-10.500A1.500 1.500 0 0 1 5.500 19.500v-15A1.500 1.500 0 0 1 7 3Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  edit: '<path d="M4 20h4.500L20 8.500 15.500 4 4 15.500V20Z"/><path d="m13 6.500 4.500 4.500"/>',
  thinking: '<path d="M9.500 18h5M10.500 21h3"/><path d="M8.500 15c-.2-1.600-2.500-2.800-2.500-6.200a6 6 0 0 1 12 0c0 3.400-2.300 4.600-2.500 6.200h-7Z"/>',
  token: '<circle cx="12" cy="12" r="8.500"/><path d="M8.500 9h7M12 9v7.500"/>',
  cache: '<ellipse cx="12" cy="6.500" rx="7.500" ry="3"/><path d="M4.500 6.500v5.500c0 1.700 3.400 3 7.500 3s7.500-1.300 7.500-3V6.500"/><path d="M4.500 12v5.500c0 1.700 3.400 3 7.500 3s7.500-1.300 7.500-3V12"/>',
  cost: '<circle cx="12" cy="12" r="8.500"/><path d="M14.800 9.200c-.5-.8-1.500-1.200-2.800-1.200-1.700 0-2.800.8-2.800 2s1 1.700 2.800 2 2.800.800 2.800 2-1.100 2-2.800 2c-1.300 0-2.300-.4-2.800-1.200M12 6.500V8M12 16v1.500"/>',
  cpu: '<rect x="6.500" y="6.500" width="11" height="11" rx="2"/><rect x="10" y="10" width="4" height="4" rx=".5"/><path d="M9.500 3.500v3M14.500 3.500v3M9.500 17.500v3M14.500 17.500v3M3.500 9.500h3M3.500 14.500h3M17.500 9.500h3M17.500 14.500h3"/>',
  memory: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 10.500v3M11 10.500v3M15 10.500v3M6 17v2.500M10 17v2.500M14 17v2.500M18 17v2.500"/>',
  users: '<circle cx="9" cy="8.500" r="3.200"/><path d="M3.500 19.500c.4-3 2.600-4.800 5.500-4.800s5.100 1.800 5.500 4.800"/><path d="M15.500 5.600a3.200 3.200 0 0 1 0 5.800M17.500 15.200c1.700.6 2.800 2.100 3 4.300"/>',
  rules: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  scope: '<circle cx="12" cy="12" r="8.500"/><circle cx="12" cy="12" r="3.500"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  eye: '<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12Z"/><circle cx="12" cy="12" r="2.800"/>',
  eyeOff: '<path d="M4 4l16 16"/><path d="M9.900 5.800A9.700 9.700 0 0 1 12 5.500c6 0 9.500 6.500 9.500 6.500a17 17 0 0 1-2.900 3.700M6.300 7.600A16.700 16.700 0 0 0 2.500 12S6 18.500 12 18.500c1.500 0 2.800-.4 4-1"/><path d="M10 10.100a2.800 2.800 0 0 0 3.900 3.900"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>',
  shield: '<path d="M12 3 5 5.800v5.700c0 4.300 2.900 7.600 7 9 4.100-1.400 7-4.700 7-9V5.800L12 3Z"/><path d="m9 12 2.200 2.200L15.200 10"/>',
  inbox: '<path d="M4 13.500 6.500 5.500h11L20 13.500v4A1.500 1.500 0 0 1 18.500 19h-13A1.500 1.500 0 0 1 4 17.500v-4Z"/><path d="M4 13.500h4.500a3.500 3.500 0 0 0 7 0H20"/>',
  database: '<ellipse cx="12" cy="6" rx="7.500" ry="3"/><path d="M4.500 6v12c0 1.700 3.400 3 7.500 3s7.500-1.300 7.500-3V6"/><path d="M4.500 12c0 1.700 3.400 3 7.500 3s7.500-1.300 7.500-3"/>',
  target: '<path d="M4 12h4M16 12h4M12 4v4M12 16v4"/><circle cx="12" cy="12" r="2"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/>',
  bolt: '<path d="M13 3 5 13.500h6L10 21l9-11h-6.500L13 3Z"/>',
  dot: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
};
paths.detail = paths.timeline;
paths.arrow = paths.arrowUpRight;

export function icon(name, cls = '') {
  return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.dot}</svg>`;
}
// 静态 HTML 中的 <span data-icon="search"></span> 由此填充。
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { if (!el.firstChild) el.innerHTML = icon(el.dataset.icon); });
}

// 立体图标贴纸：4×4 雪碧图，按图块中心定位，略微放大以裁掉图块外的透明边。
const tiles = ['folder','review','document','build','owl','terminal','certificate','plan','lock','monitor','analyst','developer','planner','runtime','alert','checklist'];
const tileX = [.1467,.3828,.6188,.8549], tileY = [.1595,.3955,.6252,.8549], tileScale = 5.3;
const tilePercent = centre => ((centre * tileScale - .5) / (tileScale - 1) * 100).toFixed(2) + '%';
export function stickerPosition(name) {
  const n = Math.max(0, tiles.indexOf(name));
  return `${tilePercent(tileX[n % 4])} ${tilePercent(tileY[Math.floor(n / 4)])}`;
}
export const sticker = name => `<i class="sticker" style="background-position:${stickerPosition(name)}" aria-hidden="true"></i>`;
export const agentPortrait = name => /评审|审查/.test(name) ? 'owl' : /分析/.test(name) ? 'analyst' : /项目/.test(name) ? 'planner' : 'developer';
