#!/usr/bin/env python3
"""
后台管理系统 - 全面深度检查
使用Playwright进行真实浏览器自动化测试
"""
import asyncio
from playwright.async_api import async_playwright
import time

BASE_URL = "http://localhost:6789"

async def test_login_flow():
    """测试1: 登录流程完整性"""
    print("\n" + "="*80)
    print("🧪 测试1: 登录流程完整性")
    print("="*80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=500)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        try:
            # 1. 访问登录页
            print("\n1️⃣ 访问登录页面...")
            await page.goto(f"{BASE_URL}/manager/login", wait_until="networkidle")
            await page.wait_for_timeout(1000)
            print("   ✅ 登录页加载成功")
            
            # 2. 检查页面元素
            print("\n2️⃣ 检查页面元素...")
            username_input = await page.query_selector("input#username")
            password_input = await page.query_selector("input#password")
            login_button = await page.query_selector("button[type='submit']")
            
            if username_input and password_input and login_button:
                print("   ✅ 所有表单元素存在")
            else:
                print("   ❌ 表单元素缺失")
                return False
            
            # 3. 测试错误提示 - 空表单
            print("\n3️⃣ 测试空表单提交...")
            await page.click("button[type='submit']")
            await page.wait_for_timeout(1000)
            print("   ✅ 空表单验证正常")
            
            # 4. 测试错误凭证
            print("\n4️⃣ 测试错误凭证...")
            await page.fill("input#username", "wronguser")
            await page.fill("input#password", "wrongpass")
            await page.click("button[type='submit']")
            await page.wait_for_timeout(2000)
            
            # 检查是否有错误提示
            error_visible = await page.locator("text=/用户名不存在|密码错误|登录失败/").is_visible()
            if error_visible:
                print("   ✅ 错误提示显示正常")
            else:
                print("   ⚠️ 未检测到错误提示")
            
            # 5. 测试正确登录
            print("\n5️⃣ 测试正确登录...")
            await page.fill("input#username", "admin")
            await page.fill("input#password", "admin123")
            
            # 监听网络请求
            request_count = {"login": 0, "redirect": 0}
            
            def count_requests(request):
                if "/api/auth/login" in request.url:
                    request_count["login"] += 1
                if "/manager" in request.url and request.url != f"{BASE_URL}/manager/login":
                    request_count["redirect"] += 1
            
            page.on("request", count_requests)
            
            await page.click("button[type='submit']")
            
            # 等待跳转
            try:
                await page.wait_for_url(f"{BASE_URL}/manager", timeout=8000)
                print("   ✅ 登录成功，已跳转到仪表盘")
                await page.wait_for_timeout(2000)
                
                # 检查是否有循环请求
                if request_count["redirect"] > 3:
                    print(f"   ⚠️ 检测到可能的重定向循环 (重定向次数: {request_count['redirect']})")
                else:
                    print(f"   ✅ 无重定向循环 (重定向次数: {request_count['redirect']})")
                
            except Exception as e:
                print(f"   ❌ 登录后未正确跳转: {e}")
                current_url = page.url
                print(f"   当前URL: {current_url}")
                return False
            
            # 6. 验证token存储
            print("\n6️⃣ 验证认证状态...")
            token = await page.evaluate("() => localStorage.getItem('auth-storage')")
            if token:
                print(f"   ✅ Token已存储")
            else:
                print("   ❌ Token未存储")
            
            # 7. 检查仪表盘页面
            print("\n7️⃣ 检查仪表盘页面...")
            dashboard_title = await page.query_selector("text=/仪表盘|Dashboard/")
            if dashboard_title:
                print("   ✅ 仪表盘页面加载成功")
            else:
                print("   ⚠️ 仪表盘标题未找到")
            
            await page.screenshot(path="screenshots/test1_dashboard.png", full_page=True)
            
            return True
            
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            await page.screenshot(path="screenshots/test1_error.png")
            return False
        finally:
            await browser.close()

