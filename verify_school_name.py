"""
验证学校名称配置化是否正确生效
"""
import asyncio
from playwright.async_api import async_playwright

async def verify_school_names():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        results = []
        
        # 测试1: 首页TopBar
        print("=" * 60)
        print("🧪 验证1: 首页TopBar学校名称")
        print("=" * 60)
        await page.goto("http://localhost:3000/", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        
        # 截图保存
        await page.screenshot(path="screenshots/verify_homepage.png", full_page=True)
        
        # 检查TopBar文本
        topbar_text = await page.locator("text=成都市成华区新概念外语培训学校").first.is_visible()
        if topbar_text:
            print("✅ TopBar显示: 成都市成华区新概念外语培训学校")
            results.append(("首页TopBar", True))
        else:
            print("❌ TopBar学校名称未找到")
            results.append(("首页TopBar", False))
        
        # 测试2: 在线报名页AI客服
        print("\n" + "=" * 60)
        print("🧪 验证2: 在线报名页AI客服名称")
        print("=" * 60)
        await page.goto("http://localhost:3000/apply", wait_until="networkidle")
        await page.wait_for_timeout(3000)  # 等待AI客服加载
        
        await page.screenshot(path="screenshots/verify_apply.png", full_page=True)
        
        # 检查AI客服是否显示学校名称
        ai_chat = await page.locator("text=新概念学历教育").first.is_visible()
        if ai_chat:
            print("✅ AI客服显示学校名称: 新概念学历教育")
            results.append(("AI客服", True))
        else:
            print("❌ AI客服学校名称未找到")
            results.append(("AI客服", False))
        
        # 测试3: 后台登录页
        print("\n" + "=" * 60)
        print("🧪 验证3: 后台登录页标题")
        print("=" * 60)
        await page.goto("http://localhost:3000/manager/login", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        
        await page.screenshot(path="screenshots/verify_login.png", full_page=True)
        
        # 检查登录页标题
        login_title = await page.locator("h1:has-text('新概念学历教育')").is_visible()
        if login_title:
            print("✅ 登录页标题显示: 新概念学历教育")
            results.append(("登录页标题", True))
        else:
            print("❌ 登录页学校名称未找到")
            results.append(("登录页标题", False))
        
        # 测试4: 校区页面
        print("\n" + "=" * 60)
        print("🧪 验证4: 校区页面学校名称")
        print("=" * 60)
        await page.goto("http://localhost:3000/campus", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        
        await page.screenshot(path="screenshots/verify_campus.png", full_page=True)
        
        # 检查校区介绍
        campus_text = await page.locator("text=新概念学历教育校区位于").first.is_visible()
        if campus_text:
            print("✅ 校区页面显示学校名称")
            results.append(("校区页面", True))
        else:
            print("❌ 校区页面学校名称未找到")
            results.append(("校区页面", False))
        
        await browser.close()
        
        # 打印总结
        print("\n" + "=" * 60)
        print("📊 验证结果总结")
        print("=" * 60)
        passed = sum(1 for _, r in results if r)
        total = len(results)
        for name, result in results:
            status = "✅ 通过" if result else "❌ 失败"
            print(f"  {name}: {status}")
        print(f"\n总计: {passed}/{total} 通过")
        
        if passed == total:
            print("\n🎉 所有验证通过！学校名称配置化已成功生效！")
        else:
            print("\n⚠️ 部分验证失败，请检查配置。")
        
        return passed == total

if __name__ == "__main__":
    asyncio.run(verify_school_names())
