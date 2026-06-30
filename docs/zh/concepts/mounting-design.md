# 挂载设计：数据挂载、知识挂载、Action 挂载

English: [Mounting Design](../../en/concepts/mounting-design.md)

UModel 用"挂载"这个词描述**把外部信息接到对象图节点上**的过程。挂载不是物理存放数据，而是定义"图的节点和外部世界之间用什么规则对得上"。

本文面向第一次接触 UModel 的读者，用类比和真实样例把三种挂载讲清楚。


## 一句话区分三种挂载

| 挂载类型 | 回答什么问题 | 用的 element | 谁来用 |
|---|---|---|---|
| 数据挂载 | "这个对象的运行时数据和遥测信号在哪、怎么取？" | `entity_source` + `entity_source_link`、`data_link` + `storage_link` | Query Service、Web UI |
| 知识挂载 | "这种对象和别的对象、数据集、存储之间有什么结构关系？" | `data_link`、`entity_set_link`、`storage_link`、`entity_source_link` | Query Service、对象图渲染 |
| Action 挂载 | "对这种对象能做什么操作（观察、修复、自动化）？" | `runbook_set` + `runbook_link`（含 observations / toolkits / actions / knowledge / automations / skills） | AgentGateway、MCP、AI Agent |

记忆口诀：**数据挂载管"取数"，知识挂载管"连图"，Action 挂载管"做事"**。


## 一个类比

把 UModel 对象图想象成一个公司通讯录：

- **EntitySet** 是"职位定义"（比如"运维工程师"这个岗位有哪些字段）。
- **Entity record** 是某个具体的人（张三、李四）。
- **数据挂载**：把每个人的考勤、工资、绩效从不同系统拉过来挂在人名下——通讯录不存这些数据，但知道"去 HR 系统用员工号取"。
- **知识挂载**：定义"运维工程师 → 上级是 SRE 主管 → 属于平台团队"这种**关系结构**。通讯录只画连线，不存具体上下级记录。
- **Action 挂载**：定义"运维工程师能做哪些事"——可调用的工具、可执行的脚本、可参考的处置手册。通讯录挂上"操作能力清单"，但不替你执行。


## 数据挂载

### 解决什么问题

对象图里的 EntitySet 只是"类型定义"，运行时真正的实体（比如具体的 `checkout` 服务）和它的指标/日志/链路数据，**散落在各种外部系统里**：SLS、Prometheus、ES、MySQL、CMDB……

数据挂载回答两个问题：

1. 实体本身的实例从哪来？（`entity_source`）
2. 这个实体的遥测数据从哪来、用什么字段匹配？（`data_link` + `storage_link`）

### 实体数据挂载：`entity_source` + `entity_source_link`

`entity_source` 定义"一次导入任务"，告诉 UModel 去哪个外部存储拉实体数据、怎么调度。

```yaml
kind: entity_source
metadata:
  name: "devops.service.source"
  domain: devops
spec:
  constructor:           # 调度/构造配置，灵活 k-v
    schedule: "5m"
    mode: "full"
  storages:              # 数据源配置列表
    - kind: sls_logstore
      project: "proj-devops"
      store: "service-inventory"
```

然后用 `entity_source_link` 把这个数据源**挂到某个 EntitySet 上**：

```yaml
kind: entity_source_link
spec:
  src:  { domain: devops, kind: entity_source, name: devops.service.source }
  dest: { domain: devops, kind: entity_set,    name: devops.service }
```

效果：调度器定期从 SLS 拉数据，按 `devops.service` 的 schema 转成 entity record 写入 GraphStore。**EntitySet 本身不知道数据怎么来，挂载让它"活"起来。**

### 遥测数据挂载：`data_link` + `storage_link`

这是更常见的"数据挂载"。真实例子见 [devops.service_related_to_devops.metric.service.yaml](../../../examples/quickstart-multidomain/umodel/devops/link/data_link/devops.service_related_to_devops.metric.service.yaml)：

