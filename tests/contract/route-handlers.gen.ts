/**
 * 自动生成（scripts/gen-route-inventory.mjs）—— 静态 import 全部路由 handler。
 * 目的：让 TS 静态解析路由模块，避免动态 import 造成的类型与打包问题。
 * 禁止手改；运行 node src/lib/__tests__/api-contract/gen-route-inventory.mjs 重新生成。
 */
/* eslint-disable */
import { POST as _apply_POST } from "../../src/app/api/apply/route";
import { GET as _articles__id_GET, PUT as _articles__id_PUT, DELETE as _articles__id_DELETE, PATCH as _articles__id_PATCH } from "../../src/app/api/articles/[id]/route";
import { GET as _articles_GET, POST as _articles_POST } from "../../src/app/api/articles/route";
import { POST as _auth_login_POST } from "../../src/app/api/auth/login/route";
import { POST as _auth_logout_POST } from "../../src/app/api/auth/logout/route";
import { GET as _auth_me_GET } from "../../src/app/api/auth/me/route";
import { POST as _auth_refresh_POST } from "../../src/app/api/auth/refresh/route";
import { GET as _banners__id_GET, PUT as _banners__id_PUT, DELETE as _banners__id_DELETE } from "../../src/app/api/banners/[id]/route";
import { GET as _banners_GET, POST as _banners_POST } from "../../src/app/api/banners/route";
import { GET as _campus_images__id_GET, PUT as _campus_images__id_PUT, DELETE as _campus_images__id_DELETE } from "../../src/app/api/campus-images/[id]/route";
import { GET as _campus_images_GET, POST as _campus_images_POST } from "../../src/app/api/campus-images/route";
import { PUT as _campus__id_images__imageId_PUT, DELETE as _campus__id_images__imageId_DELETE } from "../../src/app/api/campus/[id]/images/[imageId]/route";
import { GET as _campus__id_images_GET, POST as _campus__id_images_POST } from "../../src/app/api/campus/[id]/images/route";
import { GET as _campus__id_GET, PUT as _campus__id_PUT, DELETE as _campus__id_DELETE } from "../../src/app/api/campus/[id]/route";
import { GET as _campus_GET, POST as _campus_POST } from "../../src/app/api/campus/route";
import { GET as _categories__id_GET, PUT as _categories__id_PUT, DELETE as _categories__id_DELETE } from "../../src/app/api/categories/[id]/route";
import { GET as _categories_GET, POST as _categories_POST } from "../../src/app/api/categories/route";
import { GET as _chat_history__id_GET, DELETE as _chat_history__id_DELETE } from "../../src/app/api/chat-history/[id]/route";
import { GET as _chat_history_GET } from "../../src/app/api/chat-history/route";
import { GET as _chat_scenes__id_GET, PUT as _chat_scenes__id_PUT, DELETE as _chat_scenes__id_DELETE } from "../../src/app/api/chat-scenes/[id]/route";
import { GET as _chat_scenes_GET, POST as _chat_scenes_POST } from "../../src/app/api/chat-scenes/route";
import { POST as _chat_stream_POST } from "../../src/app/api/chat/stream/route";
import { PATCH as _collect_items__id_PATCH } from "../../src/app/api/collect-items/[id]/route";
import { GET as _collect_items_GET } from "../../src/app/api/collect-items/route";
import { GET as _collect_sources__id_GET, PUT as _collect_sources__id_PUT, DELETE as _collect_sources__id_DELETE } from "../../src/app/api/collect-sources/[id]/route";
import { POST as _collect_sources__id_run_POST } from "../../src/app/api/collect-sources/[id]/run/route";
import { POST as _collect_sources__id_test_POST } from "../../src/app/api/collect-sources/[id]/test/route";
import { GET as _collect_sources_GET, POST as _collect_sources_POST } from "../../src/app/api/collect-sources/route";
import { GET as _collect_tasks_GET } from "../../src/app/api/collect-tasks/route";
import { GET as _content_blocks__id_GET, PUT as _content_blocks__id_PUT, DELETE as _content_blocks__id_DELETE } from "../../src/app/api/content-blocks/[id]/route";
import { GET as _content_blocks_GET, POST as _content_blocks_POST } from "../../src/app/api/content-blocks/route";
import { POST as _content_items__id_review_POST } from "../../src/app/api/content-items/[id]/review/route";
import { GET as _content_items__id_GET, PUT as _content_items__id_PUT, DELETE as _content_items__id_DELETE } from "../../src/app/api/content-items/[id]/route";
import { GET as _content_items_GET, POST as _content_items_POST } from "../../src/app/api/content-items/route";
import { GET as _courses__id_GET, PUT as _courses__id_PUT, DELETE as _courses__id_DELETE } from "../../src/app/api/courses/[id]/route";
import { GET as _courses_GET, POST as _courses_POST } from "../../src/app/api/courses/route";
import { GET as _element_configs__id_GET, PUT as _element_configs__id_PUT, DELETE as _element_configs__id_DELETE } from "../../src/app/api/element-configs/[id]/route";
import { GET as _element_configs_GET, POST as _element_configs_POST } from "../../src/app/api/element-configs/route";
import { GET as _enrollment_offerings__id_GET, PUT as _enrollment_offerings__id_PUT, DELETE as _enrollment_offerings__id_DELETE } from "../../src/app/api/enrollment-offerings/[id]/route";
import { GET as _enrollment_offerings_GET, POST as _enrollment_offerings_POST } from "../../src/app/api/enrollment-offerings/route";
import { GET as _gallery__id_GET, PUT as _gallery__id_PUT, DELETE as _gallery__id_DELETE } from "../../src/app/api/gallery/[id]/route";
import { GET as _gallery_GET, POST as _gallery_POST } from "../../src/app/api/gallery/route";
import { GET as _home_blocks_registry_GET } from "../../src/app/api/home-blocks/registry/route";
import { POST as _home_blocks_reset_POST } from "../../src/app/api/home-blocks/reset/route";
import { GET as _home_cards__id_GET, PUT as _home_cards__id_PUT, DELETE as _home_cards__id_DELETE } from "../../src/app/api/home-cards/[id]/route";
import { GET as _home_cards_GET, POST as _home_cards_POST } from "../../src/app/api/home-cards/route";
import { GET as _hot_majors__id_GET, PUT as _hot_majors__id_PUT, DELETE as _hot_majors__id_DELETE } from "../../src/app/api/hot-majors/[id]/route";
import { GET as _hot_majors_GET, POST as _hot_majors_POST } from "../../src/app/api/hot-majors/route";
import { POST as _kb_test_POST } from "../../src/app/api/kb/test/route";
import { GET as _knowledge_bases__id_export_GET } from "../../src/app/api/knowledge-bases/[id]/export/route";
import { POST as _knowledge_bases__id_rebuild_POST } from "../../src/app/api/knowledge-bases/[id]/rebuild/route";
import { GET as _knowledge_bases__id_GET, PUT as _knowledge_bases__id_PUT, DELETE as _knowledge_bases__id_DELETE } from "../../src/app/api/knowledge-bases/[id]/route";
import { GET as _knowledge_bases__id_stats_GET } from "../../src/app/api/knowledge-bases/[id]/stats/route";
import { GET as _knowledge_bases_GET, POST as _knowledge_bases_POST } from "../../src/app/api/knowledge-bases/route";
import { POST as _knowledge_bases_sync_POST } from "../../src/app/api/knowledge-bases/sync/route";
import { PATCH as _knowledge_files__id_chunks__chunkId_PATCH } from "../../src/app/api/knowledge-files/[id]/chunks/[chunkId]/route";
import { GET as _knowledge_files__id_progress_GET } from "../../src/app/api/knowledge-files/[id]/progress/route";
import { POST as _knowledge_files__id_reparse_POST } from "../../src/app/api/knowledge-files/[id]/reparse/route";
import { GET as _knowledge_files__id_GET, PUT as _knowledge_files__id_PUT, DELETE as _knowledge_files__id_DELETE } from "../../src/app/api/knowledge-files/[id]/route";
import { POST as _knowledge_files_batch_POST } from "../../src/app/api/knowledge-files/batch/route";
import { GET as _knowledge_files_GET, POST as _knowledge_files_POST } from "../../src/app/api/knowledge-files/route";
import { POST as _knowledge_files_trash_POST } from "../../src/app/api/knowledge-files/trash/route";
import { GET as _knowledge__id_GET, PUT as _knowledge__id_PUT, DELETE as _knowledge__id_DELETE } from "../../src/app/api/knowledge/[id]/route";
import { GET as _knowledge_GET, POST as _knowledge_POST } from "../../src/app/api/knowledge/route";
import { POST as _llm_providers__id_balance_POST } from "../../src/app/api/llm/providers/[id]/balance/route";
import { GET as _llm_providers__id_GET, PUT as _llm_providers__id_PUT, DELETE as _llm_providers__id_DELETE } from "../../src/app/api/llm/providers/[id]/route";
import { POST as _llm_providers__id_test_POST } from "../../src/app/api/llm/providers/[id]/test/route";
import { PUT as _llm_providers_order_PUT, PATCH as _llm_providers_order_PATCH } from "../../src/app/api/llm/providers/order/route";
import { GET as _llm_providers_GET, POST as _llm_providers_POST } from "../../src/app/api/llm/providers/route";
import { GET as _llm_usage_GET } from "../../src/app/api/llm/usage/route";
import { GET as _logs_GET } from "../../src/app/api/logs/route";
import { GET as _majors__id_GET, PUT as _majors__id_PUT, DELETE as _majors__id_DELETE } from "../../src/app/api/majors/[id]/route";
import { GET as _majors_GET, POST as _majors_POST } from "../../src/app/api/majors/route";
import { GET as _manager_menus_GET } from "../../src/app/api/manager-menus/route";
import { GET as _manager_dashboard_GET } from "../../src/app/api/manager/dashboard/route";
import { GET as _media__id_GET, DELETE as _media__id_DELETE, PATCH as _media__id_PATCH } from "../../src/app/api/media/[id]/route";
import { POST as _media_batch_POST } from "../../src/app/api/media/batch/route";
import { GET as _media_GET } from "../../src/app/api/media/route";
import { GET as _navigations__id_GET, PUT as _navigations__id_PUT, DELETE as _navigations__id_DELETE } from "../../src/app/api/navigations/[id]/route";
import { POST as _navigations_POST } from "../../src/app/api/navigations/route";
import { GET as _notify_recipients__id_GET, PUT as _notify_recipients__id_PUT, DELETE as _notify_recipients__id_DELETE } from "../../src/app/api/notify-recipients/[id]/route";
import { GET as _notify_recipients_GET, POST as _notify_recipients_POST } from "../../src/app/api/notify-recipients/route";
import { GET as _notify_records_GET } from "../../src/app/api/notify-records/route";
import { PATCH as _notify_rules__id_PATCH } from "../../src/app/api/notify-rules/[id]/route";
import { GET as _notify_rules_GET } from "../../src/app/api/notify-rules/route";
import { GET as _notify_templates__id_GET, PUT as _notify_templates__id_PUT, DELETE as _notify_templates__id_DELETE } from "../../src/app/api/notify-templates/[id]/route";
import { GET as _notify_templates_GET, POST as _notify_templates_POST } from "../../src/app/api/notify-templates/route";
import { GET as _page_templates__id_GET, PUT as _page_templates__id_PUT, DELETE as _page_templates__id_DELETE } from "../../src/app/api/page-templates/[id]/route";
import { GET as _page_templates_GET, POST as _page_templates_POST } from "../../src/app/api/page-templates/route";
import { GET as _partners__id_GET, PUT as _partners__id_PUT, DELETE as _partners__id_DELETE } from "../../src/app/api/partners/[id]/route";
import { GET as _partners_GET, POST as _partners_POST } from "../../src/app/api/partners/route";
import { POST as _publish_jobs__id_cancel_POST } from "../../src/app/api/publish-jobs/[id]/cancel/route";
import { POST as _publish_jobs__id_retry_POST } from "../../src/app/api/publish-jobs/[id]/retry/route";
import { GET as _publish_jobs__id_GET, PUT as _publish_jobs__id_PUT, DELETE as _publish_jobs__id_DELETE } from "../../src/app/api/publish-jobs/[id]/route";
import { GET as _publish_jobs_GET, POST as _publish_jobs_POST } from "../../src/app/api/publish-jobs/route";
import { GET as _roles__id_GET, PUT as _roles__id_PUT, DELETE as _roles__id_DELETE } from "../../src/app/api/roles/[id]/route";
import { GET as _roles_GET, POST as _roles_POST } from "../../src/app/api/roles/route";
import { GET as _service_guides__id_GET, PUT as _service_guides__id_PUT, DELETE as _service_guides__id_DELETE } from "../../src/app/api/service-guides/[id]/route";
import { GET as _service_guides_GET, POST as _service_guides_POST } from "../../src/app/api/service-guides/route";
import { GET as _settings_definitions_GET } from "../../src/app/api/settings/definitions/route";
import { POST as _settings_email_test_POST } from "../../src/app/api/settings/email/test/route";
import { GET as _settings_GET, PUT as _settings_PUT } from "../../src/app/api/settings/route";
import { GET as _students__id_GET, PUT as _students__id_PUT, DELETE as _students__id_DELETE } from "../../src/app/api/students/[id]/route";
import { GET as _students_GET, POST as _students_POST } from "../../src/app/api/students/route";
import { GET as _tags__id_GET, PUT as _tags__id_PUT, DELETE as _tags__id_DELETE } from "../../src/app/api/tags/[id]/route";
import { GET as _tags_GET, POST as _tags_POST } from "../../src/app/api/tags/route";
import { GET as _template_blocks__id_GET, PUT as _template_blocks__id_PUT, DELETE as _template_blocks__id_DELETE } from "../../src/app/api/template-blocks/[id]/route";
import { GET as _template_blocks_GET, POST as _template_blocks_POST } from "../../src/app/api/template-blocks/route";
import { GET as _user_actions_GET, POST as _user_actions_POST } from "../../src/app/api/user-actions/route";
import { GET as _users__id_GET, PUT as _users__id_PUT, DELETE as _users__id_DELETE } from "../../src/app/api/users/[id]/route";
import { GET as _users_GET, POST as _users_POST } from "../../src/app/api/users/route";
import { GET as _wechat_accounts__id_GET, PUT as _wechat_accounts__id_PUT, DELETE as _wechat_accounts__id_DELETE } from "../../src/app/api/wechat/accounts/[id]/route";
import { POST as _wechat_accounts__id_test_POST } from "../../src/app/api/wechat/accounts/[id]/test/route";
import { GET as _wechat_accounts_GET, POST as _wechat_accounts_POST } from "../../src/app/api/wechat/accounts/route";

