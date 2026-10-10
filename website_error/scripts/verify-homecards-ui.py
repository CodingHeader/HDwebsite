from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    
    # 1. 访问后台登录页
    print("=== 1. 访问后台登录页 ===")
    page.goto("http://localhost:6789/manager/login")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="scripts/verify-01-login.png")
    print("截图: verify-01-login.png")
    
    # 2. 登录
    print("\n=== 2. 登录 ===")
    page.fill("input[placeholder*='用户名']", "admin")
    page.fill("input[placeholder*='密码']", "admin123")
    page.click("button[type='submit']")
    page.wait_for_url("**/manager", timeout=10000)
    time.sleep(2)
    page.screenshot(path="scripts/verify-02-dashboard.png")
    print("截图: verify-02-dashboard.png")
    
    # 3. 进入首页卡片管理页面
    print("\n=== 3. 进入首页卡片管理 ===")
    page.click("text=首页卡片")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.screenshot(path="scripts/verify-03-homecards.png")
    print("截图: verify-03-homecards.png")
    
    # 4. 点击编辑第一张卡片
    print("\n=== 4. 编辑第一张卡片 ===")
    rows = page.locator("table tbody tr").all()
    if len(rows) > 0:
        rows[0].locator("button[title='编辑']").click()
        page.wait_for_selector("text=编辑卡片", timeout=5000)
        time.sleep(2)
        page.screenshot(path="scripts/verify-04-edit-dialog.png")
        print("截图: verify-04-edit-dialog.png")
        
        # 5. 切换到图片背景模式
        print("\n=== 5. 测试背景类型切换 ===")
        page.click("text=图片")
        time.sleep(1)
        page.screenshot(path="scripts/verify-05-bg-image-mode.png")
        print("截图: verify-05-bg-image-mode.png")
        
        # 6. 检查 ImageField 是否出现
        has_imagefield = page.locator("text=点击选择上传方式").count() > 0 or page.locator("text=点击选择背景图片").count() > 0
        print(f"ImageField 组件存在: {has_imagefield}")
    else:
        print("未找到卡片数据行")
    
    # 7. 验证前台首页
    print("\n=== 7. 验证前台首页 ===")
    page.goto("http://localhost:6789/")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.screenshot(path="scripts/verify-06-homepage.png", full_page=True)
    print("截图: verify-06-homepage.png")
    
    browser.close()
    print("\n=== 验证完成 ===")
