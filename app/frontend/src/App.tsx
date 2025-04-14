import React, { useState, useEffect, useCallback } from "react";
import { CSSProperties } from "react";
import Sidebar from "./components/Sidebar";
import Console from "./pages/Console";
import Mods from "./pages/Mods";
import Settings from "./pages/Settings";
import Login from "./components/Login";
import axios from "axios";

const App: React.FC = () => {
	const [activePage, setActivePage] = useState<string>("Console");
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
	const [isAccountCreated, setIsAccountCreated] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);

	const getPageComponent = useCallback(() => {
		if (loading) return <div>Loading...</div>;
		if (!isLoggedIn) return <Login />;
		if (!isAccountCreated)
			return (
				<div style={{ padding: "50px", textAlign: "center" }}>
					Site not loading...
				</div>
			);

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
	}, [loading, isLoggedIn, isAccountCreated, activePage]);

	useEffect(() => {
		const getCookie = (name: string) => {
			const match = document.cookie.match(
				new RegExp(`(^| )${name}=([^;]+)`)
			);
			return match ? decodeURIComponent(match[2]) : null;
		};

		const username = getCookie("username");
		const password = getCookie("password");

		if (!username || !password) {
			setLoading(false);
			return;
		}

		axios
			.post("/api/auth", {
				username: username,
				password: password,
				cookie: true,
			})
			.then((res) => {
				if (res.data.accountCreated) {
					console.log("Account check response:", res.data);
					setIsAccountCreated(res.data.accountCreated);

					axios
						.post("/api/auth", {
							username: username,
							password: password,
							cookie: false,
						})
						.then((res) => {
							console.log("Auth response:", res.data);
							if (res.data.authenticated) {
								setIsLoggedIn(true);
							} else {
								setIsLoggedIn(false);
							}
						});
				}
			})
			.catch((error) => {
				console.error("Authentication or account check failed:", error);
				setIsLoggedIn(false);
			})
			.finally(() => {
				setIsAccountCreated(true);
				setLoading(false);
				setIsLoggedIn(true);
			});
	}, []);

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