```yaml
# 1) 实体 ↔ 数据集：用哪个字段匹配
kind: data_link
spec:
  src:  { domain: devops, kind: entity_set,  name: devops.service }
  dest: { domain: devops, kind: metric_set,  name: devops.metric.service }
  fields_mapping:
    id: service_id             # 实体字段 id ↔ 指标 label service_id
    environment: environment
  data_link_type: related_to

# 2) 数据集 ↔ 存储：物理上存哪
kind: storage_link
spec:
  src:  { domain: devops, kind: metric_set,    name: devops.metric.service }
  dest: { domain: devops, kind: prometheus,    name: devops.prometheus.core }
  fields_mapping:
    service_id: service_id
    environment: environment
```

完整链路：

```
EntitySet ─data_link(fields_mapping)─▶ MetricSet ─storage_link─▶ Prometheus
   (devops.service)                      (devops.metric.service)    (物理存储)
```

查询时：拿到一个 service 实体的 `id` 值 → 通过 `data_link` 知道用 `service_id` 匹配 → 通过 `storage_link` 知道去 Prometheus → 把 `service_id` 值塞进 MetricSet 的 `generator` 占位符 → 拿到真实指标。

**数据挂载的核心：`fields_mapping`。** 它就是"对账单"——告诉系统两端用哪对字段能把同一件事对上。UModel 自己不存任何指标数据，全靠这张对账单去外部系统取。

### 数据挂载的设计原则

- 用**稳定 ID** 做匹配（`service_id`、`cluster_id`），不要用展示名。
- 存储信息（地址、project、store）只放 Storage，不要漏到 EntitySet。
- 同一份遥测如果存储/刷新/责任边界不同，拆成多个 Dataset + 多条 storage_link。
- 不要把 PrometheusQL / SQL 塞进 EntitySet，放在 DataSet 的 `generator`。


## 知识挂载

### 解决什么问题

如果只有 EntitySet 和 DataSet，它们就是**一堆孤立的 YAML**——`devops.service` 不知道自己跟 `devops.environment` 有什么关系，也不知道哪个 metric_set 是"自己的"。

知识挂载把孤立节点**连成一张语义图**。它定义"**类型之间**有什么关系"，而不是"具体哪个对象和哪个对象有关系"。

### 四种知识挂载的边

| Link kind | 连谁 → 谁 | 边的语义 | 是否需要 fields_mapping |
|---|---|---|---|
| `data_link` | EntitySet → DataSet | "这类对象有这类遥测数据" | 是，定义字段对齐 |
| `entity_set_link` | EntitySet → EntitySet | "这两类对象有这种拓扑关系（calls/contains/runs_in...）" | 否（运行时 Relation 提供具体边） |
| `storage_link` | DataSet → Storage | "这份数据集物理上在那里" | 是，定义字段对齐 |
| `entity_source_link` | EntitySource → EntitySet | "实体的运行时实例从这里同步过来" | 否（用 constructor 调度） |

### 真实例子：服务"运行在"环境

来自 [devops.service_runs_in_devops.environment.yaml](../../../examples/quickstart-multidomain/umodel/devops/link/entity_set_link/devops.service_runs_in_devops.environment.yaml)：

```yaml
kind: entity_set_link
spec:
  src:  { domain: devops, kind: entity_set, name: devops.service }
  dest: { domain: devops, kind: entity_set, name: devops.environment }
  entity_link_type: runs_in
```

注意：**这里没有 fields_mapping**。因为这条边只说"服务类型和环象类型之间可以存在 runs_in 关系"。具体"checkout 服务运行在 prod 环境"是运行时 Relation record 写入的——Link 是图的 schema，Relation 是图的数据。

quickstart 里有大量这样的拓扑边，叠加起来就是一张对象类型拓扑图：

- `devops.team_contains_devops.service`
- `devops.incident_impacts_devops.service`
- `k8s.workload_owns_k8s.pod`
- 跨 domain：`devops.service_runs_k8s.workload`（DevOps 服务跑在 K8s workload 上）

### fields_mapping 的两种形态

