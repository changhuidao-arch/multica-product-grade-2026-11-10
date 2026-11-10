import { pages, snapshot, coverage } from './data.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const paths = {
  connection:'<path d="M9 3v5m6-5v5M7 8h10v2a5 5 0 0 1-10 0V8m5 7v6"/>',
  tasks: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 3h8v4H8zM8 11h8M8 15h8M8 18h5"/>',
  review: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6m-12 6 3 3 5-6"/>',
  graph: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5H5v5m7-5h7v5"/>',
  waterfall: '<path d="M3 3v18h19M7 6h5m-2 5h6m-2 5h7"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3m6 0h4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M12 1v1"/>',
  chart: '<path d="M3 21h19M5 18V9h4v9m3 0V4h4v14m3 0v-6h3v6"/>',
  server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01M16 6.5h2M16 17.5h2"/>',
  checklist: '<path d="m3 6 2 2 3-4m-5 9 2 2 3-4M12 6h9M12 13h9M3 20h18"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  left: '<path d="m14 6-6 6 6 6"/>', right: '<path d="m10 6 6 6-6 6"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m21 15-6-6L3 21"/>',
  split: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  wipe: '<path d="M12 2v20M7 8l-4 4 4 4m10-8 4 4-4 4"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  edit: '<path d="m14 5 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15z"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.image}</svg>`; }
function fillIcons(root = document) { $$('[data-icon]', root).forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
const storageKey = 'multica-design-review-20261106-v1';
const verdictNames = { pending: '暂未决定', accepted: '认可这个方向', changes: '需要调整' };
let reviews = {};
let storageAvailable = true;
try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
  for (const page of pages) {
    const record = stored?.[page.id];
    if (record && typeof record === 'object') reviews[page.id] = {
      verdict: Object.hasOwn(verdictNames, record.verdict) ? record.verdict : 'pending',
      note: typeof record.note === 'string' ? record.note.slice(0, 4000) : '',
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
    };
  }
} catch { storageAvailable = false; }
const state = { page: pages[0].id, mode: 'split', version: 'after', reveal: 50 };
let lightboxContext = null;
let toastTimer;
const currentPage = () => pages.find(page => page.id === state.page) || pages[0];
const afterSource = page => page.afterSource || 'AI 优化效果稿';
const currentReview = () => reviews[state.page] || { verdict: 'pending', note: '', updatedAt: null };

function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200);
}
function pageHash(id = state.page) { return `#${id}?mode=${state.mode}&version=${state.version}`; }
function updateURL(replace = true) {
  history[replace ? 'replaceState' : 'pushState'](null, '', pageHash());
  $$('.nav-item').forEach(link => { link.href = pageHash(link.dataset.page); });
}
function readURL() {
  const [id, query] = location.hash.slice(1).split('?');
  if (pages.some(page => page.id === id)) state.page = id;
  const params = new URLSearchParams(query || '');
  if (['single', 'split', 'wipe'].includes(params.get('mode'))) state.mode = params.get('mode');
  if (['before', 'after'].includes(params.get('version'))) state.version = params.get('version');
}
function goToPage(id, focusHeading = false) {
  if (!pages.some(page => page.id === id)) return;
  state.page = id;
  updateURL(false);
  renderPage();
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (focusHeading) $('#main').focus({ preventScroll: true });
}
function buildNav() {
  let group = '';
  $('#page-nav').innerHTML = pages.map((page, i) => {
    const heading = group !== page.category ? `<p class="nav-group-label">${page.category}</p>` : '';
    group = page.category;
    return `${heading}<a class="nav-item" data-page="${page.id}" href="${pageHash(page.id)}">${icon(page.icon)}<span>${page.short}</span><span class="nav-number">${String(i + 1).padStart(2, '0')}</span><span class="review-dot" hidden></span></a>`;
  }).join('');
  $$('.nav-item').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goToPage(link.dataset.page);
  }));
}
function updateReviewProgress() {
  const count = pages.filter(page => reviews[page.id] && reviews[page.id].verdict !== 'pending').length;
  $('#review-progress').textContent = `${count} / ${pages.length} 已审阅`;
  $$('.nav-item').forEach(link => {
    const verdict = reviews[link.dataset.page]?.verdict || 'pending';
    const dot = $('.review-dot', link);
    dot.hidden = verdict === 'pending';
    dot.classList.toggle('changes', verdict === 'changes');
    link.title = `${pages.find(p => p.id === link.dataset.page).title} · ${verdictNames[verdict]}`;
  });
}
function renderPage() {
  const page = currentPage();
  const index = pages.indexOf(page);
  document.title = `${page.title} · Multica 设计对照`;
  $('#page-category').textContent = `${page.category} / 暖奶油主题`;
  $('#page-title').textContent = page.title;
  $('#page-intro').textContent = page.intro;
  const interactive = {
    settings: {title:'本地偏好设置与可收起侧栏',description:'支持监控偏好草稿、恢复默认值和返回原页面；不包含服务连接配置。',href:'./settings.html'},
    waterfall: { title: '时间轴行内展开与内容解析', description: '下方已同步新版实际截图。点击同一片段展开 / 收起；长输入、长返回、文件差异均可实际操作。', href: './waterfall.html' },
    process: { title: '对话时间线与结构化阅读', description: '下方已同步新版实际截图。顺着对话阅读思考、调用与回复；多条展开、文档目录、输入输出解析均可实际操作。', href: './process.html?open=96:output' },
  }[page.id] || {title:'新版页面 · 可直接操作',description:'使用昨天的真实快照，进入完整新版页面查看列表、详情与关联记录。',href:'./new.html#'+page.id};
  $('#interactive-entry').hidden = !interactive;
  if (interactive) {
    $('#interactive-entry strong').textContent = interactive.title;
    $('#interactive-entry p').textContent = interactive.description;
    $('#interactive-entry a').href = interactive.href;
  }
  $('#page-position').textContent = `${index + 1} / ${pages.length}`;
  $('#prev-page').disabled = index === 0;
  $('#next-page').disabled = index === pages.length - 1;
  $('#continue-review').innerHTML = index === pages.length - 1 ? `导出全部审阅记录${icon('download')}` : `下一页 · ${pages[index + 1].title}${icon('right')}`;
  $$('.nav-item').forEach(link => {
    if (link.dataset.page === page.id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (matchMedia('(max-width: 650px)').matches) {
    const selected = $('.nav-item[aria-current="page"]');
    $('#page-nav').scrollLeft = Math.max(0, selected.offsetLeft - 30);
  }
  $('#scenario-count').textContent = page.scenario;
  $('#changes').innerHTML = page.changes.map(change => `<article class="change-row"><h3 class="change-name">${escape(change.title)}</h3><div class="change-cell"><small>设计前</small><p>${escape(change.before)}</p></div><div class="change-cell after"><small>优化方向</small><p>${escape(change.after)}</p></div></article>`).join('');
  $('#evidence-section').hidden = !page.evidence.length;
  $('#evidence').innerHTML = page.evidence.map((item, i) => `<article class="evidence-card"><button type="button" data-evidence="${i}" aria-label="放大查看：${escape(item.title)}"><img src="${item.src}" alt="${escape(item.title)}的实测截图" loading="lazy" decoding="async"></button><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p></article>`).join('');
  $$('[data-evidence]').forEach(button => button.addEventListener('click', () => openLightbox('before', page.evidence[Number(button.dataset.evidence)])));
  $$('#evidence img').forEach(img => img.addEventListener('error', () => { img.alt = '图片加载失败，点击打开大图后重试'; }));
  $('#review-note').value = currentReview().note;
  updateVerdictButtons();
  $('#save-status').textContent = storageAvailable ? (currentReview().updatedAt ? '已保存在本机' : '') : '暂存于当前页面，请导出';
  renderViewer();
  updateReviewProgress();
}
function imageFrame(page, version) {
  const before = version === 'before';
  return `<figure class="image-frame"><figcaption class="image-label ${version}"><strong>${before ? '设计前' : '设计后'}</strong><small>${before ? '真实页面截图' : escape(afterSource(page))}</small></figcaption><button type="button" class="image-open" data-enlarge="${version}" aria-label="放大查看${before ? '设计前' : '设计后'}：${escape(page.title)}"><img class="main-image" src="${page[version]}" alt="${escape(page.title)} · ${before ? '原页面真实截图' : escape(afterSource(page))}" decoding="async"><span class="zoom-badge">${icon('expand')}</span></button></figure>`;
}
function bindMainImages() {
  $$('.image-open').forEach(button => {
    const img = $('img', button);
    const loaded = () => { button.classList.add('is-loaded'); button.classList.remove('has-error'); $('.asset-error', button)?.remove(); };
    const failed = () => {
      button.classList.add('has-error');
      if (!$('.asset-error', button)) button.insertAdjacentHTML('beforeend', '<span class="asset-error">图片暂时没加载出来<small>点击这里重新加载</small></span>');
    };
    img.addEventListener('load', loaded);
    img.addEventListener('error', failed);
    if (img.complete) img.naturalWidth ? loaded() : failed();
    button.addEventListener('click', () => {
      if (button.classList.contains('has-error')) {
        button.classList.remove('has-error');
        $('.asset-error', button)?.remove();
        img.src = `${currentPage()[button.dataset.enlarge]}?retry=${Date.now()}`;
      } else openLightbox(button.dataset.enlarge);
    });
  });
}
function renderViewer() {
  const page = currentPage();
  const viewer = $('#viewer');
  viewer.className = `viewer mode-${state.mode}`;
  $$('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
  $$('[data-version]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.version === state.version)));
  $('#version-switch').hidden = state.mode !== 'single';
  $('#viewer-caption').textContent = `设计前：真实页面截图。设计后：${afterSource(page)}。${page.afterNote}`;
  $('#viewer-hint').textContent = state.mode === 'wipe' ? '左右拖动分界线 · ← → 微调' : '点击图片，可放大查看细节';
  if (state.mode === 'wipe') {
    viewer.innerHTML = `<div class="wipe-frame" style="--reveal:${state.reveal}%"><img src="${page.before}" alt="${escape(page.title)}的设计前真实截图"><img class="wipe-after" src="${page.after}" alt="${escape(page.title)} · ${escape(afterSource(page))}"><span class="wipe-label before">设计前 · 真实截图</span><span class="wipe-label after">设计后 · ${escape(afterSource(page))}</span><span class="wipe-divider"><span class="wipe-handle">${icon('wipe')}</span></span><input class="wipe-range" type="range" min="0" max="100" value="${state.reveal}" aria-label="调整设计前后对照分界线" aria-valuetext="设计前 ${state.reveal}%，设计后 ${100-state.reveal}%"></div><div class="wipe-controls"><button type="button" class="quiet-button" data-wipe-open="before">放大设计前</button><span class="sep">/</span><span>分界 <output id="wipe-value">${state.reveal}%</output></span><span class="sep">/</span><button type="button" class="quiet-button" data-wipe-open="after">放大设计后</button></div>`;
    $('.wipe-range').addEventListener('input', event => {
      state.reveal = Number(event.target.value);
      $('.wipe-frame').style.setProperty('--reveal', `${state.reveal}%`);
      $('#wipe-value').textContent = `${state.reveal}%`;
      event.target.setAttribute('aria-valuetext', `设计前 ${state.reveal}%，设计后 ${100-state.reveal}%`);
    });
    $$('[data-wipe-open]').forEach(button => button.addEventListener('click', () => openLightbox(button.dataset.wipeOpen)));
    $$('.wipe-frame img').forEach(img => img.addEventListener('error', () => {
      if (!$('.asset-error', viewer)) $('.wipe-frame').insertAdjacentHTML('beforeend', '<span class="asset-error">图片加载失败<small>请切换到单图模式，点击图片重试。</small></span>');
    }));
  } else {
    viewer.innerHTML = state.mode === 'single' ? imageFrame(page, state.version) : imageFrame(page, 'before') + imageFrame(page, 'after');
    bindMainImages();
  }
}

function updateVerdictButtons() {
  const review = currentReview();
  $$('[data-verdict]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.verdict === review.verdict)));
}
function saveReview(patch) {
  reviews[state.page] = { ...currentReview(), ...patch, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(storageKey, JSON.stringify(reviews));
    storageAvailable = true;
    $('#save-status').textContent = '已保存在本机';
  } catch {
    storageAvailable = false;
    $('#save-status').textContent = '暂存于当前页面，请导出';
  }
  updateVerdictButtons();
  updateReviewProgress();
}
function exportReviews() {
  const report = {
    title: 'Multica 暖奶油主题 · 设计对照审阅',
    exportedAt: new Date().toISOString(), snapshot,
    scope: '设计前为本地真实截图；设计后为本设计对比站的新版交互实拍。旧镜像停止继续改造。',
    pages: pages.map(page => ({ id: page.id, title: page.title, scenario: page.scenario, afterSource: afterSource(page), afterImage: page.after, verdict: reviews[page.id]?.verdict || 'pending', verdictLabel: verdictNames[reviews[page.id]?.verdict || 'pending'], note: reviews[page.id]?.note || '', updatedAt: reviews[page.id]?.updatedAt || null })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {type:'application/json;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `Multica-设计审阅-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('8 个页面的审阅记录已导出');
}

function openLightbox(version, evidence = null) {
  lightboxContext = { page: currentPage(), version, evidence, original: false };
  updateLightbox();
  $('#lightbox').showModal();
}
function updateLightbox() {
  if (!lightboxContext) return;
  const { page, version, evidence, original } = lightboxContext;
  const img = $('#lightbox-image');
  const src = evidence ? evidence.src : page[version];
  $('#lightbox-title').textContent = evidence ? evidence.title : page.title;
  $('#lightbox-source').textContent = evidence ? '实际操作截图 · 设计前' : version === 'before' ? '设计前 · 真实页面截图' : `设计后 · ${afterSource(page)}`;
  $('#lightbox-versions').hidden = !!evidence;
  $$('[data-light-version]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lightVersion === version)));
  $('#lightbox-scroll').classList.toggle('original', original);
  $('#zoom-toggle').textContent = original ? '适应窗口' : '原始尺寸';
  $('#zoom-toggle').setAttribute('aria-pressed', String(original));
  img.alt = `${evidence ? evidence.title : page.title} · ${evidence || version === 'before' ? '实际页面截图' : afterSource(page)}`;
  img.onerror = () => {
    $('#lightbox-scroll').classList.remove('is-loading');
    $('#lightbox-foot').replaceChildren(document.createTextNode('图片加载失败。'));
    const retry = document.createElement('button');
    retry.type = 'button'; retry.className = 'quiet-button'; retry.textContent = '重新加载';
    retry.addEventListener('click', () => { img.src = `${src}?retry=${Date.now()}`; });
    $('#lightbox-foot').append(retry);
  };
  img.onload = () => { $('#lightbox-scroll').classList.remove('is-loading'); $('#lightbox-foot').textContent = `${evidence ? evidence.description + ' · ' : ''}${img.naturalWidth} × ${img.naturalHeight} · ${original ? '可滚动查看完整图片' : '保持原始比例'} · Esc 关闭`; };
  if (img.getAttribute('src') !== src) {
    $('#lightbox-scroll').classList.add('is-loading');
    $('#lightbox-foot').textContent = '正在加载图片…';
    img.src = src;
  }
  else if (img.complete && img.naturalWidth) img.onload();
  $('#download-image').href = src;
  $('#download-image').download = `${page.id}-${evidence ? 'actual-state' : version}.png`;
  $('#lightbox-scroll').scrollTo({left:0,top:0,behavior:'instant'});
}
function openCoverage() { $('#coverage-dialog').showModal(); }

fillIcons();
readURL();
buildNav();
$('#coverage-body').innerHTML = coverage.map(item => `<article class="coverage-row"><div><h3>${escape(item.title)}</h3><span>${item.tag}</span></div><p>${escape(item.detail)}</p></article>`).join('');
const mobileExport = document.createElement('button');
mobileExport.type = 'button';
mobileExport.className = 'mobile-only mobile-export';
mobileExport.innerHTML = `${icon('download')}导出全部审阅记录`;
mobileExport.addEventListener('click', exportReviews);
$('.page-footer').append(mobileExport);
$$('[data-mode]').forEach(button => button.addEventListener('click', () => { state.mode = button.dataset.mode; updateURL(); renderViewer(); }));
$$('[data-version]').forEach(button => button.addEventListener('click', () => { state.version = button.dataset.version; updateURL(); renderViewer(); }));
$$('[data-verdict]').forEach(button => button.addEventListener('click', () => saveReview({verdict:button.dataset.verdict})));
$('#review-note').addEventListener('input', event => saveReview({ note: event.target.value }));
$('#prev-page').addEventListener('click', () => { const index = pages.indexOf(currentPage()); if (index > 0) goToPage(pages[index - 1].id, true); });
$('#next-page').addEventListener('click', () => { const index = pages.indexOf(currentPage()); if (index < pages.length - 1) goToPage(pages[index + 1].id, true); });
$('#continue-review').addEventListener('click', () => { const index = pages.indexOf(currentPage()); if (index < pages.length - 1) goToPage(pages[index + 1].id, true); else exportReviews(); });
$('#enlarge-current').addEventListener('click', () => openLightbox(state.version));
$('#export-review').addEventListener('click', exportReviews);
$('#open-coverage').addEventListener('click', openCoverage);
$('#mobile-coverage').addEventListener('click', openCoverage);
$('#close-coverage').addEventListener('click', () => $('#coverage-dialog').close());
$('#coverage-done').addEventListener('click', () => $('#coverage-dialog').close());
$('#close-lightbox').addEventListener('click', () => $('#lightbox').close());
$('#zoom-toggle').addEventListener('click', () => { lightboxContext.original = !lightboxContext.original; updateLightbox(); });
$$('[data-light-version]').forEach(button => button.addEventListener('click', () => { lightboxContext.version = button.dataset.lightVersion; updateLightbox(); }));
for (const dialog of [$('#lightbox'), $('#coverage-dialog')]) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
window.addEventListener('hashchange', () => { readURL(); renderPage(); window.scrollTo({top:0,behavior:'instant'}); });
window.addEventListener('storage', event => {
  if (event.key === storageKey) toast('另一个标签页更新了审阅记录；刷新可读取最新内容。');
});
renderPage();
