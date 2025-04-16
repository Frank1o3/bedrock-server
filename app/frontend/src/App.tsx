import React, { useState, useEffect, useCallback } from "react";
import { CSSProperties } from "react";
import Sidebar from "./components/Sidebar";
import Console from "./pages/Console";
import Mods from "./pages/Mods";
import Settings from "./pages/Settings";
import Login from "./components/Login";
import axios from "axios";

const App: React.FC = () => {
	const [activePage, setActivePage] = useState("Console");
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [loading, setLoading] = useState(true);

	// Example: persistent login on mount
	useEffect(() => {
		axios
			.get("/api/auth/session", { withCredentials: true })
			.then((res) => {
				if (res.data.authenticated) {
					setIsLoggedIn(true);
				}
			})
			.catch((err) => {
				console.error("Session check failed:", err);
			})
			.finally(() => {
				setLoading(false);
			});
	}, []);

	const handleLogin = async (
		username: string,
		password: string,
		isLogin: boolean
	) => {
		setLoading(true);
		try {
			const res = await axios.post(
				"/api/auth/login",
				{ username, password, login: isLogin },
				{ withCredentials: true }
			);

			if (res.data.success) {
				setIsLoggedIn(true);
			} else {
				alert(res.data.detail || "Authentication failed");
			}
		} catch (err) {
			console.error("Login error:", err);
			alert("Server error");
		} finally {
			setLoading(false);
		}
	};

	const getPageComponent = useCallback(() => {
		if (loading) return <div>Loading...</div>;
		if (!isLoggedIn) return <Login onAuthSubmit={handleLogin} />;

		switch (activePage) {
			case "Console":
				return <Console />;
			case "Mods":
				return <Mods />;
			case "Settings":
				return <Settings />;
			default:
				return <Console />;
		}
	}, [loading, isLoggedIn, activePage]);

	return (
		<div style={styles.app}>
			{isLoggedIn && !loading && (
				<Sidebar setActivePage={setActivePage} />
			)}
			<div style={styles.main}>{getPageComponent()}</div>
		</div>
	);
};

const styles: { [key: string]: CSSProperties } = {
	app: {
		display: "flex",
		height: "100%",
		width: "100%",
	},
	main: {
		flexGrow: 1,
		display: "flex",
		justifyContent: "center",
		alignItems: "flex-start",
		background: "#333",
		padding: "20px",
		overflowY: "auto",
	},
};

export default App;
