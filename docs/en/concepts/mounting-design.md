# Mounting Design: Data, Knowledge, Action

中文：[挂载设计：数据挂载、知识挂载、Action 挂载](../../zh/concepts/mounting-design.md)

In UModel, "mounting" means **attaching external information to nodes of the object graph**. Mounting does not physically store data; it defines the rules that let graph nodes align with the outside world.

This document is written for first-time UModel readers. It uses analogies and real samples to explain three kinds of mounting.


## Three Kinds of Mounting at a Glance

| Mounting type | Question it answers | Elements used | Who consumes it |
|---|---|---|---|
| Data mounting | "Where are this object's runtime data and telemetry, and how do I fetch them?" | `entity_source` + `entity_source_link`, `data_link` + `storage_link` | Query Service, Web UI |
| Knowledge mounting | "What structural relationships exist between this kind of object and other objects, datasets, and storage?" | `data_link`, `entity_set_link`, `storage_link`, `entity_source_link` | Query Service, object graph rendering |
| Action mounting | "What operations (observe, remediate, automate) can I perform on this kind of object?" | `runbook_set` + `runbook_link` (observations / toolkits / actions / knowledge / automations / skills) | AgentGateway, MCP, AI Agents |

Mnemonic: **Data mounting fetches rows, knowledge mounting builds the graph, action mounting does things.**


## An Analogy

Think of the UModel object graph as a company directory:

- **EntitySet** is a "job description" (e.g. the fields an "SRE engineer" role has).
- **Entity record** is a specific person (Alice, Bob).
- **Data mounting** pulls each person's attendance, salary, and performance from different systems and attaches them to the name. The directory does not store the data, but it knows "go to HR system with employee ID".
- **Knowledge mounting** defines structural relationships like "SRE engineer → reports to SRE lead → belongs to platform team". The directory draws lines, it does not store concrete reporting records.
- **Action mounting** defines "what an SRE engineer can do" — callable tools, executable scripts, runbooks to reference. The directory attaches a "capability list", it does not execute on your behalf.


## Data Mounting

### What problem it solves

EntitySet in the object graph is only a type definition. The real runtime instances (e.g. a specific `checkout` service) and their metrics / logs / traces live **scattered across external systems**: SLS, Prometheus, ES, MySQL, CMDB...

Data mounting answers two questions:

1. Where do entity instances come from? (`entity_source`)
2. Where do telemetry rows for an entity come from, and which fields match? (`data_link` + `storage_link`)

### Entity data mounting: `entity_source` + `entity_source_link`

`entity_source` defines "an import job" — it tells UModel which external storage to pull entity data from and how to schedule it.

```yaml
kind: entity_source
metadata:
  name: "devops.service.source"
  domain: devops
spec:
  constructor:           # scheduling / construction config, free-form k-v
    schedule: "5m"
    mode: "full"
  storages:              # list of source storage configs
    - kind: sls_logstore
      project: "proj-devops"
      store: "service-inventory"
```

Then `entity_source_link` **mounts this source onto an EntitySet**:

```yaml
kind: entity_source_link
spec:
  src:  { domain: devops, kind: entity_source, name: devops.service.source }
  dest: { domain: devops, kind: entity_set,    name: devops.service }
```

Effect: a scheduler periodically pulls data from SLS, transforms it according to the `devops.service` schema, and writes entity records into GraphStore. **EntitySet itself does not know where data comes from; mounting brings it to life.**

### Telemetry data mounting: `data_link` + `storage_link`

This is the more common form of data mounting. See [devops.service_related_to_devops.metric.service.yaml](../../../examples/quickstart-multidomain/umodel/devops/link/data_link/devops.service_related_to_devops.metric.service.yaml):

```yaml
# 1) Entity ↔ Dataset: which field matches
kind: data_link
spec:
  src:  { domain: devops, kind: entity_set,  name: devops.service }
  dest: { domain: devops, kind: metric_set,  name: devops.metric.service }
  fields_mapping:
    id: service_id             # entity field id ↔ metric label service_id
    environment: environment
  data_link_type: related_to

# 2) Dataset ↔ Storage: where it physically lives
kind: storage_link
spec:
  src:  { domain: devops, kind: metric_set,    name: devops.metric.service }
  dest: { domain: devops, kind: prometheus,    name: devops.prometheus.core }
  fields_mapping:
    service_id: service_id
    environment: environment
```

