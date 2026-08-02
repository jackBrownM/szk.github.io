---
title: LangChain 入门笔记
date: 2026-08-02 12:00:00
tags:
  - LangChain
  - AI
categories:
  - ai
---

# Langchain

## 一、LangChain 是什么？

**一句话**：LangChain 是一个**用 Python/JS 构建 LLM 应用**的开源框架，帮你快速把大模型接入到实际业务中。

**大白话**：你想让 GPT/Claude 帮你查数据库、搜网页、发邮件、读文档？LangChain 就是把这些能力"拼装"起来的工具箱。

### 核心定位

| 阶段 | 工具 | 作用 |
| --- | --- | --- |
| **开发** | LangChain | 组件拼装，快速构建 |
| **编排** | LangGraph | 复杂流程控制，多步骤 Agent |
| **监控** | LangSmith | 追踪、调试、评估 |
| **部署** | LangGraph Platform | 一键部署为生产 API |

### 架构组成

```
langchain-core        → 基础抽象（消息、模型接口）
langchain             → 上层封装（Agent、链、检索）
langchain-community   → 社区集成（各种第三方工具）
langchain-openai 等   → 官方集成包（OpenAI、Anthropic…）
langgraph             → Agent 编排运行时
```

---

## 二、模型（Models）—— Agent 的大脑

### 2.1 初始化模型

**最简单的方式**：用 `init_chat_model`，一行搞定：

```python
from langchain.chat_models import init_chat_model

# 方式1：字符串格式 "提供商:模型名"
model = init_chat_model("openai:gpt-4o")
model = init_chat_model("anthropic:claude-sonnet-4-5")

# 方式2：直接用提供商包
from langchain_openai import ChatOpenAI
model = ChatOpenAI(model="gpt-4o", temperature=0.1, max_tokens=1000)
```

### 2.2 模型能力

| 能力 | 说明 |
| --- | --- |
| **文本生成** | 基本的问答、写作 |
| **工具调用** | 调用外部 API/数据库，返回结构化结果 |
| **结构化输出** | 强制输出 JSON/Pydantic 格式 |
| **多模态** | 处理图片、音频、视频 |
| **推理** | 多步推理得出结论 |

### 2.3 调用模型

```python
# 简单文本
response = model.invoke("你好，世界！")

# 消息列表（更常用）
from langchain.messages import SystemMessage, HumanMessage
messages = [
    SystemMessage("你是一个Python专家"),
    HumanMessage("什么是装饰器？"),
]
response = model.invoke(messages)

# 字典格式（兼容 OpenAI 风格）
messages = [
    {"role": "system", "content": "你是Python专家"},
    {"role": "user", "content": "什么是装饰器？"},
]
response = model.invoke(messages)
```

---

## 三、消息（Messages）—— 对话的基本单位

### 3.1 四种消息类型

| 类型 | 类名 | 作用 | 比喻 |
| --- | --- | --- | --- |
| **系统消息** | `SystemMessage` | 告诉模型"你是谁、怎么做" | 给员工的岗位说明书 |
| **人类消息** | `HumanMessage` | 用户说的话 | 客户的需求 |
| **AI消息** | `AIMessage` | 模型的回复 | 员工的回答 |
| **工具消息** | `ToolMessage` | 工具执行的结果 | 查完数据后的报告 |

### 3.2 使用示例

```python
from langchain.messages import SystemMessage, HumanMessage, AIMessage

messages = [
    SystemMessage("你是诗歌专家"),
    HumanMessage("写一首关于春天的诗"),
    AIMessage("春风拂柳绿..."),      # 上一轮模型回复
    HumanMessage("再写一首关于秋天的"),  # 新的用户输入
]
response = model.invoke(messages)
```

---

## 四、工具（Tools）—— Agent 的手和脚

**大白话**：模型光会"想"没用，还得"动手"。工具就是让模型能操作外部世界的能力。

### 4.1 创建工具

**最简单：用 `@tool` 装饰器**

```python
from langchain.tools import tool

@tool
def search_database(query: str, limit: int = 10) -> str:
    """搜索客户数据库，返回匹配记录。
    Args:
        query: 搜索关键词
        limit: 最大返回数量
    """
    return f"找到 {limit} 条关于 '{query}' 的结果"
```

