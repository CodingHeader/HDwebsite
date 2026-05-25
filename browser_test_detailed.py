#!/usr/bin/env python3
"""
Detailed Browser automation test script for HD Website
Comprehensive testing of all frontend and backend modules
"""

import asyncio
import sys
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:3000"

# 模块功能详细描述
MODULES = {
    "前台模块": {
        "首页": {
            "路径": "/",
            "功能": ["轮播图展示", "课程推荐", "最新新闻", "学校简介", "报名入口"],
            "用户角度": "展示学校形象和核心信息，引导用户浏览课程和新闻",
            "管理员角度": "通过后台管理轮播图、课程、新闻内容",
        },
        "关于我们": {
            "路径": "/about",
            "功能": ["学校介绍", "办学理念", "师资力量", "联系方式", "校区位置"],
            "用户角度": "了解学校背景、师资团队、联系方式",
            "管理员角度": "通过设置页面管理学校信息",
        },
        "文章列表": {
            "路径": "/articles",
            "功能": ["文章分类筛选", "文章搜索", "分页浏览", "文章卡片展示"],
            "用户角度": "浏览学校发布的各类文章、资讯、通知",
            "管理员角度": "通过文章管理页面发布、编辑、删除文章",
        },
        "课程列表": {
            "路径": "/courses",
            "功能": ["课程分类筛选", "课程搜索", "分页浏览", "课程卡片展示"],
            "用户角度": "查看所有专升本课程，按分类筛选感兴趣的课程",
            "管理员角度": "通过课程管理页面管理课程信息",
        },
        "新闻列表": {
            "路径": "/news",
            "功能": ["新闻列表展示", "分页浏览", "新闻搜索"],
            "用户角度": "查看学校新闻动态、通知公告",
            "管理员角度": "通过新闻管理页面发布、编辑、删除新闻",
        },
        "在线报名": {
            "路径": "/apply",
            "功能": ["AI智能客服", "在线咨询", "表单提交", "课程选择"],
            "用户角度": "通过AI客服咨询课程，提交报名信息",
            "管理员角度": "通过学员管理查看报名信息",
        },
    },
    "后台模块": {
        "仪表盘": {
            "路径": "/manager",
            "功能": ["数据统计", "快捷入口", "最新动态", "图表展示"],
            "管理员角度": "查看网站整体运营数据，快速访问各管理模块",
        },
        "导航管理": {
            "路径": "/manager/navigations",
            "功能": ["导航树管理", "CRUD操作", "排序调整", "状态控制"],
            "管理员角度": "管理前台网站导航菜单结构",
        },
        "文章管理": {
            "路径": "/manager/articles",
            "功能": ["文章列表", "发布/下架", "富文本编辑", "分类管理", "搜索筛选"],
            "管理员角度": "管理网站文章内容，发布资讯和通知",
        },
        "课程管理": {
            "路径": "/manager/courses",
            "功能": ["课程列表", "CRUD操作", "分类关联", "状态管理"],
            "管理员角度": "管理专升本课程信息",
        },
        "新闻管理": {
            "路径": "/manager/news",
            "功能": ["新闻列表", "发布/草稿", "富文本编辑", "浏览量统计"],
            "管理员角度": "管理网站新闻动态",
        },
        "学员管理": {
            "路径": "/manager/students",
            "功能": ["报名列表", "状态更新", "联系信息", "筛选查询"],
            "管理员角度": "管理在线报名的学员信息",
        },
        "轮播图管理": {
            "路径": "/manager/banners",
            "功能": ["轮播图CRUD", "排序", "状态控制", "预览"],
            "管理员角度": "管理首页轮播图展示",
        },
        "分类管理": {
            "路径": "/manager/categories",
            "功能": ["分类CRUD", "排序", "关联统计"],
            "管理员角度": "管理课程和文章分类",
        },
        "合作院校": {
            "路径": "/manager/partners",
            "功能": ["院校CRUD", "Logo管理", "链接配置"],
            "管理员角度": "管理合作院校信息展示",
        },
        "校区环境": {
            "路径": "/manager/campus",
            "功能": ["校区CRUD", "图片管理", "位置信息"],
            "管理员角度": "管理校区环境和设施展示",
        },
        "系统设置": {
            "路径": "/manager/settings",
            "功能": ["站点配置", "联系方式", "SEO设置"],
            "管理员角度": "配置网站基本信息",
        },
    }
}

async def test_module(page, module_name, module_info, is_backend=False):
    """测试单个模块"""
    url = f"{BASE_URL}{module_info['路径']}"
    print(f"\n{'='*60}")
    print(f"🧪 测试模块: {module_name}")
    print(f"{'='*60}")
    print(f"   URL: {url}")
    print(f"   功能: {', '.join(module_info['功能'])}")
    
    try:
        await page.goto(url, wait_until="networkidle")
        await asyncio.sleep(1.5)
        
        title = await page.title()
        print(f"   页面标题: {title}")
        
        # Check for errors
        error_count = await page.evaluate('''() => {
            return document.querySelectorAll('[class*="error"], .error, .Error').length;
        }''')
        
        if error_count > 0:
            print(f"   ⚠️ 发现 {error_count} 个错误元素")
        
        # Take screenshot
        screenshot_name = module_name.replace("/", "_").replace(" ", "_")
        screenshot_path = f"screenshots/detailed_{screenshot_name}.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"   📸 截图: {screenshot_path}")
        
        return True
    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return False

