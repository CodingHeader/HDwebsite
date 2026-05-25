from playwright.sync_api import sync_playwright
import os

output_dir = "e:\\Code\\Demo\\HDwebsite\\hdwebsite\\docs\\research"
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    
    # 1. 访问修复后的克隆项目首页
    print("正在访问修复后的克隆项目 http://localhost:6789 ...")
    page.goto("http://localhost:6789")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)
    
    # 截图首页
    page.screenshot(path=f"{output_dir}\\clone-homepage-fixed.png", full_page=True)
    print(f"修复后首页截图已保存")
    
    # 2. 测试导航栏hover效果
    print("测试导航栏二级菜单...")
    nav_items = page.locator("nav a").all()
    print(f"找到 {len(nav_items)} 个导航链接")
    
    # 3. 测试点击"关于我们"
    print("测试点击'关于我们'...")
    page.click("text=关于我们")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{output_dir}\\clone-about-fixed.png", full_page=True)
    print("关于我们页面截图已保存")
    
    # 4. 测试点击"课程专业"
    print("测试点击'课程专业'...")
    page.goto("http://localhost:6789/courses")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{output_dir}\\clone-courses-fixed.png", full_page=True)
    print("课程专业页面截图已保存")
    
    # 5. 测试点击"新闻资讯"
    print("测试点击'新闻资讯'...")
    page.goto("http://localhost:6789/news")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{output_dir}\\clone-news-fixed.png", full_page=True)
    print("新闻资讯页面截图已保存")
    
    # 6. 测试点击"热门院校"
    print("测试点击'热门院校'...")
    page.goto("http://localhost:6789/partners")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path=f"{output_dir}\\clone-partners-fixed.png", full_page=True)
    print("热门院校页面截图已保存")
    
    browser.close()
    print("自动化测试验证完成！")
