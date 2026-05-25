#!/usr/bin/env python3
"""
通过API测试检查后台管理系统
"""
import asyncio
import json
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:6789"

async def test_api_endpoints():
    """测试API端点"""
    print("\n" + "="*80)
    print("🔍 API端点测试")
    print("="*80)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        try:
            # 1. 先登录获取token
            print("\n1️⃣ 登录获取token...")
            await page.goto(f"{BASE_URL}/manager/login")
            await page.fill("input#username", "admin")
            await page.fill("input#password", "admin123")
            await page.click("button[type='submit']")
            await page.wait_for_url(f"{BASE_URL}/manager", timeout=8000)
            await page.wait_for_timeout(2000)
            
            # 获取token
            auth_storage = await page.evaluate("() => localStorage.getItem('auth-storage')")
            if auth_storage:
                auth_data = json.loads(auth_storage)
                token = auth_data.get('state', {}).get('token')
                print(f"   ✅ Token获取成功: {token[:30]}...")
            else:
                print("   ❌ Token获取失败")
                return
            
            # 2. 测试菜单API
            print("\n2️⃣ 测试菜单API...")
            response = await page.evaluate(f"""
                async () => {{
                    const res = await fetch('/api/manager-menus', {{
                        headers: {{ 'Authorization': 'Bearer {token}' }}
                    }});
                    return await res.json();
                }}
            """)
            
            if response.get('code') == 200:
                menus = response.get('data', [])
                print(f"   ✅ 菜单API正常，返回 {len(menus)} 个一级菜单")
                for menu in menus:
                    print(f"      - {menu.get('label')} ({menu.get('code')})")
                    if menu.get('children'):
                        for child in menu['children']:
                            print(f"        └─ {child.get('label')} ({child.get('code')})")
            else:
                print(f"   ❌ 菜单API失败: {response}")
            
            # 3. 测试仪表盘API
            print("\n3️⃣ 测试仪表盘API...")
            response = await page.evaluate(f"""
                async () => {{
                    const res = await fetch('/api/manager/dashboard', {{
                        headers: {{ 'Authorization': 'Bearer {token}' }}
                    }});
                    return await res.json();
                }}
            """)
            
            if response.get('code') == 200:
                stats = response.get('data', {}).get('stats', {})
                print(f"   ✅ 仪表盘API正常")
                print(f"      - 课程总数: {stats.get('totalCourses', 0)}")
                print(f"      - 文章总数: {stats.get('totalArticles', 0)}")
                print(f"      - 学员总数: {stats.get('totalStudents', 0)}")
                print(f"      - 待处理报名: {stats.get('pendingStudents', 0)}")
            else:
                print(f"   ❌ 仪表盘API失败: {response}")
            
            # 4. 测试分类API
            print("\n4️⃣ 测试分类API...")
            response = await page.evaluate(f"""
                async () => {{
                    const res = await fetch('/api/categories', {{
                        headers: {{ 'Authorization': 'Bearer {token}' }}
                    }});
                    return await res.json();
                }}
            """)
            
            if response.get('code') == 200:
                categories = response.get('data', [])
                print(f"   ✅ 分类API正常，返回 {len(categories)} 个分类")
            else:
                print(f"   ❌ 分类API失败: {response}")
            
            # 5. 测试课程API
            print("\n5️⃣ 测试课程API...")
            response = await page.evaluate(f"""
                async () => {{
                    const res = await fetch('/api/courses', {{
                        headers: {{ 'Authorization': 'Bearer {token}' }}
                    }});
                    return await res.json();
                }}
            """)
            
            if response.get('code') == 200:
                courses = response.get('data', [])
                print(f"   ✅ 课程API正常，返回 {len(courses)} 个课程")
            else:
                print(f"   ❌ 课程API失败: {response}")
            
            # 6. 测试新闻API
            print("\n6️⃣ 测试新闻API...")
            response = await page.evaluate(f"""
                async () => {{
                    const res = await fetch('/api/news', {{
                        headers: {{ 'Authorization': 'Bearer {token}' }}
                    }});
                    return await res.json();
                }}
            """)
            
            if response.get('code') == 200:
                news = response.get('data', [])
                print(f"   ✅ 新闻API正常，返回 {len(news)} 条新闻")
            else:
                print(f"   ❌ 新闻API失败: {response}")
            
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(test_api_endpoints())
