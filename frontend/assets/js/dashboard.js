async function renderDashboard() {
  const events = await apiGet("/api/v1/trl/events");
  const counts = { Low: 0, Mid: 0, High: 0 };
  let confidenceSum = 0;
  let missingEvidence = 0;
  const monthCounts = {};
  const agentConfidence = { Retrieval: [], "Pseudo-Start": [], Rubric: [], Fusion: [] };

  events.forEach((event) => {
    counts[event.final_class] = (counts[event.final_class] || 0) + 1;
    confidenceSum += event.confidence || 0;
    missingEvidence += event.rubric_log?.missing_evidence?.length ? 1 : 0;
    const month = (event.created_at || "").slice(0, 7) || "unknown";
    monthCounts[month] = (monthCounts[month] || 0) + 1;
    agentConfidence.Retrieval.push(event.retrieval_log?.mean_similarity || 0);
    agentConfidence["Pseudo-Start"].push(event.pseudo_start_log?.confidence || 0);
    agentConfidence.Rubric.push(Math.max(...Object.values(event.rubric_log?.rubric_scores || { x: 0 })));
    agentConfidence.Fusion.push(event.confidence || 0);
  });

  const avg = events.length ? confidenceSum / events.length : 0;
  document.querySelector("[data-total]").textContent = events.length;
  document.querySelector("[data-low]").textContent = counts.Low;
  document.querySelector("[data-mid]").textContent = counts.Mid;
  document.querySelector("[data-high]").textContent = counts.High;
  document.querySelector("[data-confidence]").textContent = confidencePct(avg);
  document.querySelector("[data-missing]").textContent = missingEvidence;

  const monthLabels = Object.keys(monthCounts).sort();
  new Chart(document.getElementById("monthlyChart"), { type: "line", data: { labels: monthLabels, datasets: [{ label: "Analyses", data: monthLabels.map((m) => monthCounts[m]), borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,.16)", tension: 0.35, fill: true }] }, options: chartOptions() });
  new Chart(document.getElementById("classChart"), { type: "bar", data: { labels: ["Low", "Mid", "High"], datasets: [{ label: "TRL Class", data: [counts.Low, counts.Mid, counts.High], backgroundColor: ["#ff687d", "#f5c84c", "#38d996"] }] }, options: chartOptions() });

  const agentLabels = Object.keys(agentConfidence);
  const avgAgent = agentLabels.map((label) => { const values = agentConfidence[label]; return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0; });
  new Chart(document.getElementById("agentChart"), { type: "radar", data: { labels: agentLabels, datasets: [{ label: "Average confidence", data: avgAgent, borderColor: "#2f80ff", backgroundColor: "rgba(47,128,255,.18)" }] }, options: chartOptions() });

  document.getElementById("recentEvents").innerHTML = events.slice(0, 8).map((event) => `
    <tr><td>${event.event_id}</td><td>${eventTitle(event)}</td><td><span class="status ${event.final_class}">${event.final_class}</span></td><td>${confidencePct(event.confidence)}</td><td><a class="button" href="result.html?event_id=${event.event_id}">View</a></td></tr>
  `).join("") || `<tr><td colspan="5" class="muted">No events yet. Run an analysis from the input page.</td></tr>`;
}

function chartOptions() {
  return { responsive: true, plugins: { legend: { labels: { color: "#e7f2ff" } } }, scales: { x: { ticks: { color: "#8fa7c2" }, grid: { color: "rgba(143,167,194,.12)" } }, y: { ticks: { color: "#8fa7c2" }, grid: { color: "rgba(143,167,194,.12)" }, beginAtZero: true } } };
}

document.addEventListener("DOMContentLoaded", () => renderDashboard().catch((error) => {
  document.getElementById("recentEvents").innerHTML = `<tr><td colspan="5" class="muted">${error.message}. Start the FastAPI backend.</td></tr>`;
}).finally(() => renderExperimentDashboard()));

async function fetchOptionalText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} not found`);
  return response.text();
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.match(/("[^"]*(?:""[^"]*)*"|[^,]*)/g).filter((_, i) => i % 2 === 0).map((value) => value.replace(/^"|"$/g, "").replace(/""/g, "\""));
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

async function renderExperimentDashboard() {
  const status = document.getElementById("experimentStatus");
  if (!status) return;
  try {
    const [summary, leaderboardCsv, classwiseCsv, pseudoCsv, explanationsText] = await Promise.all([
      fetch("assets/data/dashboard_summary.json").then((r) => { if (!r.ok) throw new Error("dashboard_summary.json not found"); return r.json(); }),
      fetchOptionalText("assets/data/model_leaderboard.csv"),
      fetchOptionalText("assets/data/classwise_metrics.csv"),
      fetchOptionalText("assets/data/pseudo_start_distribution.csv"),
      fetchOptionalText("assets/data/sample_explanations.jsonl").catch(() => ""),
    ]);
    const leaderboard = parseCsv(leaderboardCsv);
    const classwise = parseCsv(classwiseCsv);
    const pseudo = parseCsv(pseudoCsv);
    status.textContent = `${summary.dataset.n_total.toLocaleString()} samples · best safe macro-F1: ${summary.best_deployment_safe_model} · best safe accuracy: ${summary.best_deployment_safe_model_by_accuracy || summary.best_deployment_safe_model}`;
    document.getElementById("leaderboardRows").innerHTML = leaderboard.map((row) => `<tr><td>${row.model}</td><td>${row.uses_start_trl === "True" || row.uses_start_trl === "true" ? "Used" : "Excluded"}</td><td>${Number(row.test_accuracy).toFixed(3)}</td><td>${Number(row.test_macro_f1).toFixed(3)}</td><td>${Number(row.test_weighted_f1).toFixed(3)}</td><td>${Number(row.test_mae).toFixed(3)}</td></tr>`).join("");
    new Chart(document.getElementById("modelCompareChart"), { type: "bar", data: { labels: leaderboard.map((row) => row.model.replace("alg", "A")), datasets: [{ label: "Accuracy", data: leaderboard.map((row) => Number(row.test_accuracy)), backgroundColor: "#22d3ee" }, { label: "Macro-F1", data: leaderboard.map((row) => Number(row.test_macro_f1)), backgroundColor: "#38d996" }] }, options: chartOptions() });
    const models = [...new Set(classwise.map((row) => row.model))];
    new Chart(document.getElementById("classwiseChart"), { type: "bar", data: { labels: models.map((x) => x.replace("alg", "A")), datasets: ["Low", "Mid", "High"].map((klass, idx) => ({ label: `${klass} F1`, data: models.map((model) => Number(classwise.find((row) => row.model === model && row.class === klass)?.f1 || 0)), backgroundColor: ["#ff687d", "#f5c84c", "#38d996"][idx] })) }, options: chartOptions() });
    new Chart(document.getElementById("pseudoDistChart"), { type: "doughnut", data: { labels: pseudo.map((row) => row.bucket), datasets: [{ data: pseudo.map((row) => Number(row.count)), backgroundColor: ["#ff687d", "#f5c84c", "#38d996"] }] }, options: { responsive: true, plugins: { legend: { labels: { color: "#e7f2ff" } } } } });
    const firstExplanation = explanationsText.trim().split(/\r?\n/).filter(Boolean)[0];
    document.getElementById("sampleExplanation").textContent = firstExplanation ? JSON.stringify(JSON.parse(firstExplanation), null, 2) : "No explanation samples exported yet.";
  } catch (error) {
    status.textContent = "Run trl_experiments to populate batch results.";
    document.getElementById("leaderboardRows").innerHTML = `<tr><td colspan="6" class="muted">${error.message}</td></tr>`;
  }
}