async def test_backend_login_detailed(page):
    """详细测试后台登录"""
    print(f"\n{'='*60}")
    print("🔐 后台登录详细测试")
    print(f"{'='*60}")
    
    try:
        await page.goto(f"{BASE_URL}/manager/login", wait_until="networkidle")
        await asyncio.sleep(1)
        
        # Check for form elements
        form_elements = await page.query_selector_all('input, button')
        print(f"   发现 {len(form_elements)} 个表单元素")
        
        # List all interactive elements
        elements = await page.evaluate('''() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            const buttons = Array.from(document.querySelectorAll('button'));
            return {
                inputs: inputs.map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder })),
                buttons: buttons.map(b => ({ text: b.innerText, type: b.type }))
            };
        }''')
        
        print(f"   输入框: {len(elements['inputs'])}")
        for inp in elements['inputs']:
            print(f"      - {inp.get('type', 'text')}: {inp.get('placeholder', 'N/A')}")
        
        print(f"   按钮: {len(elements['buttons'])}")
        for btn in elements['buttons']:
            print(f"      - {btn.get('text', 'N/A')}")
        
        # Try to fill login form
        username_input = await page.query_selector('input[type="text"], input[name="username"], input[placeholder*="用户名"]')
        password_input = await page.query_selector('input[type="password"], input[name="password"], input[placeholder*="密码"]')
        
        if username_input and password_input:
            await username_input.fill("admin")
            await password_input.fill("admin123")
            print("   ✅ 填写登录凭据: admin / admin123")
            
            # Find and click login button
            submit_btn = await page.query_selector('button[type="submit"], button:has-text("登录"), button:has-text("Login")')
            if submit_btn:
                await submit_btn.click()
                print("   ✅ 点击登录按钮")
                await asyncio.sleep(2)
                
                # Check current URL
                current_url = page.url
                print(f"   当前URL: {current_url}")
                
                if "/login" not in current_url:
                    print("   ✅ 登录成功！")
                    await page.screenshot(path="screenshots/backend_logged_in.png", full_page=True)
                    
                    # Test dashboard
                    await test_module(page, "仪表盘", {
                        "路径": "/manager",
                        "功能": ["数据统计", "快捷入口"]
                    }, True)
                    
                    return True
                else:
                    # Check for error message
                    error_msg = await page.evaluate('''() => {
                        const err = document.querySelector('[class*="error"], .alert, .Toast');
                        return err ? err.innerText : null;
                    }''')
                    if error_msg:
                        print(f"   ⚠️ 登录错误: {error_msg}")
        else:
            print("   ⚠️ 未找到登录表单")
        
        return False
    except Exception as e:
        print(f"   ❌ 错误: {e}")
        return False

async def print_modules_summary():
    """打印模块功能摘要"""
    print("\n" + "="*80)
    print("📋 网站模块功能详细描述")
    print("="*80)
    
    for category, modules in MODULES.items():
        print(f"\n{'─'*80}")
        print(f"【{category}】")
        print(f"{'─'*80}")
        
        for module_name, info in modules.items():
            print(f"\n📌 {module_name}")
            print(f"   路径: {info['路径']}")
            print(f"   功能: {', '.join(info['功能'])}")
            if '用户角度' in info:
                print(f"   👤 用户角度: {info['用户角度']}")
            if '管理员角度' in info:
                print(f"   👨‍💼 管理员角度: {info['管理员角度']}")

async def main():
    """主测试函数"""
    print("🚀 启动详细浏览器自动化测试")
    print(f"目标服务器: {BASE_URL}")
    
    # 首先打印模块功能描述
    await print_modules_summary()
    
    # Create screenshots directory
    import os
    os.makedirs("screenshots", exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page(viewport={"width": 1280, "height": 900})
        
        results = {
            "前台模块": {},
            "后台模块": {}
        }
        
        try:
            # Test frontend modules
            print("\n" + "="*80)
            print("🌐 开始测试前台模块")
            print("="*80)
            
            for module_name, module_info in MODULES["前台模块"].items():
                success = await test_module(page, module_name, module_info)
                results["前台模块"][module_name] = success
                await asyncio.sleep(0.5)
            
            # Test backend login
            backend_login_success = await test_backend_login_detailed(page)
            
            # If logged in, test other backend modules
            if backend_login_success:
                print("\n" + "="*80)
                print("🔐 开始测试后台模块")
                print("="*80)
                
                for module_name, module_info in MODULES["后台模块"].items():
                    if module_name != "仪表盘":  # Already tested
                        success = await test_module(page, module_name, module_info, True)
                        results["后台模块"][module_name] = success
                        await asyncio.sleep(0.5)
            
            # Summary
            print("\n" + "="*80)
            print("📊 测试总结报告")
            print("="*80)
            
            for category, modules in results.items():
                passed = sum(1 for s in modules.values() if s)
                total = len(modules)
                print(f"\n{category}: {passed}/{total} 通过")
                for name, success in modules.items():
                    status = "✅" if success else "❌"
                    print(f"   {status} {name}")
            
            print("\n" + "="*80)
            print("✨ 所有测试完成！")
            print("📁 截图保存在 screenshots/ 目录")
            print("="*80)
            
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
