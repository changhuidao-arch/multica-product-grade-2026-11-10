from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('qa/shell');out.mkdir(parents=True,exist_ok=True)
errors=[];checks=[]
def ok(label,value=True):
 assert value,label
 checks.append(label)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True);page=b.new_page(viewport={'width':1568,'height':1003});page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:55321/new.html#graph',wait_until='networkidle');run=page.locator('#run-select').input_value();page.locator('#nav').get_by_role('link',name='时间瀑布图',exact=True).click();page.wait_for_load_state('networkidle');ok('Sidebar link retains graph selected run',run in page.url)
 expect(page.locator('#context-run')).to_be_enabled();ok('Same task run picker has nine runs',page.locator('#context-run option').count()==9);ok('Waterfall sidebar visible',page.locator('.run-sidebar').is_visible());ok('Active sidebar entry',page.locator('.run-sidebar [aria-current]').inner_text()=='时间瀑布图')
 page.locator('[data-example="244"]').click();ok('Inline detail still opens',page.locator('.inline-detail').count()==1);page.locator('#sort-duration').click();ok('Sorting keeps details',page.locator('.inline-detail').count()==1)
 page.screenshot(path=str(out/'waterfall.png'))
 page.get_by_role('navigation',name='运行展示方式').get_by_role('link',name='执行过程',exact=True).click();page.wait_for_load_state('networkidle');ok('Run tab preserves run',run in page.url);page.locator('[data-case="96"]').click();ok('Process expansion retained',page.locator('.tool-card.is-open').count()==1);page.screenshot(path=str(out/'process.png'))
 other=page.locator('#context-run option').first.get_attribute('value');page.locator('#context-run').select_option(other);page.wait_for_url('**run='+other);page.wait_for_load_state('networkidle');ok('Run picker changes actual dataset',other[-8:] in page.locator('.breadcrumb').inner_text())
 page.locator('.return-graph').click();page.wait_for_load_state('networkidle');ok('Return graph restores same selection',page.locator('#run-select').input_value()==other)
 page.locator('#nav').get_by_role('link',name='执行过程',exact=True).click();page.wait_for_load_state('networkidle');ok('Side navigation retains latest selection',other in page.url)
 for width,height in [(1366,768),(390,844)]:
  page.set_viewport_size({'width':width,'height':height})
  for view in ['waterfall','process']:
   page.goto('http://127.0.0.1:55321/'+view+'.html?run='+run,wait_until='networkidle');ok(view+str(width)+' no page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));ok(view+str(width)+' menu present',page.locator('.run-sidebar nav').is_visible());page.screenshot(path=str(out/(view+str(width)+'.png')))
 ok('No JavaScript errors',not errors);b.close()
print(len(checks),'checks passed')