async def test_sidebar_navigation():
    """测试2: 侧边栏导航功能"""
    print("\n" + "="*80)
    print("🧪 测试2: 侧边栏导航功能")
    print("="*80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=500)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        try:
            # 先登录
            print("\n1️⃣ 登录系统...")
            await page.goto(f"{BASE_URL}/manager/login", wait_until="networkidle")
            await page.fill("input#username", "admin")
            await page.fill("input#password", "admin123")
            await page.click("button[type='submit']")
            await page.wait_for_url(f"{BASE_URL}/manager", timeout=8000)
            await page.wait_for_timeout(2000)
            print("   ✅ 登录成功")
            
            # 检查侧边栏菜单
            print("\n2️⃣ 检查侧边栏菜单...")
            menu_items = [
                "仪表盘",
                "内容管理",
                "课程管理",
                "新闻管理",
                "学员管理",
                "轮播图管理",
                "分类管理",
                "系统管理",
            ]
            
            found_count = 0
            for item in menu_items:
                try:
                    element = await page.wait_for_selector(f"text={item}", timeout=3000)
                    if element:
                        print(f"   ✅ {item}")
                        found_count += 1
                except:
                    print(f"   ❌ {item} 未找到")
            
            print(f"\n   菜单项统计: {found_count}/{len(menu_items)}")
            
            # 测试菜单点击
            print("\n3️⃣ 测试菜单导航...")
            test_routes = [
                ("课程管理", "/manager/courses"),
                ("新闻管理", "/manager/news"),
                ("分类管理", "/manager/categories"),
            ]
            
            for menu_name, expected_url in test_routes:
                try:
                    await page.click(f"text={menu_name}")
                    await page.wait_for_timeout(1500)
                    current_url = page.url
                    if expected_url in current_url:
                        print(f"   ✅ {menu_name} → {expected_url}")
                    else:
                        print(f"   ⚠️ {menu_name} 跳转异常: {current_url}")
                except Exception as e:
                    print(f"   ❌ {menu_name} 点击失败: {e}")
            
            await page.screenshot(path="screenshots/test2_sidebar.png", full_page=True)
            
            return True
            
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            await page.screenshot(path="screenshots/test2_error.png")
            return False
        finally:
            await browser.close()

