/**
 * 对话日志功能测试脚本
 * 测试API端点是否正常工作
 */

const BASE_URL = "http://localhost:6789";

async function testConversationAPI() {
  console.log("🧪 测试对话日志功能...\n");

  try {
    // 测试1: 创建对话
    console.log("1️⃣ 测试创建对话...");
    const createResponse = await fetch(`${BASE_URL}/api/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: "test_session_001",
        userId: "test_user",
        userName: "测试用户",
        ipAddress: "127.0.0.1",
        userAgent: "Test Agent",
        pageUrl: "/test",
        pageTitle: "测试页面",
        summary: "测试对话摘要",
        messages: [
          {
            role: "user",
            content: "你好，这是一个测试消息",
          },
          {
            role: "assistant",
            content: "你好！这是AI助手的回复",
          },
        ],
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`创建失败: ${createResponse.status}`);
    }

    const createResult = await createResponse.json();
    console.log("✅ 创建对话成功:", createResult.data.id);
    const conversationId = createResult.data.id;

    // 测试2: 查询列表
    console.log("\n2️⃣ 测试查询对话列表...");
    const listResponse = await fetch(
      `${BASE_URL}/api/conversations?page=1&pageSize=10`,
      {
        headers: {
          Authorization: "Bearer test_token",
        },
      }
    );

    if (listResponse.status === 401) {
      console.log("⚠️  鉴权正常（返回401未授权）");
    } else if (listResponse.ok) {
      const listResult = await listResponse.json();
      console.log("✅ 查询列表成功, 总数:", listResult.data.pagination.total);
    }

    // 测试3: 查询详情
    console.log("\n3️⃣ 测试查询对话详情...");
    const detailResponse = await fetch(
      `${BASE_URL}/api/conversations/${conversationId}`,
      {
        headers: {
          Authorization: "Bearer test_token",
        },
      }
    );

    if (detailResponse.status === 401) {
      console.log("⚠️  鉴权正常（返回401未授权）");
    } else if (detailResponse.ok) {
      const detailResult = await detailResponse.json();
      console.log("✅ 查询详情成功, 消息数:", detailResult.data.messages.length);
    }

    // 测试4: 删除对话
    console.log("\n4️⃣ 测试删除对话...");
    const deleteResponse = await fetch(
      `${BASE_URL}/api/conversations/${conversationId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer test_token",
        },
      }
    );

    if (deleteResponse.status === 401) {
      console.log("⚠️  鉴权正常（返回401未授权）");
    } else if (deleteResponse.ok) {
      console.log("✅ 删除对话成功");
    }

    console.log("\n✨ 所有测试完成！");
    return true;
  } catch (error) {
    console.error("\n❌ 测试失败:", error.message);
    return false;
  }
}

// 检查服务是否运行
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}

// 主函数
async function main() {
  console.log("🔍 检查服务状态...");
  const isRunning = await checkServer();

  if (!isRunning) {
    console.log("⚠️  服务未运行，请先启动服务: npm run start");
    process.exit(1);
  }

  console.log("✅ 服务运行中\n");
  await testConversationAPI();
}

main();
