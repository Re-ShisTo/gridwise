import { useState, useEffect } from "react";
import { Play, AlertCircle, RefreshCw, Code2, Trash2 } from "lucide-react";

export default function GridWiseDashboard() {
  const [samples, setSamples] = useState({});
  const [selectedSample, setSelectedSample] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState({ status: "checking", time: null });
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchHealth = async () => {
      const t0 = performance.now();
      try {
        const res = await fetch("/health");
        const ms = Math.round(performance.now() - t0);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "ok" && isMounted) {
            setHealth({ status: "ok", time: ms });
            return;
          }
        }
        if (isMounted) setHealth({ status: "bad", time: null });
      } catch {
        if (isMounted) setHealth({ status: "bad", time: null });
      }
    };

    // 1. Initial health check
    fetchHealth();

    // 2. Interval polling
    const interval = setInterval(fetchHealth, 15000);

    // 3. Fetch static samples
    fetch("/static/samples.json")
      .then((res) => res.json())
      .then((data) => {
        if (data.cases && isMounted) {
          const map = {};
          data.cases.forEach((c) => {
            map[c.id] = c.input;
          });
          setSamples(map);
        }
      })
      .catch(() => console.log("samples.json not found"));

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSampleChange = (e) => {
    const id = e.target.value;
    setSelectedSample(id);
    if (id && samples[id]) {
      setJsonInput(JSON.stringify(samples[id], null, 2));
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err) {
      setError(`JSON Parse Error: ${err.message}`);
    }
  };

  const handleClear = () => {
    setJsonInput("");
    setSelectedSample("");
    setResponse(null);
    setError(null);
  };

  const handleRun = async () => {
    setError(null);
    setResponse(null);

    let payload;
    try {
      payload = JSON.parse(jsonInput);
    } catch (err) {
      setError(`Invalid JSON Input:\n${err.message}`);
      return;
    }

    setLoading(true);
    const t0 = performance.now();

    try {
      const res = await fetch("/optimize-energy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ms = Math.round(performance.now() - t0);
      const data = await res.json();

      if (!res.ok) {
        setError(`HTTP ${res.status}\n${JSON.stringify(data, null, 2)}`);
      } else {
        setResponse({ ...data, latency: ms });
      }
    } catch (err) {
      setError(`Network Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) =>
    num !== undefined && num !== null
      ? Number(num).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "—";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-white">
            GridWise
          </h1>
          <span className="text-xs text-slate-400 border-l border-slate-700 pl-3">
            BUP CSE Fest 2026 · LLM-assisted energy scheduling
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              health.status === "ok"
                ? "bg-emerald-500"
                : health.status === "bad"
                  ? "bg-rose-500"
                  : "bg-amber-500"
            }`}
          />
          {health.status === "ok"
            ? `ready · ${health.time} ms`
            : health.status === "bad"
              ? "unhealthy"
              : "checking…"}
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* Left Column: Request Controls & Textarea */}
        <section className="lg:col-span-5 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Request
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSample}
              onChange={handleSampleChange}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-400"
            >
              <option value="">— load sample —</option>
              {Object.keys(samples).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>

            <button
              onClick={handleRun}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run
            </button>

            <button
              onClick={handleFormat}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 cursor-pointer"
            >
              <Code2 className="h-3.5 w-3.5" />
              Format
            </button>

            <button
              onClick={handleClear}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            spellCheck="false"
            placeholder='{"scenario_id":"...","operator_notes":[...],"hours":[...],"battery":{...}}'
            className="h-128 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300 focus:border-sky-400 focus:outline-none resize-y"
          />

          <p className="text-[11px] text-slate-500">
            Tip: Pick a sample or paste custom scenario JSON. Target endpoint:
            <code className="ml-1.5 rounded bg-slate-800 px-1.5 py-0.5 text-sky-400 font-mono">
              POST /optimize-energy
            </code>
          </p>
        </section>

        {/* Right Column: Output Metrics & Tables */}
        <section className="lg:col-span-7 flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Response
          </h2>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-900/50 bg-rose-950/40 p-3 font-mono text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {/* Output Dashboard */}
          {response && (
            <div className="space-y-4">
              {/* Stats Panel */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <StatCard
                  label="Scenario"
                  value={response.scenario_id || "—"}
                />
                <StatCard
                  label="Total Cost"
                  value={formatNumber(response.total_cost_bdt)}
                  unit="BDT"
                />
                <StatCard
                  label="Total Grid"
                  value={formatNumber(response.total_grid_kwh)}
                  unit="kWh"
                />
                <StatCard
                  label="Peak Grid"
                  value={formatNumber(response.peak_grid_kwh)}
                  unit="kWh"
                />
                <StatCard label="Latency" value={response.latency} unit="ms" />
              </div>

              {/* Directives Table */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Directive Interpretation
                </h3>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-800 text-slate-400 font-semibold">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Applies</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Hours</th>
                        <th className="p-2">Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900">
                      {response.directive_interpretation?.map((d, i) => (
                        <tr key={i}>
                          <td className="p-2 font-mono">{d.note_index}</td>
                          <td className="p-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                d.applies
                                  ? "bg-emerald-950 text-emerald-400"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {String(d.applies)}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-sky-400">
                            {d.directive_type}
                          </td>
                          <td className="p-2 font-mono">
                            {d.structured_adjustment?.hours
                              ? `[${d.structured_adjustment.hours.join(", ")}]`
                              : "—"}
                          </td>
                          <td className="p-2 text-slate-300">
                            {d.explanation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hourly Plan Table */}
              <div>
                <h3 className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Hourly Execution Plan
                </h3>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-800 text-slate-400 font-semibold">
                      <tr>
                        <th className="p-2">Hour</th>
                        <th className="p-2 text-right">Grid (kWh)</th>
                        <th className="p-2 text-right">Solar (kWh)</th>
                        <th className="p-2">Action</th>
                        <th className="p-2 text-right">Battery (kWh)</th>
                        <th className="p-2 text-right">After (kWh)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono bg-slate-900">
                      {response.hourly_plan?.map((p) => (
                        <tr key={p.hour}>
                          <td className="p-2 text-slate-400">{p.hour}</td>
                          <td className="p-2 text-right text-slate-200">
                            {formatNumber(p.grid_kwh)}
                          </td>
                          <td className="p-2 text-right text-emerald-400">
                            {formatNumber(p.solar_used_kwh)}
                          </td>
                          <td className="p-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                p.battery_action === "charge"
                                  ? "bg-emerald-950 text-emerald-400"
                                  : p.battery_action === "discharge"
                                    ? "bg-amber-950 text-amber-400"
                                    : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {p.battery_action}
                            </span>
                          </td>
                          <td className="p-2 text-right text-slate-200">
                            {formatNumber(p.battery_kwh)}
                          </td>
                          <td className="p-2 text-right text-slate-200">
                            {formatNumber(p.battery_energy_after_kwh)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Banner */}
              {response.plan_summary && (
                <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-xs text-slate-300">
                  <strong className="text-slate-100">Summary: </strong>
                  {response.plan_summary}
                </div>
              )}
            </div>
          )}

          {/* Empty Placeholder */}
          {!response && !error && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs text-center border border-dashed border-slate-800 rounded-lg">
              <Code2 className="h-8 w-8 mb-2 opacity-50" />
              Load a sample or paste a scenario JSON payload, then click{" "}
              <strong>Run</strong>.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Subcomponent for Metric Cards
function StatCard({ label, value, unit }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-2.5">
      <div className="text-[10px] font-medium uppercase text-slate-400 tracking-wider">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-slate-100">
        {value}
        {unit && (
          <span className="ml-1 text-[10px] font-normal text-slate-400">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
