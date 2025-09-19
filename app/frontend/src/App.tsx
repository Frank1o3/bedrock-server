import React, { useState, useEffect, useCallback } from "react";
import { CSSProperties } from "react";
import Sidebar from "./components/Sidebar";
import Console from "./pages/Console";
import Mods from "./pages/Mods";
import Settings from "./pages/Settings";
import Login from "./components/Login";
import axios from "axios";

interface UserSession {
	username: string;
	role: 'admin' | 'user';
	authenticated: boolean;
}

const App: React.FC = () => {
	const [activePage, setActivePage] = useState("Console");
	const [userSession, setUserSession] = useState<UserSession | null>(null);
	const [loading, setLoading] = useState(true);
	const [authError, setAuthError] = useState<string>("");

	// Check for existing session on mount
	useEffect(() => {
		checkSession();
	}, []);

	const checkSession = async () => {
		try {
			const response = await axios.get("/api/auth/session", { withCredentials: true });
			if (response.data.authenticated) {
				setUserSession({
					username: response.data.username,
					role: response.data.role,
					authenticated: true
				});
				setAuthError("");
			} else {
				setUserSession(null);
			}
		} catch (error) {
			console.error("Session check failed:", error);
			setUserSession(null);
		} finally {
			setLoading(false);
		}
	};

	const handleLogin = async (
		username: string,
		password: string,
		isLogin: boolean
	) => {
		setLoading(true);
		setAuthError("");
		
		try {
			const response = await axios.post(
				"/api/auth/login",
				{ username, password, login: isLogin },
				{ withCredentials: true }
			);

			if (response.data.success && response.data.authenticated) {
				setUserSession({
					username: response.data.username,
					role: response.data.role,
					authenticated: true
				});
				setAuthError("");
			} else {
				setAuthError(response.data.message || "Authentication failed");
			}
		} catch (error: any) {
			console.error("Login error:", error);
			if (error.response?.data?.detail) {
				setAuthError(error.response.data.detail);
			} else if (error.response?.status === 400) {
				setAuthError("Username already exists. Try logging in instead.");
			} else if (error.response?.status === 401) {
				setAuthError("Invalid username or password.");
			} else {
				setAuthError("Server error. Please try again.");
			}
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = async () => {
		try {
			await axios.post("/api/auth/logout", {}, { withCredentials: true });
		} catch (error) {
			console.error("Logout error:", error);
		}
		setUserSession(null);
		setActivePage("Console");
	};

	const getPageComponent = useCallback(() => {
		if (loading) {
			return (
				<div style={styles.loadingContainer}>
					<div style={styles.loadingSpinner}>🔄</div>
					<p>Loading...</p>
				</div>
			);
		}
		
		if (!userSession?.authenticated) {
			return (
				<Login 
					onAuthSubmit={handleLogin} 
					loading={loading}
					error={authError}
				/>
			);
		}

		// Role-based page access
		if (userSession.role === 'user') {
			// Standard users only see server status
			return <ServerStatus userSession={userSession} onLogout={handleLogout} />;
		}

		// Admin users can access all pages
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
	}, [loading, userSession, activePage, authError, handleLogin, handleLogout]);

	return (
		<div style={styles.app}>
			{userSession?.authenticated && !loading && userSession.role === 'admin' && (
				<Sidebar 
					setActivePage={setActivePage} 
					userSession={userSession}
					onLogout={handleLogout}
				/>
			)}
			<div style={styles.main}>{getPageComponent()}</div>
		</div>
	);
};

// Create a simple ServerStatus component for non-admin users
const ServerStatus: React.FC<{userSession: UserSession, onLogout: () => void}> = ({ userSession, onLogout }) => {
	const [serverStatus, setServerStatus] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchServerStatus = async () => {
			try {
				const response = await axios.get('/api/server/status', { withCredentials: true });
				setServerStatus(response.data);
			} catch (error) {
				console.error('Failed to fetch server status:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchServerStatus();
		const interval = setInterval(fetchServerStatus, 30000); // Refresh every 30 seconds
		return () => clearInterval(interval);
	}, []);

	return (
		<div style={styles.serverStatusContainer}>
			<div style={styles.serverStatusCard}>
				<div style={styles.userHeader}>
					<h1 style={styles.welcomeTitle}>Welcome, {userSession.username}!</h1>
					<button onClick={onLogout} style={styles.logoutButton}>Logout</button>
				</div>
				
				<h2 style={styles.statusTitle}>🎮 Bedrock Server Status</h2>
				
				{loading ? (
					<div style={styles.statusLoading}>Loading server status...</div>
				) : (
					<div style={styles.statusGrid}>
						<div style={styles.statusItem}>
							<span style={styles.statusLabel}>Status:</span>
							<span style={{...styles.statusValue, color: serverStatus?.server_online ? '#4CAF50' : '#f44336'}}>
								{serverStatus?.server_online ? '🟢 Online' : '🔴 Offline'}
							</span>
						</div>
						{serverStatus?.uptime && (
							<div style={styles.statusItem}>
								<span style={styles.statusLabel}>Uptime:</span>
								<span style={styles.statusValue}>{serverStatus.uptime}</span>
							</div>
						)}
						<div style={styles.statusItem}>
							<span style={styles.statusLabel}>World:</span>
							<span style={styles.statusValue}>{serverStatus?.world_name || 'Main'}</span>
						</div>
					</div>
				)}
				
				<div style={styles.userInfo}>
					<p><strong>Role:</strong> {userSession.role}</p>
					<p><em>Contact an administrator for server management access.</em></p>
				</div>
			</div>
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
	loadingContainer: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		height: "100vh",
		color: "#00FF41",
		fontFamily: "monospace",
	},
	loadingSpinner: {
		fontSize: "48px",
		animation: "spin 2s linear infinite",
		marginBottom: "20px",
	},
	serverStatusContainer: {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		minHeight: "100vh",
		padding: "20px",
		background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
	},
	serverStatusCard: {
		background: "rgba(0, 0, 0, 0.8)",
		padding: "40px",
		borderRadius: "12px",
		boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
		border: "1px solid rgba(255, 255, 255, 0.1)",
		backdropFilter: "blur(10px)",
		maxWidth: "600px",
		width: "100%",
		color: "#fff",
	},
	userHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: "30px",
		borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
		paddingBottom: "20px",
	},
	welcomeTitle: {
		color: "#00FF41",
		margin: 0,
		fontSize: "24px",
	},
	logoutButton: {
		padding: "8px 16px",
		background: "#dc3545",
		color: "#fff",
		border: "none",
		borderRadius: "6px",
		cursor: "pointer",
		transition: "background 0.3s ease",
	},
	statusTitle: {
		textAlign: "center",
		marginBottom: "30px",
		color: "#fff",
	},
	statusGrid: {
		display: "grid",
		gridTemplateColumns: "1fr 1fr",
		gap: "20px",
		marginBottom: "30px",
	},
	statusItem: {
		display: "flex",
		justifyContent: "space-between",
		padding: "15px",
		background: "rgba(255, 255, 255, 0.1)",
		borderRadius: "8px",
		border: "1px solid rgba(255, 255, 255, 0.2)",
	},
	statusLabel: {
		fontWeight: "bold",
		color: "#ccc",
	},
	statusValue: {
		color: "#fff",
	},
	statusLoading: {
		textAlign: "center",
		padding: "40px",
		color: "#ccc",
	},
	userInfo: {
		padding: "20px",
		background: "rgba(0, 123, 255, 0.1)",
		border: "1px solid rgba(0, 123, 255, 0.3)",
		borderRadius: "8px",
		textAlign: "center",
		color: "#87CEEB",
	},
};

export default App;
