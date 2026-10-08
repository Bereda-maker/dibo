/** Demo mode runs entirely in the browser (no server). Live mode talks to the Hono API. Default is live. */
export const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").replace(/\/$/, "");
export const REGIONS = ["Addis Ababa", "Afar", "Amhara", "Benishangul-Gumuz", "Dire Dawa", "Gambela", "Harari", "Oromia", "Sidama", "Somali", "South Ethiopia", "South West Ethiopia", "Tigray", "Central Ethiopia"];
export const STREAMS = ["Natural Science", "Social Science"];