Full chain:

```
EntitySet ─data_link(fields_mapping)─▶ MetricSet ─storage_link─▶ Prometheus
   (devops.service)                      (devops.metric.service)    (physical storage)
```

At query time: take a service entity's `id` value → `data_link` says match on `service_id` → `storage_link` says go to Prometheus → inject `service_id` into the MetricSet `generator` placeholder → get real metrics.

**The core of data mounting is `fields_mapping`.** It is the "reconciliation sheet" — telling the system which pair of fields identifies the same thing on each side. UModel itself stores no metrics; it relies on this sheet to fetch from external systems.

### Design rules for data mounting

- Match on **stable IDs** (`service_id`, `cluster_id`), not display names.
- Storage info (endpoint, project, store) belongs in Storage, never in EntitySet.
- If the same telemetry has different storage / refresh / ownership boundaries, split into multiple datasets with separate storage_links.
- Do not put PromQL / SQL into EntitySet. Put them in DataSet's `generator`.


## Knowledge Mounting

### What problem it solves

If you only had EntitySet and DataSet definitions, they would be **isolated YAML files** — `devops.service` would not know it has a relationship with `devops.environment`, nor which metric_set is "its own".

Knowledge mounting connects isolated nodes **into a semantic graph**. It defines relationships **between types**, not between specific instances.

### Four kinds of knowledge-mounting edges

| Link kind | Who → who | Edge semantics | fields_mapping required? |
|---|---|---|---|
| `data_link` | EntitySet → DataSet | "this kind of object has this kind of telemetry" | Yes — defines field alignment |
| `entity_set_link` | EntitySet → EntitySet | "these two kinds of objects have this topology relation (calls/contains/runs_in...)" | No — runtime Relations provide concrete edges |
| `storage_link` | DataSet → Storage | "this dataset physically lives there" | Yes — defines field alignment |
| `entity_source_link` | EntitySource → EntitySet | "runtime instances of this entity sync from here" | No — uses `constructor` for scheduling |

### Real example: service "runs in" environment

From [devops.service_runs_in_devops.environment.yaml](../../../examples/quickstart-multidomain/umodel/devops/link/entity_set_link/devops.service_runs_in_devops.environment.yaml):

```yaml
kind: entity_set_link
spec:
  src:  { domain: devops, kind: entity_set, name: devops.service }
  dest: { domain: devops, kind: entity_set, name: devops.environment }
  entity_link_type: runs_in
```

Note: **no `fields_mapping` here**. The edge only says "service type and environment type can have a runs_in relationship". The concrete "checkout service runs_in prod environment" is written as a runtime Relation record — Link is graph schema, Relation is graph data.

quickstart has many such topology edges; together they form a type-level topology graph:

- `devops.team_contains_devops.service`
- `devops.incident_impacts_devops.service`
- `k8s.workload_owns_k8s.pod`
- cross-domain: `devops.service_runs_k8s.workload` (DevOps services run on K8s workloads)

### Two forms of fields_mapping

In knowledge mounting, `fields_mapping` can be either a direct field name or a `${{src.x}}` / `${{dest.y}}` template:

| Form | Example | Use |
|---|---|---|
| Direct field name | `service_id: service_id` | Simple field alignment |
| Template expression | `${{src.service_id}}: acs_arms_p_service_id` | Relational mapping, often used for relation metrics |

See [links-and-field-mappings.md](links-and-field-mappings.md).

### Knowledge mounting vs runtime layer (key distinction)

| Layer | What it defines | Example |
|---|---|---|
| Knowledge layer (Link) | Edge **type** and **matching rule** | `devops.service` runs_in `devops.environment` |
| Runtime layer (Relation record) | Concrete edge **instance** | service `checkout` runs_in environment `prod` |

Knowledge mounting = graph schema; runtime Relation = graph data. Together they bring the object graph to life.


## Action Mounting

### What problem it solves

Once the object graph is built, AI Agents / SREs holding an object ask: "**What can I do with it?**"

