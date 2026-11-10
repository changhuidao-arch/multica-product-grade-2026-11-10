from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
QA = ROOT / 'qa'
QA.mkdir(exist_ok=True)
URL = 'http://127.0.0.1:55321/'
IDS = ['tasks', 'detail', 'graph', 'waterfall', 'process', 'alerts', 'performance', 'runtime']
checks = []
errors = []

def record(name, value=True):
    assert value, name
    checks.append(name)

def images_ready(page):
    page.wait_for_function("""() => {
      const imgs = [...document.querySelectorAll('#viewer img')];
      return imgs.length > 0 && imgs.every(img => img.complete && img.naturalWidth > 0);
    }""")

def no_overflow(page, label):
    size = page.evaluate('({viewport: innerWidth, document: document.documentElement.scrollWidth})')
    record(label, size['document'] <= size['viewport'] + 1)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe', headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1000}, device_scale_factor=1)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='networkidle')
    images_ready(page)
    record('Eight page navigation entries', page.locator('.nav-item').count() == 8)
    record('Initial previous page is disabled', page.locator('#prev-page').is_disabled())
    page.screenshot(path=str(QA / 'desktop-tasks.png'))

    for name in IDS:
        page.locator(f'[data-page="{name}"]').click()
        if name in ['waterfall','process']:
            record(f'{name}: interactive link targets matching page',f'{name}.html' in page.locator('#interactive-entry a').get_attribute('href'))
        for mode in ['split','single','wipe']:
            page.locator(f'[data-mode="{mode}"]').click()
            if name=='process' and mode=='single':
                page.locator('[data-version="after"]').click()
            images_ready(page)
            if name=='process':
                record(f'{name}/{mode}: latest actual screenshot replaces old mockup',page.locator('#viewer img[src*="after-process-dialogue-v3.png"]').count()>0)
                record(f'{name}/{mode}: actual implementation is labeled accurately','新版交互实拍' in page.locator('#viewer').inner_text())
            no_overflow(page, f'Desktop {name}/{mode}: no document overflow')
            record(f'{name}/{mode}: route matches', f'#{name}?mode={mode}' in page.url)
        page.locator('.wipe-range').focus()
        original = int(page.locator('.wipe-range').input_value())
        page.keyboard.press('ArrowRight')
        record(f'{name}: keyboard comparison slider', int(page.locator('.wipe-range').input_value()) == original + 1)
        page.locator('[data-mode="split"]').click()
        images_ready(page)
        page.screenshot(path=str(QA / f'desktop-{name}.png'))
    record('Last page next is disabled', page.locator('#next-page').is_disabled())

    page.locator('[data-page="process"]').click()
    page.locator('[data-enlarge="after"]').click()
    page.wait_for_function('document.querySelector("#lightbox-image").naturalWidth > 0')
    record('Process lightbox also displays latest actual screenshot','after-process-dialogue-v3.png' in page.locator('#lightbox-image').get_attribute('src'))
    page.keyboard.press('Escape')

    page.locator('[data-page="graph"]').click()
    page.locator('[data-mode="single"]').click()
    page.locator('[data-version="after"]').click()
    images_ready(page)
    page.locator('[data-enlarge="after"]').click()
    page.wait_for_function('document.querySelector("#lightbox-image").naturalWidth > 0')
    record('Large image dialog opens', page.locator('#lightbox').evaluate('(d)=>d.open'))
    page.locator('[data-light-version="before"]').click()
    record('Large image switches to before', 'before-graph' in page.locator('#lightbox-image').get_attribute('src'))
    page.locator('#zoom-toggle').click()
    record('Original image zoom available', 'original' in page.locator('#lightbox-scroll').get_attribute('class'))
    page.locator('#zoom-toggle').click()
    page.locator('[data-light-version="after"]').click()
    page.wait_for_function('() => !document.querySelector("#lightbox-scroll").classList.contains("is-loading")')
    page.wait_for_timeout(180)
    page.screenshot(path=str(QA / 'desktop-graph-lightbox.png'))
    page.keyboard.press('Escape')
    record('Escape closes large image', not page.locator('#lightbox').evaluate('(d)=>d.open'))
    record('Dialog restores focus to image', page.evaluate('document.activeElement.dataset.enlarge') == 'after')
    page.locator('[data-evidence="2"]').click()
    record('Evidence has no misleading after toggle', page.locator('#lightbox-versions').is_hidden())
    page.keyboard.press('Escape')

    page.locator('[data-verdict="changes"]').click()
    page.locator('#review-note').fill('核验用意见：保留节点关系，调整侧栏宽度。')
    page.reload(wait_until='networkidle')
    record('Notes persist after reload', page.locator('#review-note').input_value() == '核验用意见：保留节点关系，调整侧栏宽度。')
    record('Verdict persists after reload', page.locator('[data-verdict="changes"]').get_attribute('aria-pressed') == 'true')
    record('Review progress updates', page.locator('#review-progress').inner_text() == '1 / 8 已审阅')
    page.locator('[data-page="tasks"]').click()
    record('Notes are page scoped', page.locator('#review-note').input_value() == '')
    page.go_back()
    record('Browser back restores page', page.locator('#page-title').inner_text() == '调用流图')
    with page.expect_download() as download_info:
        page.locator('#export-review').click()
    download_info.value.save_as(str(QA / 'review-export.json'))
    exported = json.loads((QA / 'review-export.json').read_text(encoding='utf-8'))
    record('Export contains all eight pages', len(exported['pages']) == 8)
    record('Export preserves Chinese notes and true provenance', exported['pages'][2]['note'].startswith('核验用意见') and exported['snapshot']['demo'] is False)
    page.locator('#open-coverage').click()
    record('Coverage dialog contains six verified areas', page.locator('.coverage-row').count() == 6)
    page.screenshot(path=str(QA / 'desktop-coverage.png'))
    page.locator('#coverage-done').click()

    mobile = context.new_page()
    mobile.set_viewport_size({'width':390, 'height':844})
    mobile.on('pageerror', lambda error: errors.append(str(error)))
    mobile.goto(URL, wait_until='networkidle')
    for name in IDS:
        mobile.locator(f'[data-page="{name}"]').click()
        for mode in ['split','single','wipe']:
            mobile.locator(f'[data-mode="{mode}"]').click()
            images_ready(mobile)
            no_overflow(mobile, f'Mobile {name}/{mode}: no document overflow')
        mobile.locator('[data-mode="split"]').click()
        images_ready(mobile)
        mobile.screenshot(path=str(QA / f'mobile-{name}.png'))
    mobile.locator('[data-page="waterfall"]').click()
    mobile.locator('[data-mode="single"]').click()
    mobile.locator('[data-enlarge="after"]').click()
    mobile.wait_for_function('() => !document.querySelector("#lightbox-scroll").classList.contains("is-loading")')
    mobile.screenshot(path=str(QA / 'mobile-lightbox.png'))
    no_overflow(mobile, 'Mobile lightbox: no document overflow')
    mobile.locator('#zoom-toggle').click()
    record('Mobile original-size image can pan', mobile.locator('#lightbox-scroll').evaluate('(el)=>el.scrollWidth > el.clientWidth'))
    mobile.locator('#close-lightbox').click()
    mobile.locator('#mobile-coverage').click()
    no_overflow(mobile, 'Mobile coverage: no document overflow')
    mobile.locator('#close-coverage').click()
    mobile.locator('.mobile-export').scroll_into_view_if_needed()
    record('Mobile export is reachable', mobile.locator('.mobile-export').is_visible())

    laptop = context.new_page()
    laptop.set_viewport_size({'width':1366,'height':768})
    laptop.goto(URL + '#graph?mode=single&version=after', wait_until='networkidle')
    images_ready(laptop)
    record('Desktop-only layout hides mobile coverage shortcut', laptop.locator('#mobile-coverage').is_hidden())
    laptop.locator('#export-review').scroll_into_view_if_needed()
    record('Sidebar actions remain reachable at laptop height', laptop.locator('#export-review').bounding_box()['y'] < 730)
    laptop.locator('.sidebar').evaluate('(el)=>el.scrollTop=0')
    no_overflow(laptop, 'Laptop 1366x768: no document overflow')
    laptop.screenshot(path=str(QA / 'laptop-graph.png'))

    for asset in (ROOT / 'public' / 'assets').glob('*.png'):
        response = context.request.get(URL + 'assets/' + asset.name)
        record('Asset served: ' + asset.name, response.status == 200 and response.headers['content-type'] == 'image/png')

    recovery = context.new_page()
    recovery.route('**/after-tasks.png', lambda route: route.abort(), times=1)
    recovery.goto(URL + '#tasks?mode=single&version=after')
    recovery.locator('.image-open.has-error').wait_for()
    recovery.locator('.image-open.has-error').click()
    images_ready(recovery)
    record('Image network failure has working retry', recovery.locator('.image-open.is-loaded').count() == 1)

    restricted = browser.new_context(viewport={'width':390,'height':844})
    restricted.add_init_script("Storage.prototype.setItem = function() { throw new DOMException('Test storage unavailable', 'QuotaExceededError'); }")
    limited = restricted.new_page()
    limited.goto(URL)
    limited.locator('#review-note').fill('离线存储失败时，保留在内存里。')
    record('Storage failure is explained accurately', '请导出' in limited.locator('#save-status').inner_text())
    with limited.expect_download() as limited_download:
        limited.locator('.mobile-export').click()
    record('Export works even when localStorage is unavailable', limited_download.value.failure() is None)

    record('No application JavaScript errors', not errors)
    (QA / 'verification.json').write_text(json.dumps({'url':URL,'passed':len(checks),'checks':checks,'errors':errors}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'passed':len(checks),'errors':errors,'screenshots':str(QA)},ensure_ascii=False))
    browser.close()