**要点**：

- **类型提示必须有**（定义输入格式）
- **docstring 很重要**（模型根据它决定什么时候用这个工具）

### 4.2 自定义工具名称和描述

```python
@tool("web_search", description="搜索互联网信息，用于回答实时问题")
def search(query: str) -> str:
    """搜索网页"""
    return f"搜索结果: {query}"
```

### 4.3 高级：用 Pydantic 定义复杂输入

```python
from pydantic import BaseModel, Field

class WeatherInput(BaseModel):
    """天气查询参数"""
    location: str = Field(description="城市名称")
    unit: str = Field(default="celsius", description="温度单位")

@tool(args_schema=WeatherInput)
def get_weather(location: str, unit: str = "celsius") -> str:
    """获取指定城市的天气"""
    return f"{location} 今天 25°{unit[0].upper()}"
```

---

## 五、智能体（Agents）—— 核心中的核心

### 5.1 什么是 Agent？

**大白话**：Agent = **模型 + 工具 + 循环**。模型负责"想"，工具负责"做"，循环保证"想完就做，做完再想，直到搞定"。

```
用户提问 → 模型思考 → 需要查资料？→ 调用工具 → 拿到结果 → 继续思考 → 给出答案
                              ↑                              |
                              └──────────────────────────────┘
```

### 5.2 创建 Agent（10行代码搞定）

```python
from langchain.agents import create_agent
from langchain.tools import tool

@tool
def get_weather(city: str) -> str:
    """获取指定城市的天气"""
    return f"{city} 天气晴朗，25°C"

agent = create_agent(
    model="openai:gpt-4o",
    tools=[get_weather],
    system_prompt="你是一个乐于助人的助手"
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "北京天气怎么样？"}]}
)
```

### 5.3 动态模型选择

根据场景自动切换便宜/贵的模型：

```python
from langchain.agents.middleware import wrap_model_call, ModelRequest, ModelResponse

@wrap_model_call
def smart_model_switch(request: ModelRequest, handler) -> ModelResponse:
    """对话超过10轮用高级模型，否则用便宜的"""
    if len(request.state["messages"]) > 10:
        request.model = advanced_model
    else:
        request.model = basic_model
    return handler(request)

agent = create_agent(model=basic_model, tools=tools, middleware=[smart_model_switch])
```

---

## 六、结构化输出（Structured Output）

**大白话**：不想要模型给你一大段文字，而是要**固定格式的 JSON**？用结构化输出。

```python
from pydantic import BaseModel, Field
from langchain.agents import create_agent

class ContactInfo(BaseModel):
    """联系人信息"""
    name: str = Field(description="姓名")
    email: str = Field(description="邮箱")
    phone: str = Field(description="电话")

agent = create_agent(
    model="openai:gpt-4o",
    tools=tools,
    response_format=ContactInfo  # 自动选择最佳策略
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "查找张三的联系方式"}]}
)
# result["structured_response"] → ContactInfo 对象
```

**两种策略**：

| 策略 | 说明 | 适用 |
| --- | --- | --- |
| `ProviderStrategy` | 用模型原生的结构化输出 | OpenAI、Grok |
| `ToolStrategy` | 用工具调用模拟结构化输出 | 其他所有模型 |

---

## 七、检索（Retrieval）与 RAG

### 7.1 为什么需要 RAG？

LLM 有两个硬伤：

1. **上下文有限** —— 不能一次吃掉整个文档库
2. **知识过时** —— 训练数据有截止日期

**RAG（检索增强生成）** = 先搜相关文档 → 塞给模型 → 模型基于文档回答

### 7.2 RAG 流水线

```
数据源 → 文档加载器 → 文本切分 → 转成向量 → 存入向量库
                                                    ↓
用户提问 → 查询向量 → 检索相似文档 → 塞给LLM → 生成答案
```

### 7.3 核心组件

| 组件 | 作用 | 比喻 |
| --- | --- | --- |
| **文档加载器** | 从各种来源读数据 | 图书管理员去各地搬书 |
| **文本切分器** | 把长文档切成小块 | 把厚书拆成章节 |
| **嵌入模型** | 把文字变成数字向量 | 给每段话画个"指纹" |
| **向量存储** | 存储和搜索向量 | 智能图书馆 |
| **检索器** | 根据查询找相关文档 | 图书馆搜索系统 |