- When an incident happens, in what order should I investigate?
- Once root cause is found, which tools can remediate?
- Which operations require human confirmation? What is the risk level?
- Are there runbooks to reference?

Action mounting answers these. It attaches "**executable capability for this kind of object**" to an EntitySet.

### Two element types

1. **`runbook_set`** — a collection of operational runbooks, containing 6 capability kinds:
   - `observations` — phenomenon observation (how to diagnose)
   - `actions` — action capability (deprecated; use `toolkits` instead)
   - `toolkits` — toolkit + tool (equivalent to an MCP Server)
   - `knowledge` — knowledge base (best practices, failure patterns)
   - `automations` — automation (event/schedule triggered)
   - `skills` — Agent Skill (follows the agentskills.io spec)

2. **`runbook_link`** — mounts a RunbookSet onto an EntitySet, using `token_replace` / `fields_mapping` to inject entity field values into the Runbook's input parameters.

### Real example: platform service operations runbook

From [platform.service.ops.yaml](../../../examples/incident-investigation/platform/runbook_set/platform.service.ops.yaml) and [platform.service_to_platform.service.ops.yaml](../../../examples/incident-investigation/platform/link/runbook_link/platform.service_to_platform.service.ops.yaml).

The mounting edge:

```yaml
kind: runbook_link
spec:
  src:  { domain: platform, kind: entity_set,    name: platform.service }
  dest: { domain: platform, kind: runbook_set,   name: platform.service.ops }
  token_replace:                              # context variable replacement
    service_id:    "${__entity_id__}"         # use built-in entity ID
    service_name:  "${display_name}"          # use entity field
    service_owner: "${owner}"
    service_sla:   "${sla_tier}"
  fields_mapping:                             # field-to-parameter mapping
    id:              service_id
    owner:           oncall_team
    sla_tier:        priority_context
    contact_channel: escalation_channel
```

How to read it: for any `platform.service` entity, you can execute the `platform.service.ops` runbook. At execution time the entity's `id` is injected into parameter `service_id`, the entity's `owner` becomes `oncall_team`, and so on.

### The 6 capabilities inside RunbookSet

#### ① observations

Diagnostic steps. Each observation has:

- **phenomenon**: what to observe and via which query/action/dashboard
- **conclusions**: judgments based on the phenomenon result (expression or prompt for LLM)
- **severity**: info / warning / error / fatal

Example (retry-storm detection):

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
      display_name: { en_us: "Retry Storm Detected" }
      group: "traffic_amplification"
    - condition_type: expression
      condition: "config_changes.count == 0"
      severity: info
      display_name: { en_us: "No Retry Amplification" }
      group: "traffic_amplification"
```

Note that within the same group, only the highest-severity conclusion is returned — this is UModel's "conclusion grouping" mechanism, which prevents Agents from being flooded by noisy conclusions.

#### ② toolkits + tools

A `toolkit` is equivalent to an MCP Server, carrying a set of `tool`s that share connection config.

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
      risk_level: medium              # risk level
      idempotent: true                # idempotent?
      confirmation_required: true     # require human confirmation?
```

Each tool carries `risk_level` (low/medium/high/critical), `idempotent`, and `confirmation_required` — these are the key metadata for Agent safety decisions.

#### ③ knowledge

Best practices in markdown / html / url / pdf form. With `apply_policy` (auto/manual/always/custom) and `priority` (1-10), Agents know "when to apply automatically, when to ask first".

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

#### ④ automations

Scripts triggered by events or schedules. For example, auto-collect context on SLO breach:

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

#### ⑤ skills