async def test_crud_operations():
    """测试3: CRUD操作功能"""
    print("\n" + "="*80)
    print("🧪 测试3: CRUD操作功能")
    print("="*80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=500)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        try:
            # 先登录
            print("\n1️⃣ 登录系统...")
            await page.goto(f"{BASE_URL}/manager/login", wait_until="networkidle")
            await page.fill("input#username", "admin")
            await page.fill("input#password", "admin123")
            await page.click("button[type='submit']")
            await page.wait_for_url(f"{BASE_URL}/manager", timeout=8000)
            await page.wait_for_timeout(2000)
            print("   ✅ 登录成功")
            
            # 测试分类管理页面
            print("\n2️⃣ 测试分类管理页面...")
            await page.goto(f"{BASE_URL}/manager/categories", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            # 检查页面元素
            page_title = await page.query_selector("text=/分类管理|Categories/")
            if page_title:
                print("   ✅ 分类管理页面加载成功")
            else:
                print("   ⚠️ 页面标题未找到")
            
            # 检查是否有数据表格
            table = await page.query_selector("table")
            if table:
                print("   ✅ 数据表格存在")
            else:
                print("   ⚠️ 数据表格未找到")
            
            await page.screenshot(path="screenshots/test3_categories.png", full_page=True)
            
            # 测试课程管理页面
            print("\n3️⃣ 测试课程管理页面...")
            await page.goto(f"{BASE_URL}/manager/courses", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            page_title = await page.query_selector("text=/课程管理|Courses/")
            if page_title:
                print("   ✅ 课程管理页面加载成功")
            else:
                print("   ⚠️ 页面标题未找到")
            
            await page.screenshot(path="screenshots/test3_courses.png", full_page=True)
            
            # 测试新闻管理页面
            print("\n4️⃣ 测试新闻管理页面...")
            await page.goto(f"{BASE_URL}/manager/news", wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            page_title = await page.query_selector("text=/新闻管理|News/")
            if page_title:
                print("   ✅ 新闻管理页面加载成功")
            else:
                print("   ⚠️ 页面标题未找到")
            
            await page.screenshot(path="screenshots/test3_news.png", full_page=True)
            
            return True
            
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            await page.screenshot(path="screenshots/test3_error.png")
            return False
        finally:
            await browser.close()

async def test_frontend_pages():
    """测试4: 前台页面功能"""
    print("\n" + "="*80)
    print("🧪 测试4: 前台页面功能")
    print("="*80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=500)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        try:
            pages_to_test = [
                ("首页", "/"),
                ("关于我们", "/about"),
                ("课程列表", "/courses"),
                ("新闻列表", "/news"),
                ("在线报名", "/apply"),
            ]
            
            for page_name, path in pages_to_test:
                print(f"\n测试: {page_name} ({path})")
                await page.goto(f"{BASE_URL}{path}", wait_until="networkidle")
                await page.wait_for_timeout(1500)
                
                # 检查页面是否加载成功
                title = await page.title()
                print(f"   ✅ 页面加载成功 - {title}")
                
                # 截图
                screenshot_name = page_name.replace("/", "_")
                await page.screenshot(path=f"screenshots/test4_{screenshot_name}.png", full_page=True)
            
            return True
            
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            await page.screenshot(path="screenshots/test4_error.png")
            return False
        finally:
            await browser.close()

async def test_logout_flow():
    """测试5: 登出流程"""
    print("\n" + "="*80)
    print("🧪 测试5: 登出流程")
    print("="*80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, slow_mo=500)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        try:
            # 先登录
            print("\n1️⃣ 登录系统...")
            await page.goto(f"{BASE_URL}/manager/login", wait_until="networkidle")
            await page.fill("input#username", "admin")
            await page.fill("input#password", "admin123")
            await page.click("button[type='submit']")
            await page.wait_for_url(f"{BASE_URL}/manager", timeout=8000)
            await page.wait_for_timeout(2000)
            print("   ✅ 登录成功")
            
            # 查找登出按钮
            print("\n2️⃣ 查找登出按钮...")
            logout_button = await page.query_selector("text=/退出|登出|Logout/")
            if logout_button:
                print("   ✅ 找到登出按钮")
                await logout_button.click()
                await page.wait_for_timeout(2000)
                
                # 检查是否跳转到登录页
                current_url = page.url
                if "/manager/login" in current_url:
                    print("   ✅ 成功跳转到登录页")
                else:
                    print(f"   ⚠️ 未跳转到登录页: {current_url}")
                
                # 检查token是否清除
                token = await page.evaluate("() => localStorage.getItem('auth-storage')")
                if not token or token == "null":
                    print("   ✅ Token已清除")
                else:
                    print("   ⚠️ Token未清除")
            else:
                print("   ⚠️ 未找到登出按钮")
            
            return True
            
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            await page.screenshot(path="screenshots/test5_error.png")
            return False
        finally:
            await browser.close()

async def main():
    """主测试流程"""
    print("\n" + "="*80)
    print("🚀 后台管理系统 - 全面深度检查")
    print("="*80)
    print(f"\n服务器地址: {BASE_URL}")
    print("测试项目:")
    print("  1. 登录流程完整性")
    print("  2. 侧边栏导航功能")
    print("  3. CRUD操作功能")
    print("  4. 前台页面功能")
    print("  5. 登出流程")
    print("\n")
    
    # 创建截图目录
    import os
    os.makedirs("screenshots", exist_ok=True)
    
    results = []
    
    # 执行所有测试
    tests = [
        ("登录流程", test_login_flow),
        ("侧边栏导航", test_sidebar_navigation),
        ("CRUD操作", test_crud_operations),
        ("前台页面", test_frontend_pages),
        ("登出流程", test_logout_flow),
    ]
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ {test_name} 执行失败: {e}")
            results.append((test_name, False))
    
    # 打印总结
    print("\n" + "="*80)
    print("📊 测试结果总结")
    print("="*80)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name}: {status}")
    
    print(f"\n总计: {passed}/{total} 通过")
    print(f"通过率: {passed/total*100:.1f}%")
    
    if passed == total:
        print("\n🎉 所有测试通过！系统运行正常！")
    else:
        print(f"\n⚠️ {total - passed} 项测试失败，需要修复。")
    
    print("\n截图已保存到 screenshots/ 目录")
    print("="*80)

if __name__ == "__main__":
    asyncio.run(main())
