import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1",
  withCredentials: true,
});

// Turns any API error into one readable sentence.
export function errorMessage(err) {
  if (!err.response) return "Can’t reach the server. Check your connection and try again.";
  const { error, details } = err.response.data ?? {};
  if (details) {
    const first = Object.values(details).flat()[0];
    if (first) return first;
  }
  return error ?? "Something went wrong. Try again.";
}