"""Developer smoke check: isolated temp configs, headless Edge, no routing or real training."""
import argparse
import tempfile
import threading
from pathlib import Path
import _bootstrap
from ai.src.web.server import make_server


def main():
    from playwright.sync_api import sync_playwright
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--screenshot-dir', default='ai/artifacts/ui-check')
    args = parser.parse_args()
    screenshots=Path(args.screenshot_dir)
    screenshots.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='runstop-ui-') as temporary:
        server=make_server(0,Path(temporary))
        thread=threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        try:
            with sync_playwright() as pw:
                browser=pw.chromium.launch(channel='msedge',headless=True)
                page=browser.new_page(viewport={'width':1440,'height':1080},device_scale_factor=1)
                errors=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                page.goto(f'http://127.0.0.1:{server.server_port}')
                page.locator('#validation-badge').filter(has_text='검증 완료').wait_for()
                assert page.locator('#model-select option').count()==7
                page.locator('#model-select').select_option('logistic_regression')
                page.locator('#field-model-params-C').fill('2.5')
                page.locator('#validation-badge').filter(has_text='검증 완료').wait_for()
                assert 'C: 2.5' in page.locator('#yaml-preview').inner_text()
                page.locator('#save-name').fill('browser_test')
                page.locator('#save-button').click()
                page.locator('#message').filter(has_text='저장 완료').wait_for()
                page.locator('#load-button').click()
                page.get_by_role('button',name='configs/experiments/browser_test.yaml').click()
                page.locator('#validation-badge').filter(has_text='검증 완료').wait_for()
                assert page.locator('#field-model-params-C').input_value()=='2.5'
                page.locator('#model-select').select_option('lightgbm_ranker')
                page.locator('#validation-badge').filter(has_text='검증 완료').wait_for()
                page.screenshot(path=str(screenshots/'experiment-desktop.png'),full_page=True)
                page.locator('#generation-tab').click()
                page.locator('#field-candidates-minimum').fill('11')
                page.locator('#validation-badge').filter(has_text='입력 확인').wait_for()
                assert page.locator('#save-button').is_disabled()
                page.locator('#field-candidates-minimum').fill('6')
                page.locator('#field-utility-params-profile_share').fill('0.8')
                page.locator('#validation-badge').filter(has_text='검증 완료').wait_for()
                assert 'profile_share: 0.8' in page.locator('#yaml-preview').inner_text()
                page.screenshot(path=str(screenshots/'generation-desktop.png'),full_page=True)
                page.set_viewport_size({'width':390,'height':844})
                page.locator('#experiment-tab').click()
                page.locator('#validation-badge').filter(has_text='검증 완료').wait_for()
                assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
                page.screenshot(path=str(screenshots/'experiment-mobile.png'),full_page=True)
                assert not errors, errors
                browser.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join()
    print('Browser checks passed: model fields, YAML roundtrip, invalid input, Utility, desktop/mobile; no execution.')


if __name__=='__main__':
    main()