知识挂载里 `fields_mapping` 既可以是"直接字段名"，也可以用 `${{src.x}}` / `${{dest.y}}` 表达"取源/目标实体的字段值"：

| 形态 | 示例 | 用途 |
|---|---|---|
| 直接字段名 | `service_id: service_id` | 简单字段对齐 |
| 模板表达式 | `${{src.service_id}}: acs_arms_p_service_id` | 关系型 mapping，常用于关系 metric |

详见 [links-and-field-mappings.md](links-and-field-mappings.md)。

### 知识挂载 vs 运行时层（关键区分）

| 层 | 定义什么 | 例子 |
|---|---|---|
| 知识层（Link） | 边的**类型**和**匹配规则** | `devops.service` runs_in `devops.environment` |
| 运行时层（Relation record） | 边的**具体实例** | service `checkout` runs_in environment `prod` |

知识挂载 = 图的 schema；运行时 Relation = 图的数据。两者一起，对象图才"活"起来。


## Action 挂载

### 解决什么问题

对象图建好了，但 AI Agent / SRE 拿到对象后问："**我能对它做什么？**"

- 出了故障，按什么顺序排查？
- 找到根因，能调用哪些工具修复？
- 哪些操作必须人工确认？风险等级是多少？
- 有没有可以参考的处置知识？

Action 挂载回答这些问题。它把"**对某类对象能执行的操作能力**"挂到 EntitySet 上。

### 两类 element

1. **`runbook_set`**：操作手册集合，包含 6 种"能力"：
   - `observations` —— 现象观察（怎么诊断）
   - `actions` —— 操作能力（deprecated，推荐用 `toolkits`）
   - `toolkits` —— 工具箱 + 工具（等价于 MCP Server）
   - `knowledge` —— 知识库（最佳实践、故障模式）
   - `automations` —— 自动化（事件触发/定时触发）
   - `skills` —— Agent Skill（遵循 agentskills.io 规范）

2. **`runbook_link`**：把 RunbookSet 挂到 EntitySet，并通过 `token_replace` / `fields_mapping` 把实体字段值传给 Runbook 的输入参数。

### 真实例子：平台服务运维手册

来自 [platform.service.ops.yaml](../../../examples/incident-investigation/platform/runbook_set/platform.service.ops.yaml) 和 [platform.service_to_platform.service.ops.yaml](../../../examples/incident-investigation/platform/link/runbook_link/platform.service_to_platform.service.ops.yaml)。

挂载边：

```yaml
kind: runbook_link
spec:
  src:  { domain: platform, kind: entity_set,    name: platform.service }
  dest: { domain: platform, kind: runbook_set,   name: platform.service.ops }
  token_replace:                              # 上下文变量替换
    service_id:    "${__entity_id__}"         # 用实体内置 ID
    service_name:  "${display_name}"          # 用实体字段
    service_owner: "${owner}"
    service_sla:   "${sla_tier}"
  fields_mapping:                             # 字段到参数的映射
    id:              service_id
    owner:           oncall_team
    sla_tier:        priority_context
    contact_channel: escalation_channel
```

读法：对任何 `platform.service` 实体，可以执行 `platform.service.ops` 这本手册；执行时，实体的 `id` 注入到手册参数 `service_id`，实体的 `owner` 注入到 `oncall_team`，依此类推。

### RunbookSet 里的 6 种能力

#### ① observations（观察）

诊断步骤。每个 observation 有：

- **phenomenon**：观察什么、用什么 query/action/dashboard 去看
- **conclusions**：根据现象结果判断（expression 表达式 或 prompt 给 LLM 判断）
- **severity**：info / warning / error / fatal

示例（重试风暴检测）：

