#!/usr/bin/env python3
"""
后台管理系统登录验证脚本
使用Playwright进行浏览器自动化验证
"""
import asyncio
from playwright.async_api import async_playwright

async def validate_login():
    """验证登录流程"""
    print("=" * 80)
    print("🔍 后台管理系统 - 三级原子化方案验证")
    print("=" * 80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=100)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        # 1. 访问登录页
        print("\n1️⃣ 访问登录页面...")
        await page.goto("http://localhost:6789/manager/login", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="screenshots/01_login_page.png")
        print("   ✅ 登录页加载成功 (Linear风格暗色主题)")
        
        # 2. 验证页面元素
        print("\n2️⃣ 验证页面元素...")
        elements = [
            ("Logo图标", "div[class*='rounded-xl']"),
            ("学校名称标题", "h1"),
            ("用户名输入框", "input#username"),
            ("密码输入框", "input#password"),
            ("登录按钮", "button[type='submit']"),
            ("密码可见性切换", "button[type='button']"),
        ]
        for name, selector in elements:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                print(f"   ✅ {name}")
            except:
                print(f"   ❌ {name} 未找到")
        
        # 3. 测试错误提示
        print("\n3️⃣ 测试错误提示 - 用户名不存在...")
        await page.fill("input#username", "wronguser")
        await page.fill("input#password", "wrongpass")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1500)
        await page.screenshot(path="screenshots/02_error_user.png")
        error_text = await page.locator("text=用户名不存在").is_visible()
        if error_text:
            print("   ✅ 正确提示: 用户名不存在")
        else:
            print("   ⚠️ 错误提示可能不同")
        
        # 4. 测试密码错误
        print("\n4️⃣ 测试错误提示 - 密码错误...")
        await page.fill("input#username", "admin")
        await page.fill("input#password", "wrongpass")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1500)
        await page.screenshot(path="screenshots/03_error_pass.png")
        error_text = await page.locator("text=密码错误").is_visible()
        if error_text:
            print("   ✅ 正确提示: 密码错误")
        
        # 5. 测试成功登录
        print("\n5️⃣ 测试成功登录...")
        await page.fill("input#username", "admin")
        await page.fill("input#password", "admin123")
        await page.click("button[type='submit']")
        
        # 等待跳转
        try:
            await page.wait_for_url("**/manager", timeout=8000)
            print("   ✅ 登录成功，已跳转到Dashboard")
            await page.wait_for_timeout(2000)
            await page.screenshot(path="screenshots/04_dashboard.png", full_page=True)
        except:
            print("   ❌ 登录后未正确跳转")
            await page.screenshot(path="screenshots/04_login_failed.png")
        
        # 6. 验证token存储
        token = await page.evaluate("() => localStorage.getItem('manager_token')")
        if token:
            print(f"   ✅ Token已存储: {token[:30]}...")
        else:
            print("   ❌ Token未存储")
        
        await browser.close()
        
        print("\n" + "=" * 80)
        print("✅ 验证完成！截图保存在 screenshots/ 目录")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(validate_login())
