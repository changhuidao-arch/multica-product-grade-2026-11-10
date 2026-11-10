from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
out=Path('qa/compact-timeline');out.mkdir(exist_ok=True)
checks=[];errors=[]
def ok(name,value):
 assert value,name
 checks.append(name)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
 page=b.new_page(viewport={'width':1568,'height':1003});page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:55321/new.html#detail?issue=CXTE-4',wait_until='networkidle')
 ok('default compact',page.locator('#timeline-toggle').get_attribute('aria-expanded')=='false')
 ok('nine real runs',page.locator('.time-row').count()==9)
 ok('240px rail',page.locator('.run-timeline').bounding_box()['width']==240)
 width=page.locator('.inspector').bounding_box()['width'];ok('wide reader',width>950)
 row=page.locator('.time-row').first;run=row.get_attribute('data-run');row.click()
 ok('selection does not expand',page.locator('#timeline-toggle').get_attribute('aria-expanded')=='false')
 page.locator('.inspector details.io').nth(1).evaluate('(e)=>e.open=true')
 page.locator('.inspector .preview').evaluate('(e)=>e.scrollTop=40')
 scroll=page.locator('.inspector .preview').evaluate('(e)=>e.scrollTop')
 page.locator('.inspector').evaluate('(e)=>e.dataset.kept="yes"')
 page.locator('#timeline-toggle').click()
 ok('expanded timeline',page.locator('#timeline-toggle').get_attribute('aria-expanded')=='true' and page.locator('.track').first.is_visible())
 ok('reader DOM preserved',page.locator('.inspector').get_attribute('data-kept')=='yes')
 ok('expanded input preserved',page.locator('.inspector details.io').nth(1).get_attribute('open') is not None)
 ok('reader scroll preserved',page.locator('.inspector .preview').evaluate('(e)=>e.scrollTop')==scroll)
 ok('selected run preserved',page.locator('.time-row.selected').get_attribute('data-run')==run)
 page.locator('#run-sort').select_option('longest')
 ok('sort retains selection',page.locator('.time-row.selected').get_attribute('data-run')==run)
 ok('longest sorted first','20 分 44 秒' in page.locator('.time-row').first.inner_text())
 page.screenshot(path=str(out/'expanded.png'),full_page=True)
 page.locator('#timeline-toggle').focus();page.keyboard.press('Enter')
 ok('keyboard collapse',page.locator('#timeline-toggle').get_attribute('aria-expanded')=='false')
 ok('reader gains width',page.locator('.inspector').bounding_box()['width']==width)
 page.screenshot(path=str(out/'compact.png'))
 page.locator('.time-row').nth(2).click();ok('run selection remains compact',page.locator('.detail-grid.timeline-compact').count()==1)
 for w,h in [(1366,768),(900,900),(390,844)]:
  page.set_viewport_size({'width':w,'height':h})
  for expanded in [False,True]:
   if (page.locator('#timeline-toggle').get_attribute('aria-expanded')=='true')!=expanded:page.locator('#timeline-toggle').click()
   ok(f'{w} {expanded} no document overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
   page.screenshot(path=str(out/f'{w}-{expanded}.png'))
 ok('no JS errors',not errors)
 b.close()
(out/'checks.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
print(len(checks),'checks passed')
