import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // Add this import
import App from "./App";

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement
);

root.render(
	<BrowserRouter>
		{/* Wrap the app with BrowserRouter */}
		<App />
	</BrowserRouter>
);
