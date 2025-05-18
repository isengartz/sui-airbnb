import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element with ID 'root' not found in the document.");
}

createRoot(rootElement).render(
	<StrictMode>
		<Theme appearance="dark" accentColor="cyan" grayColor="slate">
			<App />
			{/* <ThemePanel /> */}
		</Theme>
	</StrictMode>,
);
