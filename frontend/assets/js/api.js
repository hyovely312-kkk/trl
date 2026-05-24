const apiBase = () => new URLSearchParams(location.search).get("api_base") || localStorage.getItem("TRL_API_BASE") || "http://localhost:8000";

async function apiGet(path) {
  const response = await fetch(`${apiBase()}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed`);
  return response.json();
}

async function apiPost(path, body) {
  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`POST ${path} failed`);
  return response.json();
}

function formatJson(data) {
  return JSON.stringify(data, null, 2);
}

function confidencePct(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function eventTitle(event) {
  return event?.input?.project_title || "Untitled project";
}

async function getLastEvent() {
  const eventId = new URLSearchParams(location.search).get("event_id") || localStorage.getItem("TRL_LAST_EVENT_ID");
  if (eventId) return apiGet(`/api/v1/trl/events/${eventId}`);
  const events = await apiGet("/api/v1/trl/events");
  return events[0];
}
