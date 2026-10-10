from playwright.sync_api import sync_playwright
import os

output_dir = "e:\\Code\\Demo\\HDwebsite\\hdwebsite\\docs\\research"
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    
    # 1. 访问原网站
    print("正在访问原网站 https://www.xgnedu.cn/ ...")
    page.goto("https://www.xgnedu.cn/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)
    page.screenshot(path=f"{output_dir}\\original-homepage.png", full_page=True)
    print(f"原网站截图已保存: {output_dir}\\original-homepage.png")
    
    # 2. 访问克隆项目
    print("正在访问克隆项目 http://localhost:6789 ...")
    page.goto("http://localhost:6789")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)
    page.screenshot(path=f"{output_dir}\\clone-homepage.png", full_page=True)
    print(f"克隆项目截图已保存: {output_dir}\\clone-homepage.png")
    
    browser.close()
    print("截图对比完成！")