```yaml
- name: upstream_retry_amplification
  phenomenon:
    phenomenon_type: query
    inputs:
      - { name: service_id, type: string, required: true }
    properties:
      step1_query: ".topo | graph-call getDirectRelations([(:\"platform@platform.service\" {__entity_id__: '${service_id}'})]) | with(__relation_type__='calls')"
      step2_query: ".entity with(domain='platform', name='platform.config_change', query='target_service:${upstream_id}') | sort applied_at desc | limit 5"
  conclusions:
    - condition_type: expression
      condition: "any(config_changes, change_detail contains 'retry')"
      severity: error
      display_name: { zh_cn: "检测到重试风暴" }
      group: "traffic_amplification"
    - condition_type: expression
      condition: "config_changes.count == 0"
      severity: info
      display_name: { zh_cn: "未检测到重试放大" }
      group: "traffic_amplification"
```

注意同一个 group 里只返回最高 severity 的结论——这是 UModel 的"结论分组"机制，避免 Agent 被噪声结论淹没。

#### ② toolkits + tools（工具箱）

`toolkit` 等价于一个 MCP Server，承载一组共享连接配置的 `tool`。

```yaml
- name: config_management
  toolkit_type: api_call
  configs:
    base_url: "http://config-center.internal/api/v1"
    timeout_ms: "5000"
  tools:
    - name: rollback_config_change
      short_description: "Revert a config change to previous value."
      input_schema:
        properties:
          config_change_id: { type: string }
          target_service:   { type: string }
        required: [config_change_id, target_service]
      output_schema:
        properties:
          success: { type: boolean }
      risk_level: medium              # 风险等级
      idempotent: true                # 是否幂等
      confirmation_required: true     # 是否需要人工确认
```

每个 tool 都带 `risk_level`（low/medium/high/critical）、`idempotent`、`confirmation_required`——这些是 Agent 安全决策的关键元数据。

#### ③ knowledge（知识）

markdown / html / url / pdf 形式的最佳实践。带 `apply_policy`（auto/manual/always/custom）和 `priority`（1-10），让 Agent 知道"什么时候自动用、什么时候问一下"。

```yaml
- name: retry_storm_pattern
  apply_policy: { apply_type: auto }
  content_type: markdown
  content: |
    # Retry Storm Pattern
    ## Resolution Priority
    1. Rollback config change — fastest, lowest risk (2-3 min)
    2. Apply rate limit — if rollback unavailable
    ...
  priority: 1
```

#### ④ automations（自动化）

事件或定时触发的脚本。比如 SLO 违规时自动收集上下文：

```yaml
- name: slo_breach_context_collector
  automation_type: script
  trigger:
    trigger_type: event
    properties:
      event_source: "alertmanager"
      event_filter: "alert_name=SLOBreachP99 AND severity=P1|P2"
  properties:
    script_path: "scripts/collect_incident_context.sh"
```

#### ⑤ skills（Agent Skills）

