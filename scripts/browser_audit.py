"""Optional: pip install playwright, then python -m playwright install chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright

output = Path('.artifacts')
output.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8000/', wait_until='networkidle')
    page.screenshot(path=str(output / 'desktop.png'))
    page.get_by_role('link', name='Step into our story').click()
    page.wait_for_timeout(1800)
    assert page.url.endswith('#beginning')
    assert page.locator('#title-beginning').evaluate('(el) => getComputedStyle(el).opacity') == '1'
    page.get_by_role('button', name='Pause atmospheric motion').click()
    assert page.locator('body').evaluate("el => el.classList.contains('motion-paused')")
    for width in [320, 390, 768, 1440]:
        page.set_viewport_size({'width': width, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto('http://127.0.0.1:8000/')
    page.screenshot(path=str(output / 'mobile.png'), full_page=True)
    page.emulate_media(reduced_motion='reduce')
    assert page.locator('.universe').evaluate('(el) => getComputedStyle(el).animationName') == 'none'
    assert page.locator('#title-always').evaluate('(el) => getComputedStyle(el).opacity') == '1'
    context = browser.new_context(java_script_enabled=False)
    plain = context.new_page()
    plain.goto('http://127.0.0.1:8000/')
    assert plain.locator('#title-always').is_visible()
    assert plain.locator('#title-always').evaluate('(el) => getComputedStyle(el).opacity') == '1'
    assert not errors, errors
    browser.close()
print('Browser audit passed: anchors, pause, responsive widths, reduced motion, no JavaScript, console.')
