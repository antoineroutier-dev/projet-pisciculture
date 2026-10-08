import "./world/feedback.css";
import "@fontsource/fraunces/latin-400.css";
import "@fontsource/fraunces/latin-600.css";
import "./ui/tokens.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./ui/foundation.css";
import "./ui/game-shell.css";
import "./ui/dialog.css";
import "./panels/panels.css";
import "./panels/inspector.css";
import "./world/map.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import "./panels/logistics.css";

import "./panels/editorial.css";

import "./hud/time-events.css";

import "./panels/finance.css";

import "./world/world.css";

import "./panels/title.css";
