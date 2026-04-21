import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

document.documentElement.lang = "pt-BR";

document.title = window.location.pathname.startsWith("/admin")
  ? "Dyoli Admin"
  : "Estúdio Dyoli Godim";

createRoot(document.getElementById("root")!).render(<App />);
