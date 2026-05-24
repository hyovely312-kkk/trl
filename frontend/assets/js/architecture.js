document.addEventListener("DOMContentLoaded", async () => {
  try { const data = await apiGet("/api/v1/trl/agents"); document.getElementById("agentDefinitions").textContent = formatJson(data); }
  catch (error) { document.getElementById("agentDefinitions").textContent = `${error.message}. Static diagram is still available.`; }
  renderAlgorithmArchitectures().catch(() => { document.getElementById("algorithmArchitectures").innerHTML = `<div class="panel"><p class="muted">Algorithm architecture data is not available.</p></div>`; });
});
async function renderAlgorithmArchitectures() { const data = await fetchStaticJson("assets/data/algorithm_architecture.json"); document.getElementById("algorithmArchitectures").innerHTML = Object.entries(data).map(([key, value]) => `<div class="card"><div class="section-title"><h2>${key}</h2><span class="status ${value.uses_start_trl ? "High" : "Mid"}">${value.uses_start_trl ? "Upper-bound" : "No Start"}</span></div><p class="muted">${value.purpose}</p><ol>${value.flow.map((step) => `<li>${step}</li>`).join("")}</ol></div>`).join(""); }
