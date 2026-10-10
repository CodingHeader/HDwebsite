from playwright.sync_api import sync_playwright
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_manager_pages():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 900})

        # 1. 登录
        print("=== 测试登录 ===")
        page.goto('http://localhost:6789/manager/login')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='screenshots/01_login.png')

        # 填写登录表单
        page.fill('input[placeholder="请输入用户名"]', 'admin')
        page.fill('input[placeholder="请输入密码"]', 'admin123')
        page.click('button:has-text("登录")')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)
        page.screenshot(path='screenshots/02_after_login.png')
        print("登录完成")

        # 2. 测试用户管理页面
        print("\n=== 测试用户管理页面 ===")
        page.goto('http://localhost:6789/manager/users')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)
        page.screenshot(path='screenshots/03_users_page.png', full_page=True)

        # 检查是否有"新增用户"按钮
        add_btn = page.locator('button:has-text("新增用户")')
        if add_btn.count() > 0:
            print("[OK] 找到'新增用户'按钮")
            add_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path='screenshots/04_users_add_dialog.png')

            # 关闭弹窗
            page.click('button:has-text("取消")')
            page.wait_for_timeout(500)
        else:
            print("[FAIL] 未找到'新增用户'按钮")

        # 检查是否有编辑按钮
        edit_btns = page.locator('button[title="编辑"]')
        if edit_btns.count() > 0:
            print(f"[OK] 找到 {edit_btns.count()} 个编辑按钮")
            edit_btns.first.click()
            page.wait_for_timeout(1000)
            page.screenshot(path='screenshots/05_users_edit_dialog.png')
            page.click('button:has-text("取消")')
            page.wait_for_timeout(500)
        else:
            print("[FAIL] 未找到编辑按钮")

        # 检查表格文字颜色
        table_cells = page.locator('table tbody td').all()
        print(f"表格单元格数量: {len(table_cells)}")

        # 3. 测试首页卡片管理页面
        print("\n=== 测试首页卡片管理页面 ===")
        page.goto('http://localhost:6789/manager/home-cards')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)
        page.screenshot(path='screenshots/06_homecards_page.png', full_page=True)

        # 检查是否有"新增卡片"按钮
        add_card_btn = page.locator('button:has-text("新增卡片")')
        if add_card_btn.count() > 0:
            print("[OK] 找到'新增卡片'按钮")
            add_card_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path='screenshots/07_homecards_add_dialog.png')
            page.click('button:has-text("取消")')
            page.wait_for_timeout(500)
        else:
            print("[FAIL] 未找到'新增卡片'按钮")

        # 4. 测试导航管理页面
        print("\n=== 测试导航管理页面 ===")
        page.goto('http://localhost:6789/manager/navigations')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)
        page.screenshot(path='screenshots/08_navigations_page.png', full_page=True)

        # 检查标题文字颜色
        nav_titles = page.locator('span.font-medium.truncate').all()
        print(f"导航标题数量: {len(nav_titles)}")
        for i, title in enumerate(nav_titles[:3]):
            text = title.text_content()
            print(f"  标题 {i+1}: {text}")

        # 5. 测试合作伙伴页面
        print("\n=== 测试合作伙伴页面 ===")
        page.goto('http://localhost:6789/manager/partners')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)
        page.screenshot(path='screenshots/09_partners_page.png', full_page=True)

        # 6. 测试日志页面
        print("\n=== 测试日志页面 ===")
        page.goto('http://localhost:6789/manager/logs')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)
        page.screenshot(path='screenshots/10_logs_page.png', full_page=True)

        # 7. 测试媒体库页面
        print("\n=== 测试媒体库页面 ===")
        page.goto('http://localhost:6789/manager/media')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1500)
        page.screenshot(path='screenshots/11_media_page.png', full_page=True)

        browser.close()
        print("\n=== 所有测试完成 ===")

if __name__ == '__main__':
    test_manager_pages()
