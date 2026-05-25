from playwright.sync_api import sync_playwright
import os

output_dir = "e:\\Code\\Demo\\HDwebsite\\hdwebsite\\docs\\research"
os.makedirs(output_dir, exist_ok=True)

pages = [
    ("/courses", "courses"),
    ("/news", "news"),
    ("/about", "about"),
    ("/partners", "partners"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    
    for path, name in pages:
        # 原网站
        print(f"正在访问原网站 https://www.xgnedu.cn{path} ...")
        try:
            page.goto(f"https://www.xgnedu.cn{path}")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
            page.screenshot(path=f"{output_dir}\\original-{name}.png", full_page=True)
            print(f"原网站 {name} 截图已保存")
        except Exception as e:
            print(f"原网站 {name} 访问失败: {e}")
        
        # 克隆项目
        print(f"正在访问克隆项目 http://localhost:6789{path} ...")
        try:
            page.goto(f"http://localhost:6789{path}")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2000)
            page.screenshot(path=f"{output_dir}\\clone-{name}.png", full_page=True)
            print(f"克隆项目 {name} 截图已保存")
        except Exception as e:
            print(f"克隆项目 {name} 访问失败: {e}")
    
    browser.close()
    print("所有页面截图对比完成！")
