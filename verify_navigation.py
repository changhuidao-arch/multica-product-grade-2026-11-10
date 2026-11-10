from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
out=Path('qa/navigation');out.mkdir(exist_ok=True);checks=[];errors=[]
expected=['任务监控','异常提醒','执行性能','运行时']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True)
 page=b.new_page(viewport={'width':1568,'height':1003});page.on('pageerror',lambda e:errors.append(str(e)))
 for name,url in [('tasks','new.html#tasks'),('detail','new.html#detail'),('graph','new.html#graph'),('alerts','new.html#alerts'),('performance','new.html#performance'),('runtime','new.html#runtime'),('waterfall','waterfall.html?open=244:overview'),('process','process.html?open=96:output')]:
  page.goto('http://127.0.0.1:55321/'+url,wait_until='networkidle')
  side=page.locator('.side' if name not in ['waterfall','process'] else '.run-sidebar')
  assert side.locator('nav a').all_text_contents()==expected,name
  checks.append(name+' four global menus')
  selected=expected[['tasks','alerts','performance','runtime'].index(name)] if name in ['tasks','alerts','performance','runtime'] else '任务监控'
  assert side.locator('nav a[aria-current]').inner_text()==selected
  checks.append(name+' correct parent active')
  assert side.locator('.connection-link').get_attribute('href').startswith('./settings.html?return=')
  page.screenshot(path=f'public/assets/after-{name}-navigation-v4.png')
 for width in [1366,390]:
  page.set_viewport_size({'width':width,'height':844})
  for name,url in [('detail','new.html#detail?issue=CXTE-3'),('process','process.html')]:
   page.goto('http://127.0.0.1:55321/'+url,wait_until='networkidle')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   checks.append(f'{width} {name} no overflow')
   page.screenshot(path=str(out/f'{name}-{width}.png'))
 assert not errors,errors
 checks.append('no script errors');b.close()
(out/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
print(len(checks),'checks passed')