遵循 [Agent Skills 规范](https://agentskills.io/specification) 的 AI 技能包，包含 `SKILL.md` 和辅助脚本。Agent 拿到 skill 后知道"按什么协议走完整排查流程"。

```yaml
- name: incident-investigation
  description: "Systematic incident investigation using runbook observations."
  allowed_tools: "rollback_config_change apply_rate_limit scale_workload restart_pods"
  files:
    - name: SKILL.md
      content: |
        # Incident Investigation Skill
        ## Phase 1: Identify ...
        ## Phase 2: Observe ...
        ## Phase 3: Correlate ...
```

#### ⑥ actions（deprecated）

旧的 action_config，已被 `toolkits` + `tool` 取代。新模型包不要再用。

### Action 挂载 vs AgentGateway/MCP

Action 挂载是**模型层定义**（"有什么能力"），AgentGateway/MCP 是**接入层实现**（"怎么暴露给 Agent"）。两者关系见 [query-and-agent.md](../architecture/query-and-agent.md)：

- RunbookSet 里的 toolkits/tools 定义"可执行能力的元数据"。
- AgentGateway 通过 Query Service 读取这些定义，再决定是否暴露给 MCP client。
- **写工具默认关闭**，必须显式启用。这是 UModel 的安全姿态。

```
RunbookSet (模型层)         AgentGateway (接入层)         MCP client
   toolkits  ────读 .umodel───▶  tool discovery  ──JSON-RPC──▶  Agent
   actions                      resources
   knowledge                    query tools
```


## 三种挂载如何协同

以"服务故障排查"为例，三种挂载一起工作：

```
┌─────────────────────────────────────────────────────────────────┐
│  知识挂载（图的 schema）                                          │
│  platform.service ─calls─▶ platform.service                     │
│  platform.service ─runs_in─▶ platform.environment               │
│  platform.service ─related_to─▶ platform.metric.service          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 运行时写入 Entity/Relation record
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  数据挂载（取数规则）                                              │
│  platform.service.id  ─data_link─▶  metric_set.service_id        │
│  metric_set  ─storage_link─▶  prometheus                         │
│  执行 .topo / .entity 时按这些规则去外部系统取数                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Agent 拿到对象 + 数据后要做事
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Action 挂载（操作能力）                                          │
│  platform.service ─runbook_link─▶ platform.service.ops           │
│    observations  → 诊断步骤                                       │
│    toolkits      → rollback_config_change / apply_rate_limit     │
│    knowledge     → 重试风暴处置手册                                │
│    automations   → SLO 违规自动收集上下文                         │
│    skills        → incident-investigation skill                  │
└─────────────────────────────────────────────────────────────────┘
```

故障发生时：

1. Agent 通过 `.entity` 拿到出问题的 service 实体（数据挂载让它知道去哪取）。
2. 通过 `.topo` 看上下游（知识挂载定义了 calls / runs_in 边）。
3. 通过 `runbook_link` 找到挂在这类 service 上的 RunbookSet（Action 挂载）。
4. 按 `observations` 顺序诊断，得到结论。
5. 根据 `toolkits` 里 tool 的 `risk_level` 和 `confirmation_required` 决定是否调用修复工具。
6. 全程可被 `automations` 自动触发，也可被 `skills` 引导 Agent 按协议执行。


## 设计原则汇总

1. **挂载是声明式的**：YAML 定义"规则"，UModel 服务在查询/执行时按规则取数或调度，不在挂载边里写命令式逻辑。
2. **`fields_mapping` 是挂载的灵魂**：所有挂载都靠它定义"两端怎么对得上"。优先用稳定 ID，不要用易变展示名。
3. **三种挂载互不替代**：
   - 数据挂载管"取数"——没有它，对象图是空壳。
   - 知识挂载管"连图"——没有它，对象图是一堆孤岛。
   - Action 挂载管"做事"——没有它，对象图只能看不能用。
4. **模型层与运行时层分离**：挂载定义"类型间的关系"，运行时 record 提供"具体实例"。Link 是 schema，Entity/Relation 是 data。
5. **Action 挂载默认安全**：toolkits / actions / automations 的"写能力"默认关闭，需要服务端策略显式启用。
6. **跨 domain 挂载是允许的**：`devops.service_runs_k8s.workload` 这种跨 domain Link 把不同业务词汇接成一张图，是 UModel 多域建模的关键能力。


## 相关参考

- [对象图语义层](object-graph-semantic-layer.md)
- [Model Elements](model-elements.md)
- [Link 与字段映射](links-and-field-mappings.md)
- [Storage 与 GraphStore](storage-and-graphstore.md)
- [Query 与 Agent 架构](../architecture/query-and-agent.md)
- [MCP 参考](../reference/mcp.md)
- Schema：
  - [runbook_set](../reference/schema/core/dataset/runbook-set.md)
  - [runbook_link](../reference/schema/core/link/runbook-link.md)
  - [entity_source](../reference/schema/core/dataset/entity-source.md)
  - [entity_source_link](../reference/schema/core/link/entity-source-link.md)
  - [data_link](../reference/schema/core/link/data-link.md)
  - [storage_link](../reference/schema/core/link/storage-link.md)
- 真实样例：
  - [incident-investigation](../../../examples/incident-investigation) —— 完整的 Action 挂载样例
  - [quickstart-multidomain](../../../examples/quickstart-multidomain/README.zh-CN.md) —— 知识挂载 + 数据挂载样例
