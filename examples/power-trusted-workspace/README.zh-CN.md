# 电力可信工作区示例包

English: [Power Trusted Workspace Example Pack](README.md)

`examples/power-trusted-workspace` 是一个面向电力运维的可信数据空间样例。它演示一个 workspace 如何把**电力拓扑**、**FSU 遥测数据**、**算法/模型资产**和**知识资产**组织到同一张受治理的图里，供人和 Agent 用同一套 UModel 能力查询。

这个示例包刻意做得很实用：

- 电力资产作为一等实体来建模，而不是散落的 JSON
- 遥测数据通过 data link 和 storage link 挂到正确的实体集上
- 模型注册表记录算法资产的版本和状态
- quickstart / import 使用的样例名是 `power-trusted-workspace`
- 结构足够小，能一眼看懂；又足够完整，能说明治理、溯源和查询计划

## 这个示例的用途

这个场景代表一个电力运维可信工作区。它帮助业务和技术读者回答这些问题：

- 哪个变电站、馈线、变压器或设备异常？
- 这些资产对应哪组遥测数据？
- 当前工作区挂载了哪个模型版本，它的状态是什么？
- 某条证据来自日志、指标还是事件，来源在哪里？
- 哪些对象属于同一个受治理 workspace，并且可以端到端追踪？

它不是为了完整模拟电力系统，而是为了展示**可信数据空间故事**：在同一个 workspace 里把拓扑、遥测、模型和知识放在一起，让 Agent 不用猜数据在哪个系统里。

## 工作区组织方式

这个包围绕四层组织：

| 层 | 含义 | 作用 |
|---|---|---|
| 电力拓扑 | 变电站、馈线、变压器、设备、电池组 | 提供运维对象图和遍历路径 |
| FSU 遥测 | 电力设备的指标、日志、事件 | 提供诊断和监控所需信号 |
| 算法/模型资产 | 模型注册表和挂载的运维模型条目 | 记录可用模型、版本和状态 |
| 知识资产 | 受治理的证据与运维元数据 | 让 Agent 和人都能看到溯源、责任和版本上下文 |

这个工作区强调的是受治理的数据空间，而不是零散拼接的数据：

- **溯源**：每个资产都能回到对应的 workspace 包和 sample 根目录
- **版本**：schema 版本和 model 版本都显式写出，不靠猜
- **责任归属**：资产 metadata 里有 owner 和运行上下文
- **可查询性**：实体集、数据集、存储和链接都被建模，因此图可以生成有意义的后续查询

## 包内容

| 区域 | 路径 | 数量 | 用途 |
|---|---|---:|---|
| 电力实体集 | `power/entity_set/` | 6 | 变电站、馈线、变压器、设备、电池组、模型注册表 |
| 电力遥测集 | `power/metric_set/`、`power/log_set/`、`power/event_set/` | 3 | 设备指标、日志和事件 |
| 电力存储定义 | `power/storage/` | 3 | Prometheus、Elasticsearch、MySQL 接入定义 |
| 运维手册 | `operations/runbook_set/` | 1 | 设备异常、预测和后备时长手册 |
| 运维手册链接 | `power/link/runbook_link/` | 1 | 将设备实体连接到运维手册 |
| 样例根目录 | `sample-data/` | 3 | 运行时实体、关系和清单 |
| 来源 / 治理根目录 | `source/` | 4 | FSU 来源、来源链接和外部存储 |

当前包里已经有的模型、遥测和运维资产：

- `power.model_registry`
- `power.device`
- `power.station`
- `power.feeder`
- `power.transformer`
- `power.battery_pack`
- `power.device.ops`

当前包里已经有的遥测资产：

- `power.device.metrics`
- `power.device.logs`
- `power.device.events`

当前包里已经有的存储资产：

- `power.prometheus.core`
- `power.elasticsearch.logs`
- `power.mysql.events`

## 快速开始

默认演示入口：

```bash
make power-demo
```

quickstart 使用的样例名是 `power-trusted-workspace`：

```bash
make quickstart QUICKSTART_SAMPLE=examples/power-trusted-workspace
```

API: `http://localhost:8080` | Web UI: `http://localhost:5173`

只启动 API：

```bash
go run ./cmd/umodel-server --quickstart --quickstart-sample power-trusted-workspace
```

## 导入

将内置样例导入其他 workspace 时，直接使用样例名：

```bash
curl -X POST http://localhost:8080/api/v1/samples/demo/power-trusted-workspace:import \
  -H 'Content-Type: application/json' \
  -d '{}'
```

也可以用 CLI：

```bash
go run ./cmd/umctl --addr http://localhost:8080 sample import demo power-trusted-workspace
```

## 查询思路

下面这些例子尽量写成业务和技术读者都容易理解的形式。

```bash
go run ./cmd/umctl --addr http://localhost:8080 query run demo ".entity with(domain='power', name='power.station', query='station') | project __entity_id__, display_name, status, owner, region"

go run ./cmd/umctl --addr http://localhost:8080 query run demo ".entity_set with(domain='power', name='power.device') | entity-call list_data_set(['metric_set', 'log_set', 'event_set'], true)"

go run ./cmd/umctl --addr http://localhost:8080 query run demo ".entity_set with(domain='power', name='power.device', ids=['<device-id>']) | entity-call get_metrics('power', 'power.device.metrics', 'load_pct', step='1m')"

go run ./cmd/umctl --addr http://localhost:8080 query run demo ".entity_set with(domain='power', name='power.device', ids=['<device-id>']) | entity-call get_logs('power', 'power.device.logs', query='level = \"ERROR\"')"

go run ./cmd/umctl --addr http://localhost:8080 query run demo ".umodel with(kind='event_set', domain='power') | project domain,name,kind | limit 10"

go run ./cmd/umctl --addr http://localhost:8080 query run demo ".topo | graph-call getDirectRelations([(:\"power@power.station\" {__entity_id__: '<station-id>'})])"
```

这个样例也支持 Runbook 发现：

```bash
go run ./cmd/umctl --addr http://localhost:8080 query run demo ".umodel with(kind='runbook_set', name='power.device.ops')"
```

适合的遍历思路：

- 先从变电站开始，再走到馈线、变压器和设备
- 先看设备的指标、日志和事件，再判断故障原因
- 需要知道算法资产是否可用时，先查模型注册表
- 在下游工作流里，先比较 owner、version 和 status，再决定是否信任某条信号

## 设计决策

- **先讲可信数据空间。** 这个包是为了说明治理和运维数据如何放在同一个 workspace 里。
- **拓扑是主线。** 变电站 → 馈线 → 变压器 → 设备，形成清晰的遍历路径。
- **遥测是挂载出来的。** 指标、日志和事件都作为数据集来建模，图才能发现它们。
- **模型是资产。** 模型注册表把算法版本和运行状态变成 workspace 的一部分。
- **知识是上下文。** 证据和元数据留在同一个受治理样例里，溯源就不会断。
- **默认走计划。** UModel 开源版返回 query plan，所以这个工作区主要教 Agent 如何找到正确数据，而不是手写下游查询。

## 备注

- 这个包当前刻意做得较小，后续可以继续加电力实体、数据链接和知识资产。
- 文件名和样例名都尽量显式，方便保持 quickstart、import 和 query 示例稳定。
