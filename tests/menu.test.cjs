const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const menu = read('cocktails.json').cocktails;
const archive = read('bar/cocktails.json').cocktails;
assert.equal(menu.length, 30);
assert.equal(archive.length, 45);
assert.equal(new Set([...menu, ...archive].map(c => c.id)).size, 75);
assert.equal(menu.filter(c => c.name.includes('하이볼')).length, 1);
assert(!menu.some(c => c.ingredients.some(i => /rye|라이 위스키/i.test(i.item))));
for (const id of ['VOD-008', 'TEQ-010', 'WHI-002', 'WHI-007', 'WHI-009', 'WHI-010']) {
  assert(archive.some(c => c.id === id));
}
assert([...menu, ...archive].every(c => !('image' in c) && c.glassType));

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let filename = path.join(root, decodeURIComponent(url.pathname));
  if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(301, {Location: url.pathname + '/'}); res.end(); return; }
    filename = path.join(filename, 'index.html');
  }
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json'}[path.extname(filename)] || 'text/plain');
  res.end(fs.readFileSync(filename));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true, channel: 'msedge'});
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('https://fonts.**/*', route => route.abort());
    const url = `http://127.0.0.1:${server.address().port}`;
    await page.goto(url);
    await page.waitForFunction(() => document.querySelectorAll('.cocktail-card').length === 8);
    assert.equal(await page.locator('.cat-tab.active').getAttribute('data-cat'), 'featured');
    assert.equal(await page.locator('input, img, a[href*="bar"]').count(), 0);
    await page.locator('.cocktail-card').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#detailModal').getAttribute('aria-hidden'), 'false');
    const backdropFrames = await page.evaluate(async () => {
      const frames = [];
      const start = performance.now();
      while (performance.now() - start < 1600) {
        await new Promise(requestAnimationFrame);
        const style = getComputedStyle(document.getElementById('detailModal'));
        frames.push({time: performance.now() - start, opacity: style.opacity, blur: style.backdropFilter, modal: document.getElementById('detailModal').matches(':modal')});
      }
      return frames;
    });
    assert(backdropFrames.every(frame => frame.modal && frame.blur === 'blur(8px)'));
    assert(backdropFrames.filter(frame => frame.time > 400).every(frame => frame.opacity === '1'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('detailModal').getAttribute('aria-hidden') === 'true');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.id), 'GIN-001');
    await page.locator('.cocktail-card').first().click();
    assert.equal(await page.locator('.info-data-grid').count(), 0);
    assert(!(await page.locator('#modalDetailContent').textContent()).includes('제조 및 가니시'));
    await page.goBack();
    await page.waitForFunction(() => document.getElementById('detailModal').getAttribute('aria-hidden') === 'true');
    assert.equal(page.url(), url + '/');
    assert.equal(await page.locator('.cocktail-card').count(), 8);
    await page.goForward();
    await page.waitForSelector('#detailModal.open');
    await page.click('#btnCloseDetail');
    await page.waitForFunction(() => document.getElementById('detailModal').getAttribute('aria-hidden') === 'true');
    assert.equal(await page.evaluate(() => history.state?.cocktailDetailId ?? null), null);
    await page.click('[data-cat="featured"]');
    assert.equal(await page.locator('.cocktail-card').count(), 8);
    await page.click('[data-cat="whisky"]');
    assert.equal(await page.locator('.cocktail-card').count(), 3);
    await page.click('#btnFilterToggle');
    await page.click('[data-abv="strong"]');
    assert.equal(await page.locator('.cocktail-card').count(), menu.filter(c => c.category === 'whisky' && c.abv > 20).length);
    await page.click('#btnResetFilters');
    assert.equal(await page.locator('.cocktail-card').count(), 3);
    await page.click('[data-cat="all"]');
    await page.click('#btnFilterToggle');
    await page.setViewportSize({width: 390, height: 560});
    await page.locator('[data-id="VOD-002"]').scrollIntoViewIfNeeded();
    const scrollBeforeModal = await page.evaluate(() => window.scrollY);
    assert(scrollBeforeModal > 0);
    await page.locator('[data-id="VOD-002"]').click();
    await page.waitForSelector('#detailModal.open');
    const lockedTop = await page.locator('body').evaluate(el => getComputedStyle(el).top);
    assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).position), 'fixed');
    await page.locator('#modalDetailContent').hover();
    await page.mouse.wheel(0, 1500);
    await page.waitForFunction(() => document.getElementById('modalDetailContent').scrollTop > 0);
    await page.mouse.move(5, 5);
    await page.mouse.wheel(0, 1000);
    assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).top), lockedTop);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.body.classList.contains('modal-scroll-locked'));
    assert.equal(await page.evaluate(() => window.scrollY), scrollBeforeModal);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize({width: 390, height: 844});
    assert.equal(await page.locator('.cocktail-card').count(), 30);
    assert.equal(await page.locator('.glass-guide, #glassLegend').count(), 0);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.click('[data-cat="featured"]');
    assert.equal(await page.locator('.cat-tab.active').getAttribute('data-cat'), 'featured');
    await page.goto(url + '/bar');
    await page.waitForFunction(() => document.querySelectorAll('.cocktail-card').length === 45);
    await page.click('[data-id="WHI-007"]');
    await page.waitForSelector('#detailModal.open .recipe-note', {state: 'visible'});
    assert((await page.locator('#modalDetailContent').innerText()).includes('라이 위스키 사용'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('detailModal').getAttribute('aria-hidden') === 'true');
    await page.goto(url);
    await page.waitForFunction(() => document.querySelectorAll('.cocktail-card').length === 8);
    await page.route('**/cocktails.json?*', route => route.fulfill({status: 503, body: 'Unavailable'}));
    await page.reload();
    await page.waitForSelector('#loadError:not([hidden])');
    await page.click('[data-cat="gin"]');
    assert(await page.locator('#loadError').isVisible());
    assert.equal(await page.locator('.cocktail-card').count(), 0);
    await page.unroute('**/cocktails.json?*');
    await page.click('#btnRetry');
    await page.waitForFunction(() => document.querySelectorAll('.cocktail-card').length === 6);
    const editedData = read('cocktails.json');
    const sample = editedData.cocktails.find(c => c.id === 'GIN-001');
    sample.name = '진 "테스트" <메뉴>';
    sample.description = '<img src=x onerror="window.unexpectedMarkup=true"> & 설명 수정';
    sample.abv = 20.5;
    await page.route('**/cocktails.json?*', route => route.fulfill({json: editedData}));
    await page.reload();
    await page.waitForSelector('[data-id="GIN-001"]');
    assert.equal(await page.locator('[data-id="GIN-001"] .cocktail-name').textContent(), sample.name);
    assert.equal(await page.locator('[data-id="GIN-001"] .cocktail-desc-preview').textContent(), sample.description);
    assert.equal(await page.locator('[data-id="GIN-001"] .abv-strong').textContent(), 'ALC 20.5%');
    await page.click('[data-id="GIN-001"]');
    assert.equal(await page.locator('#modalTitle').textContent(), sample.name);
    assert.equal(await page.locator('#detailModal img').count(), 0);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('detailModal').open);
    await page.unroute('**/cocktails.json?*');
    await page.route('**/cocktails.json?*', route => route.fulfill({json: {cocktails: [sample, sample]}}));
    await page.reload();
    await page.waitForSelector('#loadError:not([hidden])');
    assert.equal(await page.locator('.cocktail-card').count(), 0);
    await page.unroute('**/cocktails.json?*');
    assert.deepEqual(errors, []);
    console.log('PASS: 30 public / 45 archived, no lost IDs, no rye, single highball, SVG-only, mobile layout, filters, keyboard modal, /bar redirect, fetch failure and retry.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
