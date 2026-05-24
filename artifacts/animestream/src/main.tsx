import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (typeof apiBaseUrl === "string" && apiBaseUrl.trim() !== "") {
  const normalized = apiBaseUrl.trim().replace(/\/+$/, "").replace(/\/api$/, "");
  setBaseUrl(normalized);
} else if (typeof window !== "undefined") {
  const host = window.location.host;
  if (host.includes("animestream") && host.includes("railway.app")) {
    const derivedHost = host.replace("animestream", "api-server");
    setBaseUrl(`https://${derivedHost}`);
  }
}

createRoot(document.getElementById("root")!).render(<App />);
