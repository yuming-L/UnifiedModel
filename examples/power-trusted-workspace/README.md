# Power Trusted Workspace Example Pack

English: [Power Trusted Workspace Example Pack](README.zh-CN.md)

`examples/power-trusted-workspace` is a trusted data space sample for power operations. It shows how one workspace can connect **power topology**, **FSU telemetry**, **algorithm/model assets**, and **knowledge assets** into a governed graph that people and agents can query with the same UModel surface.

This pack is intentionally practical:

- power assets are modeled as first-class entities, not loose JSON
- telemetry is attached to the right entity sets through data links and storage links
- model registry entries carry version and status information for algorithm assets
- the sample is named `power-trusted-workspace` for quickstart and import
- the layout is small enough to inspect, but complete enough to explain governance, provenance, and query planning

## What This Pack Is For

The scenario represents a trusted workspace for power-grid operations. It helps a business or technical audience answer questions like:

- Which station, feeder, transformer, or device is unhealthy?
- Which telemetry belongs to that asset?
- Which model version is attached to the workspace and what is its status?
- Which evidence came from logs, metrics, or events, and where did it come from?
- Which objects are governed by the same workspace and can be traced end to end?

The goal is not to model a full utility system. It is to show the **trusted data space story**: a workspace where topology, telemetry, models, and knowledge are organized together so an agent can reason over them without guessing which system holds what.

## Workspace Story

The pack is organized around four layers:

| Layer | What it represents | Why it matters |
|---|---|---|
| Power topology | Station, feeder, transformer, device, battery pack | Gives the operational object graph and traversal path |
| FSU telemetry | Metrics, logs, and events for power devices | Provides the signals used for diagnosis and monitoring |
| Algorithm/model assets | Model registry plus attached operational model entries | Records which models are available, their version, and their status |
| Knowledge assets | Governed evidence and operational metadata in the workspace | Keeps provenance, ownership, and version context visible to agents and people |

The workspace keeps the data space governed rather than ad hoc:

- **provenance**: each asset is tied back to its workspace package and sample root
- **versioning**: schema version and model version are explicit, not implied
- **ownership**: asset metadata carries ownership and operating context
- **queryability**: entity sets, datasets, storage, and links are all modeled, so the graph can generate useful follow-up queries

## Pack Contents

| Area | Path | Count | Purpose |
|---|---|---:|---|
| Power entity sets | `power/entity_set/` | 6 | Station, feeder, transformer, device, battery pack, model registry |
| Power telemetry sets | `power/metric_set/`, `power/log_set/`, `power/event_set/` | 3 | Device metrics, logs, and events |
| Power storage definitions | `power/storage/` | 3 | Prometheus, Elasticsearch, and MySQL endpoints |
| Operations runbook | `operations/runbook_set/` | 1 | Device anomaly, forecast, and backup playbook |
| Runbook link | `power/link/runbook_link/` | 1 | Connect device entities to the operations runbook |
| Sample root | `sample-data/` | 3 | Runtime entities, relations, and manifest |
| Source / governance root | `source/` | 4 | FSU source, source links, and external storage |

The model, telemetry, and operations assets currently present in the pack are:

- `power.model_registry`
- `power.device`
- `power.station`
- `power.feeder`
- `power.transformer`
- `power.battery_pack`
- `power.device.ops`

The telemetry assets currently present in the pack are:

- `power.device.metrics`
- `power.device.logs`
- `power.device.events`

The storage assets currently present in the pack are:

- `power.prometheus.core`
- `power.elasticsearch.logs`
- `power.mysql.events`

## Quick Start

For the default demo entry, run:

```bash
make power-demo
```

Use the sample name `power-trusted-workspace`:

```bash
make quickstart QUICKSTART_SAMPLE=examples/power-trusted-workspace
```

API: `http://localhost:8080` | Web UI: `http://localhost:5173`

API only:

```bash
go run ./cmd/umodel-server --quickstart --quickstart-sample power-trusted-workspace
```

## Import

Import the bundled sample into another workspace with the sample name:

```bash
curl -X POST http://localhost:8080/api/v1/samples/demo/power-trusted-workspace:import \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Or use the CLI:

```bash
go run ./cmd/umctl --addr http://localhost:8080 sample import demo power-trusted-workspace
```

## Query Ideas

These examples are meant to read naturally to business and technical users.

```bash
go run ./cmd/umctl --addr http://localhost:8080 query run demo ".entity with(domain='power', name='power.station', query='station') | project __entity_id__, display_name, status, owner, region"

go run ./cmd/umctl --addr http://localhost:8080 query run demo ".entity_set with(domain='power', name='power.device') | entity-call list_data_set(['metric_set', 'log_set', 'event_set'], true)"

go run ./cmd/umctl --addr http://localhost:8080 query run demo ".entity_set with(domain='power', name='power.device', ids=['<device-id>']) | entity-call get_metrics('power', 'power.device.metrics', 'load_pct', step='1m')"

go run ./cmd/umctl --addr http://localhost:8080 query run demo ".entity_set with(domain='power', name='power.device', ids=['<device-id>']) | entity-call get_logs('power', 'power.device.logs', query='level = \"ERROR\"')"

go run ./cmd/umctl --addr http://localhost:8080 query run demo ".umodel with(kind='event_set', domain='power') | project domain,name,kind | limit 10"

go run ./cmd/umctl --addr http://localhost:8080 query run demo ".topo | graph-call getDirectRelations([(:\"power@power.station\" {__entity_id__: '<station-id>'})])"
```

The sample also supports runbook discovery:

```bash
go run ./cmd/umctl --addr http://localhost:8080 query run demo ".umodel with(kind='runbook_set', name='power.device.ops')"
```

Useful traversal ideas:

- start at a station, then walk to feeders, transformers, and devices
- inspect a device's metrics, logs, and events before deciding what failed
- check the model registry when you need to know which algorithm asset is active
- compare ownership, version, and status before trusting a signal in a downstream workflow

## Design Decisions

- **Trusted data space first.** The pack is built to show how governance and operational data live together in one workspace.
- **Topology is the spine.** Station → feeder → transformer → device gives a clear traversal path for humans and agents.
- **Telemetry is attached, not implied.** Metrics, logs, and events are modeled as datasets so the graph can discover them.
- **Models are assets.** The model registry makes algorithm versions and operational status visible as part of the workspace.
- **Knowledge is contextual.** Evidence and metadata stay within the same governed sample so provenance is preserved.
- **Plan-driven by design.** UModel returns query plans, so the workspace teaches agents how to find the right data without hand-writing downstream queries.

## Notes

- The pack is currently small by design and can grow with more power entities, data links, and knowledge assets later.
- File names and sample names are intentionally explicit so import, quickstart, and query examples stay stable.