AI skill packages following the [Agent Skills spec](https://agentskills.io/specification), including a `SKILL.md` and supporting scripts. A skill tells the Agent "follow this protocol to run the full investigation flow".

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

#### ⑥ actions (deprecated)

Legacy `action_config`; superseded by `toolkits` + `tool`. New model packs should not use it.

### Action mounting vs AgentGateway/MCP

Action mounting is a **model-layer definition** ("what capabilities exist"); AgentGateway/MCP is the **integration-layer implementation** ("how to expose to Agents"). See [query-and-agent.md](../architecture/query-and-agent.md):

- Toolkits/tools in RunbookSet define metadata about executable capabilities.
- AgentGateway reads these definitions via Query Service and decides whether to expose them to MCP clients.
- **Write tools are off by default** and must be explicitly enabled. This is UModel's safety posture.

```
RunbookSet (model layer)      AgentGateway (integration layer)    MCP client
   toolkits  ────read .umodel───▶  tool discovery  ──JSON-RPC──▶  Agent
   actions                      resources
   knowledge                    query tools
```


## How the three mountings cooperate

Take "service incident investigation" as an example. All three mountings work together:

```
┌─────────────────────────────────────────────────────────────────┐
│  Knowledge mounting (graph schema)                              │
│  platform.service ─calls─▶ platform.service                    │
│  platform.service ─runs_in─▶ platform.environment              │
│  platform.service ─related_to─▶ platform.metric.service         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ runtime writes Entity/Relation records
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Data mounting (fetch rules)                                    │
│  platform.service.id  ─data_link─▶  metric_set.service_id       │
│  metric_set  ─storage_link─▶  prometheus                        │
│  when running .topo / .entity, fetch from external systems      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Agent gets object + data and wants to act
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Action mounting (capabilities)                                 │
│  platform.service ─runbook_link─▶ platform.service.ops          │
│    observations  → diagnostic steps                             │
│    toolkits      → rollback_config_change / apply_rate_limit    │
│    knowledge     → retry storm runbook                          │
│    automations   → SLO-breach context collector                 │
│    skills        → incident-investigation skill                 │
└─────────────────────────────────────────────────────────────────┘
```

When an incident happens:

1. Agent fetches the failing service entity via `.entity` (data mounting tells it where to fetch).
2. Agent looks at upstream/downstream via `.topo` (knowledge mounting defines calls / runs_in edges).
3. Agent finds the RunbookSet mounted on this kind of service via `runbook_link` (action mounting).
4. Agent runs `observations` in order and gets conclusions.
5. Agent decides whether to call remediation tools based on each tool's `risk_level` and `confirmation_required`.
6. The whole flow can be auto-triggered by `automations` or guided by a `skill` so the Agent follows a known protocol.


## Summary of design principles

1. **Mounting is declarative.** YAML defines rules; UModel services fetch or schedule at query / execution time. Mounting edges do not contain imperative logic.
2. **`fields_mapping` is the soul of mounting.** Every mounting relies on it to define "how the two sides align". Prefer stable IDs over display names.
3. **The three mountings are not interchangeable:**
   - Data mounting fetches rows — without it the graph is empty.
   - Knowledge mounting builds the graph — without it the graph is islands.
   - Action mounting does things — without it the graph is read-only.
4. **Model layer vs runtime layer stay separate.** Mounting defines relationships between types; runtime records provide concrete instances. Link is schema; Entity/Relation is data.
5. **Action mounting is safe by default.** Write capabilities in toolkits / actions / automations are off by default and require explicit server-side policy to enable.
6. **Cross-domain mounting is allowed.** Edges like `devops.service_runs_k8s.workload` connect different business vocabularies into one graph — this is central to UModel's multi-domain modeling.


## Related references

- [Object Graph Semantic Layer](object-graph-semantic-layer.md)
- [Model Elements](model-elements.md)
- [Links And Field Mappings](links-and-field-mappings.md)
- [Storage And GraphStore Providers](storage-and-graphstore.md)
- [Query And Agent Architecture](../architecture/query-and-agent.md)
- [MCP Reference](../reference/mcp.md)
- Schemas:
  - [runbook_set](../reference/schema/core/dataset/runbook-set.md)
  - [runbook_link](../reference/schema/core/link/runbook-link.md)
  - [entity_source](../reference/schema/core/dataset/entity-source.md)
  - [entity_source_link](../reference/schema/core/link/entity-source-link.md)
  - [data_link](../reference/schema/core/link/data-link.md)
  - [storage_link](../reference/schema/core/link/storage-link.md)
- Real examples:
  - [incident-investigation](../../../examples/incident-investigation) — full Action mounting sample
  - [quickstart-multidomain](../../../examples/quickstart-multidomain/README.md) — knowledge + data mounting sample