/** 路径 → { 方法: handler } 映射（仅包含导出了 HTTP 方法的 route） */
export const routeHandlers: Record<
  string,
  Partial<Record<"GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS", (...args: any[]) => Promise<Response> | Response>>
> = {
  "/apply": { POST: _apply_POST },
  "/articles/:id": { GET: _articles__id_GET, PUT: _articles__id_PUT, DELETE: _articles__id_DELETE, PATCH: _articles__id_PATCH },
  "/articles": { GET: _articles_GET, POST: _articles_POST },
  "/auth/login": { POST: _auth_login_POST },
  "/auth/logout": { POST: _auth_logout_POST },
  "/auth/me": { GET: _auth_me_GET },
  "/auth/refresh": { POST: _auth_refresh_POST },
  "/banners/:id": { GET: _banners__id_GET, PUT: _banners__id_PUT, DELETE: _banners__id_DELETE },
  "/banners": { GET: _banners_GET, POST: _banners_POST },
  "/campus-images/:id": { GET: _campus_images__id_GET, PUT: _campus_images__id_PUT, DELETE: _campus_images__id_DELETE },
  "/campus-images": { GET: _campus_images_GET, POST: _campus_images_POST },
  "/campus/:id/images/:imageId": { PUT: _campus__id_images__imageId_PUT, DELETE: _campus__id_images__imageId_DELETE },
  "/campus/:id/images": { GET: _campus__id_images_GET, POST: _campus__id_images_POST },
  "/campus/:id": { GET: _campus__id_GET, PUT: _campus__id_PUT, DELETE: _campus__id_DELETE },
  "/campus": { GET: _campus_GET, POST: _campus_POST },
  "/categories/:id": { GET: _categories__id_GET, PUT: _categories__id_PUT, DELETE: _categories__id_DELETE },
  "/categories": { GET: _categories_GET, POST: _categories_POST },
  "/chat-history/:id": { GET: _chat_history__id_GET, DELETE: _chat_history__id_DELETE },
  "/chat-history": { GET: _chat_history_GET },
  "/chat-scenes/:id": { GET: _chat_scenes__id_GET, PUT: _chat_scenes__id_PUT, DELETE: _chat_scenes__id_DELETE },
  "/chat-scenes": { GET: _chat_scenes_GET, POST: _chat_scenes_POST },
  "/chat/stream": { POST: _chat_stream_POST },
  "/collect-items/:id": { PATCH: _collect_items__id_PATCH },
  "/collect-items": { GET: _collect_items_GET },
  "/collect-sources/:id": { GET: _collect_sources__id_GET, PUT: _collect_sources__id_PUT, DELETE: _collect_sources__id_DELETE },
  "/collect-sources/:id/run": { POST: _collect_sources__id_run_POST },
  "/collect-sources/:id/test": { POST: _collect_sources__id_test_POST },
  "/collect-sources": { GET: _collect_sources_GET, POST: _collect_sources_POST },
  "/collect-tasks": { GET: _collect_tasks_GET },
  "/content-blocks/:id": { GET: _content_blocks__id_GET, PUT: _content_blocks__id_PUT, DELETE: _content_blocks__id_DELETE },
  "/content-blocks": { GET: _content_blocks_GET, POST: _content_blocks_POST },
  "/content-items/:id/review": { POST: _content_items__id_review_POST },
  "/content-items/:id": { GET: _content_items__id_GET, PUT: _content_items__id_PUT, DELETE: _content_items__id_DELETE },
  "/content-items": { GET: _content_items_GET, POST: _content_items_POST },
  "/courses/:id": { GET: _courses__id_GET, PUT: _courses__id_PUT, DELETE: _courses__id_DELETE },
  "/courses": { GET: _courses_GET, POST: _courses_POST },
  "/element-configs/:id": { GET: _element_configs__id_GET, PUT: _element_configs__id_PUT, DELETE: _element_configs__id_DELETE },
  "/element-configs": { GET: _element_configs_GET, POST: _element_configs_POST },
  "/enrollment-offerings/:id": { GET: _enrollment_offerings__id_GET, PUT: _enrollment_offerings__id_PUT, DELETE: _enrollment_offerings__id_DELETE },
  "/enrollment-offerings": { GET: _enrollment_offerings_GET, POST: _enrollment_offerings_POST },
  "/gallery/:id": { GET: _gallery__id_GET, PUT: _gallery__id_PUT, DELETE: _gallery__id_DELETE },
  "/gallery": { GET: _gallery_GET, POST: _gallery_POST },
  "/home-blocks/registry": { GET: _home_blocks_registry_GET },
  "/home-blocks/reset": { POST: _home_blocks_reset_POST },
  "/home-cards/:id": { GET: _home_cards__id_GET, PUT: _home_cards__id_PUT, DELETE: _home_cards__id_DELETE },
  "/home-cards": { GET: _home_cards_GET, POST: _home_cards_POST },
  "/hot-majors/:id": { GET: _hot_majors__id_GET, PUT: _hot_majors__id_PUT, DELETE: _hot_majors__id_DELETE },
  "/hot-majors": { GET: _hot_majors_GET, POST: _hot_majors_POST },
  "/kb/test": { POST: _kb_test_POST },
  "/knowledge-bases/:id/export": { GET: _knowledge_bases__id_export_GET },
  "/knowledge-bases/:id/rebuild": { POST: _knowledge_bases__id_rebuild_POST },
  "/knowledge-bases/:id": { GET: _knowledge_bases__id_GET, PUT: _knowledge_bases__id_PUT, DELETE: _knowledge_bases__id_DELETE },
  "/knowledge-bases/:id/stats": { GET: _knowledge_bases__id_stats_GET },
  "/knowledge-bases": { GET: _knowledge_bases_GET, POST: _knowledge_bases_POST },
  "/knowledge-bases/sync": { POST: _knowledge_bases_sync_POST },
  "/knowledge-files/:id/chunks/:chunkId": { PATCH: _knowledge_files__id_chunks__chunkId_PATCH },
  "/knowledge-files/:id/progress": { GET: _knowledge_files__id_progress_GET },
  "/knowledge-files/:id/reparse": { POST: _knowledge_files__id_reparse_POST },
  "/knowledge-files/:id": { GET: _knowledge_files__id_GET, PUT: _knowledge_files__id_PUT, DELETE: _knowledge_files__id_DELETE },
  "/knowledge-files/batch": { POST: _knowledge_files_batch_POST },
  "/knowledge-files": { GET: _knowledge_files_GET, POST: _knowledge_files_POST },
  "/knowledge-files/trash": { POST: _knowledge_files_trash_POST },
  "/knowledge/:id": { GET: _knowledge__id_GET, PUT: _knowledge__id_PUT, DELETE: _knowledge__id_DELETE },
  "/knowledge": { GET: _knowledge_GET, POST: _knowledge_POST },
  "/llm/providers/:id/balance": { POST: _llm_providers__id_balance_POST },
  "/llm/providers/:id": { GET: _llm_providers__id_GET, PUT: _llm_providers__id_PUT, DELETE: _llm_providers__id_DELETE },
  "/llm/providers/:id/test": { POST: _llm_providers__id_test_POST },
  "/llm/providers/order": { PUT: _llm_providers_order_PUT, PATCH: _llm_providers_order_PATCH },
  "/llm/providers": { GET: _llm_providers_GET, POST: _llm_providers_POST },
  "/llm/usage": { GET: _llm_usage_GET },
  "/logs": { GET: _logs_GET },
  "/majors/:id": { GET: _majors__id_GET, PUT: _majors__id_PUT, DELETE: _majors__id_DELETE },
  "/majors": { GET: _majors_GET, POST: _majors_POST },
  "/manager-menus": { GET: _manager_menus_GET },
  "/manager/dashboard": { GET: _manager_dashboard_GET },
  "/media/:id": { GET: _media__id_GET, DELETE: _media__id_DELETE, PATCH: _media__id_PATCH },
  "/media/batch": { POST: _media_batch_POST },
  "/media": { GET: _media_GET },
  "/navigations/:id": { GET: _navigations__id_GET, PUT: _navigations__id_PUT, DELETE: _navigations__id_DELETE },
  "/navigations": { POST: _navigations_POST },
  "/notify-recipients/:id": { GET: _notify_recipients__id_GET, PUT: _notify_recipients__id_PUT, DELETE: _notify_recipients__id_DELETE },
  "/notify-recipients": { GET: _notify_recipients_GET, POST: _notify_recipients_POST },
  "/notify-records": { GET: _notify_records_GET },
  "/notify-rules/:id": { PATCH: _notify_rules__id_PATCH },
  "/notify-rules": { GET: _notify_rules_GET },
  "/notify-templates/:id": { GET: _notify_templates__id_GET, PUT: _notify_templates__id_PUT, DELETE: _notify_templates__id_DELETE },
  "/notify-templates": { GET: _notify_templates_GET, POST: _notify_templates_POST },
  "/page-templates/:id": { GET: _page_templates__id_GET, PUT: _page_templates__id_PUT, DELETE: _page_templates__id_DELETE },
  "/page-templates": { GET: _page_templates_GET, POST: _page_templates_POST },
  "/partners/:id": { GET: _partners__id_GET, PUT: _partners__id_PUT, DELETE: _partners__id_DELETE },
  "/partners": { GET: _partners_GET, POST: _partners_POST },
  "/publish-jobs/:id/cancel": { POST: _publish_jobs__id_cancel_POST },
  "/publish-jobs/:id/retry": { POST: _publish_jobs__id_retry_POST },
  "/publish-jobs/:id": { GET: _publish_jobs__id_GET, PUT: _publish_jobs__id_PUT, DELETE: _publish_jobs__id_DELETE },
  "/publish-jobs": { GET: _publish_jobs_GET, POST: _publish_jobs_POST },
  "/roles/:id": { GET: _roles__id_GET, PUT: _roles__id_PUT, DELETE: _roles__id_DELETE },
  "/roles": { GET: _roles_GET, POST: _roles_POST },
  "/service-guides/:id": { GET: _service_guides__id_GET, PUT: _service_guides__id_PUT, DELETE: _service_guides__id_DELETE },
  "/service-guides": { GET: _service_guides_GET, POST: _service_guides_POST },
  "/settings/definitions": { GET: _settings_definitions_GET },
  "/settings/email/test": { POST: _settings_email_test_POST },
  "/settings": { GET: _settings_GET, PUT: _settings_PUT },
  "/students/:id": { GET: _students__id_GET, PUT: _students__id_PUT, DELETE: _students__id_DELETE },
  "/students": { GET: _students_GET, POST: _students_POST },
  "/tags/:id": { GET: _tags__id_GET, PUT: _tags__id_PUT, DELETE: _tags__id_DELETE },
  "/tags": { GET: _tags_GET, POST: _tags_POST },
  "/template-blocks/:id": { GET: _template_blocks__id_GET, PUT: _template_blocks__id_PUT, DELETE: _template_blocks__id_DELETE },
  "/template-blocks": { GET: _template_blocks_GET, POST: _template_blocks_POST },
  "/user-actions": { GET: _user_actions_GET, POST: _user_actions_POST },
  "/users/:id": { GET: _users__id_GET, PUT: _users__id_PUT, DELETE: _users__id_DELETE },
  "/users": { GET: _users_GET, POST: _users_POST },
  "/wechat/accounts/:id": { GET: _wechat_accounts__id_GET, PUT: _wechat_accounts__id_PUT, DELETE: _wechat_accounts__id_DELETE },
  "/wechat/accounts/:id/test": { POST: _wechat_accounts__id_test_POST },
  "/wechat/accounts": { GET: _wechat_accounts_GET, POST: _wechat_accounts_POST },
};
