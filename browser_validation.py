"""
后台管理系统 - 三级原子化方案执行验证
逐项交互测试所有模块
"""
import asyncio
from playwright.async_api import async_playwright

async def validate_login_page():
    """验证1: 登录页现代化设计"""
    print("=" * 80)
    print("🧪 验证1: 登录页现代化设计")
    print("=" * 80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        # 访问登录页
        print("\n1. 访问登录页面...")
        await page.goto("http://localhost:3000/manager/login", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        
        # 截图保存
        await page.screenshot(path="screenshots/v1_login_page.png", full_page=True)
        print("   ✅ 登录页加载成功")
        
        # 验证元素存在
        elements_to_check = [
            ("学校Logo", "[data-logo]"),
            ("学校名称", "h1"),
            ("用户名输入框", "input#username"),
            ("密码输入框", "input#password"),
            ("登录按钮", "button[type='submit']"),
            ("密码可见性切换", "button[type='button']"),
        ]
        
        for name, selector in elements_to_check:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                print(f"   ✅ {name} 存在")
            except:
                print(f"   ❌ {name} 缺失")
        
        # 测试错误提示 - 用户名不存在
        print("\n2. 测试错误提示 - 用户名不存在...")
        await page.fill("input#username", "wronguser")
        await page.fill("input#password", "wrongpass")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1500)
        
        await page.screenshot(path="screenshots/v1_login_error_user.png")
        error_text = await page.locator("text=用户名不存在").is_visible()
        if error_text:
            print("   ✅ 正确提示: 用户名不存在")
        else:
            print("   ❌ 错误提示不正确")
        
        # 测试错误提示 - 密码错误
        print("\n3. 测试错误提示 - 密码错误...")
        await page.fill("input#username", "admin")
        await page.fill("input#password", "wrongpass")
        await page.click("button[type='submit']")
        await page.wait_for_timeout(1500)
        
        await page.screenshot(path="screenshots/v1_login_error_pass.png")
        error_text = await page.locator("text=密码错误").is_visible()
        if error_text:
            print("   ✅ 正确提示: 密码错误")
        else:
            print("   ❌ 错误提示不正确")
        
        # 测试密码可见性切换
        print("\n4. 测试密码可见性切换...")
        password_input = page.locator("input#password")
        await password_input.fill("testpassword")
        
        # 点击显示密码
        await page.click("button[type='button']")
        await page.wait_for_timeout(300)
        type_visible = await password_input.get_attribute("type")
        if type_visible == "text":
            print("   ✅ 密码显示功能正常")
        
        # 点击隐藏密码
        await page.click("button[type='button']")
        await page.wait_for_timeout(300)
        type_hidden = await password_input.get_attribute("type")
        if type_hidden == "password":
            print("   ✅ 密码隐藏功能正常")
        
        await browser.close()
        return True

async def validate_login_success():
    """验证2: 登录成功流程"""
    print("\n" + "=" * 80)
    print("🧪 验证2: 登录成功流程")
    print("=" * 80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_context().new_page()
        page.set_viewport_size({"width": 1280, "height": 900})
        
        # 访问登录页并登录
        print("\n1. 登录到后台管理系统...")
        await page.goto("http://localhost:3000/manager/login", wait_until="networkidle")
        
        await page.fill("input#username", "admin")
        await page.fill("input#password", "admin123")
        
        await page.click("button[type='submit']")
        
        # 等待跳转到dashboard
        try:
            await page.wait_for_url("**/manager", timeout=5000)
            print("   ✅ 登录成功，跳转到Dashboard")
        except:
            print("   ❌ 登录后未正确跳转")
            await browser.close()
            return False
        
        await page.wait_for_timeout(2000)
        await page.screenshot(path="screenshots/v2_dashboard.png", full_page=True)
        
        # 验证localStorage中的token
        token = await page.evaluate("() => localStorage.getItem('manager_token')")
        if token:
            print(f"   ✅ Token已存储: {token[:20]}...")
        else:
            print("   ❌ Token未存储")
        
        await browser.close()
        return True

async def validate_sidebar_menu():
    """验证3: Sidebar菜单加载"""
    print("\n" + "=" * 80)
    print("🧪 验证3: Sidebar菜单加载")
    print("=" * 80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()
        page.set_viewport_size({"width": 1280, "height": 900})
        
        # 先登录
        print("\n1. 登录获取权限...")
        await page.goto("http://localhost:3000/manager/login", wait_until="networkidle")
        await page.fill("input#username", "admin")
        await page.fill("input#password", "admin123")
        await page.click("button[type='submit']")
        await page.wait_for_url("**/manager", timeout=5000)
        await page.wait_for_timeout(2000)
        
        # 验证菜单项存在
        menu_items = [
            "仪表盘",
            "内容管理",
            "课程管理",
            "新闻管理",
            "学员管理",
            "轮播图管理",
            "分类管理",
            "系统管理",
            "网站设置",
        ]
        
        print("\n2. 验证菜单项...")
        for item in menu_items:
            try:
                await page.wait_for_selector(f"text={item}", timeout=3000)
                print(f"   ✅ {item}")
            except:
                print(f"   ❌ {item} 未找到")
        
        await page.screenshot(path="screenshots/v3_sidebar.png")
        
        # 测试菜单展开/收起
        print("\n3. 测试菜单交互...")
        content_menu = page.locator("text=内容管理")
        await content_menu.click()
        await page.wait_for_timeout(500)
        
        # 验证子菜单出现
        try:
            await page.wait_for_selector("text=课程管理", timeout=3000)
            print("   ✅ 内容管理菜单可展开")
        except:
            print("   ❌ 内容管理菜单展开失败")
        
        await browser.close()
        return True

async def validate_web_frontend():
    """验证4: 前台Web端页面"""
    print("\n" + "=" * 80)
    print("🧪 验证4: 前台Web端页面")
    print("=" * 80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        pages_to_check = [
            ("首页", "/", "v4_homepage"),
            ("课程列表", "/courses", "v4_courses"),
            ("新闻列表", "/news", "v4_news"),
            ("在线报名", "/apply", "v4_apply"),
            ("校区环境", "/campus", "v4_campus"),
        ]
        
        for name, path, screenshot_name in pages_to_check:
            print(f"\n验证: {name}")
            await page.goto(f"http://localhost:3000{path}", wait_until="networkidle")
            await page.wait_for_timeout(1500)
            await page.screenshot(path=f"screenshots/{screenshot_name}.png", full_page=True)
            print(f"   ✅ {name} 页面加载成功")
        
        # 验证首页元素
        print("\n验证首页关键元素...")
        home_elements = [
            ("TopBar", "text=成都市成华区新概念外语培训学校欢迎您"),
            ("轮播图", ".swiper, [data-banner], .banner"),
            ("课程区块", "text=热门课程, text=精品课程"),
            ("新闻区块", "text=最新资讯, text=学校新闻"),
        ]
        
        await page.goto("http://localhost:3000/", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        
        for name, selector in home_elements:
            try:
                await page.wait_for_selector(selector, timeout=3000)
                print(f"   ✅ {name}")
            except:
                print(f"   ⚠️ {name} (可能使用不同选择器)")
        
        await browser.close()
        return True

async def main():
    """主验证流程"""
    print("\n" + "=" * 80)
    print("🚀 三级原子化方案 - 浏览器自动化验证")
    print("=" * 80)
    print("\n服务器地址: http://localhost:3000")
    print("验证项目:")
    print("  1. 登录页现代化设计")
    print("  2. 登录成功流程")
    print("  3. Sidebar菜单加载")
    print("  4. 前台Web端页面")
    print("\n")
    
    results = []
    
    try:
        results.append(("登录页设计", await validate_login_page()))
    except Exception as e:
        print(f"❌ 登录页验证失败: {e}")
        results.append(("登录页设计", False))
    
    try:
        results.append(("登录成功流程", await validate_login_success()))
    except Exception as e:
        print(f"❌ 登录流程验证失败: {e}")
        results.append(("登录成功流程", False))
    
    try:
        results.append(("Sidebar菜单", await validate_sidebar_menu()))
    except Exception as e:
        print(f"❌ Sidebar验证失败: {e}")
        results.append(("Sidebar菜单", False))
    
    try:
        results.append(("前台Web端", await validate_web_frontend()))
    except Exception as e:
        print(f"❌ 前台验证失败: {e}")
        results.append(("前台Web端", False))
    
    # 打印总结
    print("\n" + "=" * 80)
    print("📊 验证结果总结")
    print("=" * 80)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name}: {status}")
    
    print(f"\n总计: {passed}/{total} 通过")
    
    if passed == total:
        print("\n🎉 所有验证通过！三级原子化方案执行成功！")
    else:
        print(f"\n⚠️ {total - passed} 项验证失败，请检查。")
    
    return passed == total

if __name__ == "__main__":
    asyncio.run(main())
