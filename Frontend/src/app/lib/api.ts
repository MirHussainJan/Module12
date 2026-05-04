const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function apiGet(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function apiPost(path: string, body: unknown, method = "POST") {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      message = await response.text();
    }
    throw new Error(message);
  }

  return response.json();
}