### 7.4 三种 RAG 架构

| 架构 | 特点 | 适用场景 |
| --- | --- | --- |
| **2步RAG** | 先搜后答，简单可预测 | FAQ、文档机器人 |
| **Agentic RAG** | Agent 自己决定何时搜、搜什么 | 研究助理、复杂问答 |
| **混合RAG** | 结合两者 + 验证步骤 | 领域专业问答 |

### 7.5 Agentic RAG 示例

```python
# Agent 自己决定要不要查资料
agent = create_agent(
    model="openai:gpt-4o",
    tools=[search_knowledge_base, web_search],  # 给Agent搜索工具
    system_prompt="先检索相关资料再回答问题"
)
```

---

## 八、记忆系统（Memory）

### 8.1 短期记忆 —— 记住本次对话

**大白话**：让 Agent 记住"你5分钟前说了什么"。

```python
from langchain.agents import create_agent
from langgraph.checkpoint.memory import InMemorySaver

agent = create_agent(
    "openai:gpt-4o",
    tools=[...],
    checkpointer=InMemorySaver()  # 加上这个就有记忆了
)

# 同一个 thread_id = 同一个对话
agent.invoke(
    {"messages": [{"role": "user", "content": "我叫小明"}]},
    {"configurable": {"thread_id": "对话1"}},
)
agent.invoke(
    {"messages": [{"role": "user", "content": "我叫什么？"}]},
    {"configurable": {"thread_id": "对话1"}},  # 会记得你叫小明
)
```

**生产环境用数据库**：

```python
from langgraph.checkpoint.postgres import PostgresSaver
with PostgresSaver.from_conn_string("postgresql://...") as checkpointer:
    agent = create_agent("openai:gpt-4o", tools, checkpointer=checkpointer)
```

### 8.2 长期记忆 —— 跨对话记住用户

**大白话**：让 Agent 记住"上个月你说过喜欢简洁风格"。

```python
from langgraph.store.memory import InMemoryStore

store = InMemoryStore(index={"embed": embed_func, "dims": 1536})

# 存记忆（按 namespace 组织，类似文件夹）
store.put(
    ("user_123", "preferences"),  # namespace
    "style",                       # key
    {"rules": ["用户喜欢简洁的回答", "用户只用Python"]}
)

# 搜记忆
items = store.search(("user_123", "preferences"), query="编程偏好")
```

### 8.3 对比

| 维度 | 短期记忆 | 长期记忆 |
| --- | --- | --- |
| 范围 | 单次对话 | 跨对话 |
| 存储 | Checkpointer | Store |
| 内容 | 消息历史 | 用户偏好、知识 |
| 比喻 | 工作记忆 | 笔记本 |

---

## 九、流式传输（Streaming）

**大白话**：不想等模型想完才看到结果？流式传输让你**边生成边看**。

### 9.1 流式传输 Agent 进度

```python
for chunk in agent.stream(
    {"messages": [{"role": "user", "content": "旧金山天气如何？"}]},
    stream_mode="updates",  # 每一步都推送
):
    for step, data in chunk.items():
        print(f"步骤: {step}")
        print(f"内容: {data['messages'][-1].content_blocks}")
```

输出：

```
步骤: model       → AI决定调用天气工具
步骤: tools       → 工具返回结果
步骤: model       → AI给出最终回答
```

### 9.2 三种流式模式

| 模式 | 说明 | 适用 |
| --- | --- | --- |
| `updates` | 每个Agent步骤后推送 | 显示Agent进度 |
| `messages` | LLM逐token推送 | 打字机效果 |
| `custom` | 自定义信号推送 | 进度条、状态更新 |

---

## 十、中间件（Middleware）—— 拦截和定制每一步

**大白话**：中间件就像Agent执行流程中的"关卡"，在每一步之前/之后可以拦截、修改、监控。

```
用户输入 → [中间件] → 模型调用 → [中间件] → 工具执行 → [中间件] → 最终输出
```

### 10.1 内置中间件

