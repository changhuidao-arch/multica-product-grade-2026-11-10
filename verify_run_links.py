import json
from playwright.sync_api import sync_playwright
from pathlib import Path
errs=[];checked=0
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True);page=b.new_page(viewport={'width':1568,'height':1003});page.on('pageerror',lambda e:errs.append(str(e)))
 for file in Path('public/runs').glob('*.json'):
  d=json.load(open(file,encoding='utf-8'))
  for view in ['process','waterfall']:
   page.goto('http://127.0.0.1:55321/'+view+'.html?run='+file.stem,wait_until='networkidle')
   assert file.stem[-8:] in page.locator('.breadcrumb').inner_text()
   assert not page.locator('#process-error' if view=='process' else '#load-error').is_visible(),file.stem
   checked+=1
 page.goto('http://127.0.0.1:55321/waterfall.html',wait_until='networkidle')
 for _ in range(3):page.locator('#sort-duration').click()
 assert 'sort=' not in page.url
 page.locator('[data-example="244"]').click();assert page.locator('.inline-detail').count()==1
 page.goto('http://127.0.0.1:55321/process.html?open=96:output',wait_until='networkidle');assert page.locator('.document-outline').count()>=3
 assert not errs,errs
 for name in ['tasks','detail','graph','alerts','performance','runtime']:
  page.goto('http://127.0.0.1:55321/new.html#'+name,wait_until='networkidle');page.screenshot(path='public/assets/after-'+name+'-live.png')
 b.close()
print(checked,'run pages checked; sorting and accepted expansions passed; no JS errors')
