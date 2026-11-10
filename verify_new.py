from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
checks=[];errs=[]
def ok(n,v=True):
 assert v,n
 checks.append(n)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='C:/Program Files/Google/Chrome/Application/chrome.exe',headless=True);page=b.new_page(viewport={'width':1568,'height':1003});page.on('pageerror',lambda x:errs.append(str(x)))
 page.goto('http://127.0.0.1:55321/new.html#tasks',wait_until='networkidle');ok('10 real tasks',page.locator('tbody tr').count()==10)
 page.locator('[data-scope=review]').click();ok('4 review tasks',page.locator('tbody tr').count()==4)
 page.locator('[data-scope=all]').click();page.locator('[data-collapse]').click();ok('collapse children',page.locator('tbody tr').count()==3);page.locator('[data-collapse]').click()
 page.locator('#task-query').fill('CXTE-4');ok('task search',page.locator('tbody tr').count()==1)
 page.locator('.task-name a').click();page.wait_for_timeout(150);ok('nine runs',page.locator('.time-row').count()==9)
 page.locator('#run-sort').select_option('longest');ok('sort retains runs',page.locator('.time-row').count()==9)
 page.goto('http://127.0.0.1:55321/new.html#graph',wait_until='networkidle');ok('graph nine nodes',page.locator('.node').count()==9);ok('graph five edges',page.locator('.edge').count()==5);ok('graph three columns',page.locator('.chain').count()==3)
 page.locator('.edge').first.click();ok('edge inspector',page.locator('#reader').is_visible());page.keyboard.press('Escape');page.locator('[data-fit]').click()
 page.locator('#graph-status').select_option('failed');ok('failed nodes',page.locator('.node').count()==4)
 page.goto('http://127.0.0.1:55321/new.html#alerts',wait_until='networkidle');ok('eight history failures','历史失败 8' in page.locator('#main').inner_text());ok('three cause groups',page.locator('.alert-group').count()==3)
 page.goto('http://127.0.0.1:55321/new.html#runtime',wait_until='networkidle');ok('four runtimes',page.locator('tbody tr').count()==4);page.locator('#runtime-query').fill('codex');ok('runtime search',page.locator('tbody tr:visible').count()==1)
 d=json.load(open('public/new-data.json',encoding='utf-8'));r=next(r for i in d['issues'] for r in i['runs'] if r['id'].endswith('e11a970f'))
 for kind in ['process','waterfall']:
  page.goto('http://127.0.0.1:55321/'+kind+'.html?run='+r['id'],wait_until='networkidle');ok(kind+' correct run',r['id'][-8:] in page.locator('.breadcrumb').inner_text());ok(kind+' no data error',not page.locator('#process-error' if kind=='process' else '#load-error').is_visible())
 page.goto('http://127.0.0.1:55321/process.html?open=96:output',wait_until='networkidle');ok('accepted process remains available',not page.locator('#process-workspace').is_hidden())
 for viewport in [{'width':1568,'height':1003},{'width':390,'height':844}]:
  page.set_viewport_size(viewport)
  for name in ['tasks','detail','graph','alerts','performance','runtime']:
   page.goto('http://127.0.0.1:55321/new.html#'+name,wait_until='networkidle');ok(str(viewport['width'])+' '+name+' no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path='qa/new/'+name+('-mobile' if viewport['width']==390 else '')+'.png')
 ok('no JS errors',not errs);b.close()
Path('qa/new/checks.json').write_text(json.dumps({'passed':checks,'errors':errs},ensure_ascii=False,indent=2),encoding='utf-8');print(len(checks),'checks passed')