**对话摘要（SummarizationMiddleware）**

对话太长时自动压缩：

```python
from langchain.agents.middleware import SummarizationMiddleware

agent = create_agent(
    model="openai:gpt-4o",
    tools=[...],
    middleware=[
        SummarizationMiddleware(
            model="openai:gpt-4o-mini",        # 用便宜模型做摘要
            max_tokens_before_summary=4000,      # 超过4000 token触发
            messages_to_keep=20,                 # 保留最近20条消息
        ),
    ],
)
```

**人机交互（HumanInTheLoopMiddleware）**

高风险操作前暂停，等人类批准：

```python
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langgraph.checkpoint.memory import InMemorySaver

agent = create_agent(
    model="openai:gpt-4o",
    tools=[write_file, execute_sql, read_data],
    middleware=[
        HumanInTheLoopMiddleware(
            interrupt_on={
                "write_file": True,               # 写文件需要审批
                "execute_sql": {"allowed_decisions": ["approve", "reject"]},
                "read_data": False,                # 读数据不需要
            },
        ),
    ],
    checkpointer=InMemorySaver(),  # 必须有checkpointer
)
```

**三种审批决策**：

| 决策 | 说明 | 例子 |
| --- | --- | --- |
| `approve` | 批准执行 | 确认发邮件 |
| `edit` | 修改参数后执行 | 改一下收件人再发 |
| `reject` | 拒绝并反馈原因 | 这封邮件不能发，因为… |

---

## 十一、守卫（Guardrails）—— 安全防护

### 11.1 两种方式

| 方式 | 特点 | 适用 |
| --- | --- | --- |
| **确定性守卫** | 正则、关键词匹配，快速便宜 | 电话号码、邮箱、信用卡 |
| **模型守卫** | 用 LLM 判断，能抓住细微问题 | 内容审核、意图分析 |

### 11.2 PII 检测（内置）

```python
from langchain.agents.middleware import PIIMiddleware

agent = create_agent(
    model="openai:gpt-4o",
    tools=[...],
    middleware=[
        PIIMiddleware("email", strategy="redact", apply_to_input=True),
        # "我的邮箱是abc@test.com" → "我的邮箱是[REDACTED_EMAIL]"

        PIIMiddleware("credit_card", strategy="mask", apply_to_input=True),
        # "卡号1234567890123456" → "卡号****-****-****-3456"

        PIIMiddleware("api_key", detector=r"sk-[a-zA-Z0-9]{32}",
                      strategy="block", apply_to_input=True),
        # 检测到API Key直接报错
    ],
)
```

**四种策略**：

| 策略 | 效果 | 示例 |
| --- | --- | --- |
| `redact` | 替换为标签 | `[REDACTED_EMAIL]` |
| `mask` | 部分遮盖 | `****-****-****-1234` |
| `hash` | 替换为哈希 | `a8f5f167...` |
| `block` | 直接报错 | 抛出异常 |

---

## 十二、MCP 集成 —— 连接外部工具服务器

**MCP（模型上下文协议）** = 一个标准协议，让 Agent 能连接各种外部工具服务器。

```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent

client = MultiServerMCPClient({
    "math": {
        "transport": "stdio",                    # 本地进程
        "command": "python",
        "args": ["/path/to/math_server.py"],
    },
    "weather": {
        "transport": "streamable_http",          # 远程HTTP
        "url": "<http://localhost:8000/mcp>",
    }
})

tools = await client.get_tools()  # MCP工具自动转成LangChain工具
agent = create_agent("anthropic:claude-sonnet-4-5", tools)
```

**三种传输方式**：

| 传输 | 说明 | 适用 |
| --- | --- | --- |
| `stdio` | 本地子进程，标准输入/输出 | 本地开发 |
| `streamable_http` | HTTP请求 | 远程服务 |
| `sse` | Server-Sent Events | 实时流式 |

---

## 十三、多智能体系统（Multi-Agent）

### 13.1 什么时候需要多Agent？

- 单个Agent工具太多，选择困难
- 上下文太大，单Agent处理不了
- 任务需要专业分工（规划师、研究员、执行者）

### 13.2 两种模式

**工具调用模式（集中控制）**

