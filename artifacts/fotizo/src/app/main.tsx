import { createRoot } from "react-dom/client";
import App from "./App";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Dismiss the boot splash (declared in index.html) once the app has mounted.
const splash = document.getElementById("app-splash");
if (splash) {
  requestAnimationFrame(() => splash.classList.add("is-hidden"));
  setTimeout(() => splash.remove(), 700);
}