一个"主管"Agent 把其他 Agent 当工具调用：

```python
# 子Agent
researcher = create_agent(model="...", tools=[search_web])
writer = create_agent(model="...", tools=[write_doc])

# 把子Agent包装成工具
@tool("research", description="调用研究员搜索资料")
def call_researcher(query: str):
    return researcher.invoke({"messages": [{"role": "user", "content": query}]})

# 主管Agent
supervisor = create_agent(
    model="openai:gpt-4o",
    tools=[call_researcher, call_writer],
    system_prompt="你是项目经理，协调研究员和写手完成任务"
)
```

**交接模式（分散控制）**

Agent 之间可以"交接班"，用户直接和当前 Agent 对话：

```
用户 → 客服Agent → "这个问题我不擅长" → 交接给技术Agent → 继续对话
```

### 13.3 对比

| 维度 | 工具调用 | 交接 |
| --- | --- | --- |
| 控制流 | 集中（主管控制） | 分散（Agent间切换） |
| 子Agent与用户交互 | ❌ 不直接交互 | ✅ 直接对话 |
| 适用 | 任务编排 | 多领域客服 |

---

## 十四、上下文工程（Context Engineering）

### 14.1 为什么重要？

> Agent 不可靠的**首要原因**不是模型不行，而是**没给模型正确的上下文**。
> 

上下文工程 = 把正确的信息，以正确的格式，在正确的时机，给到模型。

### 14.2 三类上下文

| 类型 | 控制什么 | 持久性 |
| --- | --- | --- |
| **模型上下文** | 进入模型的内容（提示词、消息、工具） | 瞬态 |
| **工具上下文** | 工具能访问的数据（状态、存储） | 持久 |
| **生命周期上下文** | 步骤间的处理（摘要、守卫） | 持久 |

### 14.3 三种数据源

| 数据源 | 范围 | 示例 |
| --- | --- | --- |
| **运行时上下文** | 本次调用 | 用户ID、API密钥 |
| **状态（短期记忆）** | 本次会话 | 当前消息、工具结果 |
| **存储（长期记忆）** | 跨会话 | 用户偏好、历史数据 |

### 14.4 动态系统提示

```python
from langchain.agents.middleware import dynamic_prompt, ModelRequest

@dynamic_prompt
def smart_prompt(request: ModelRequest) -> str:
    msg_count = len(request.messages)
    base = "你是一个有用的助手。"
    if msg_count > 10:
        base += "\\n这是长对话，请尽量简洁。"
    return base

agent = create_agent(model="openai:gpt-4o", tools=[...], middleware=[smart_prompt])
```

---

## 十五、运行时（Runtime）

运行时为工具和中间件提供**执行环境信息**。

```python
from dataclasses import dataclass
from langchain.agents import create_agent
from langchain.tools import tool, ToolRuntime

@dataclass
class Context:
    user_name: str
    db_connection: str

@tool
def greet(runtime: ToolRuntime[Context]) -> str:
    """根据用户名打招呼"""
    return f"你好，{runtime.context.user_name}！"

agent = create_agent(
    model="openai:gpt-4o",
    tools=[greet],
    context_schema=Context
)

agent.invoke(
    {"messages": [{"role": "user", "content": "打个招呼"}]},
    context=Context(user_name="小明", db_connection="postgresql://...")
)
```

---

## 十六、可观测性（Observability）

### 16.1 LangSmith 追踪

**零代码接入**，只需设置环境变量：

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=<your-api-key>
```

然后正常运行代码，所有步骤自动记录到 LangSmith 面板。

### 16.2 选择性追踪

```python
import langsmith as ls

# 只追踪这一次调用
with ls.tracing_context(enabled=True):
    agent.invoke({"messages": [...]})
```

### 16.3 追踪能看到什么？

- 每个模型调用的输入/输出
- 每个工具调用的参数/结果
- Token 用量和成本
- 执行耗时
- Agent 的决策路径

---

## 十七、部署

LangSmith 提供一键部署：

```
代码仓库（GitHub） → LangSmith 平台 → 生产级 API
```

**特点**：专为**有状态、长生命周期的 Agent** 设计（普通云平台是无状态短生命周期的）。
