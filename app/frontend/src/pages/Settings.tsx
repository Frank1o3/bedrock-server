import React, { useState, useEffect } from "react";
import axios from "axios";

const Settings: React.FC = () => {
	const [envVars, setEnvVars] = useState<{ [key: string]: string }>({});
	const [selectedVar, setSelectedVar] = useState<string>("");
	const [newValue, setNewValue] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(true);
	const [username, setUsername] = useState<string>("");
	const [password, setPassword] = useState<string>("");

	// Get cookies
	const getCookie = React.useCallback((name: string) => {
		const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
		return match ? decodeURIComponent(match[2]) : null;
	}, []);

	// Fetch environment variables
	const fetchEnvVars = React.useCallback(async () => {
		const savedUsername = getCookie("username");
		const savedPassword = getCookie("password");

		if (!savedUsername || !savedPassword) {
			setLoading(false);
			return;
		}

		setUsername(savedUsername);
		setPassword(savedPassword);

		try {
			const authRes = await axios.post("/api/auth", {
				username: savedUsername,
				password: savedPassword,
			});
			if (authRes.data.authenticated) {
				const response = await axios.get("/api/settings");
				setEnvVars(response.data.env_vars);
			}
		} catch (error) {
			console.error("Error fetching environment variables:", error);
		} finally {
			setLoading(false);
		}
	}, [getCookie]);

	// Handle env variable update
	const handleUpdate = async () => {
		if (!selectedVar || !newValue) {
			alert("Please select a variable and enter a new value.");
			return;
		}

		try {
			await axios.post("/api/settings", {
				username,
				password,
				option: selectedVar,
				update: newValue,
			});
			fetchEnvVars(); // Refresh the env vars after update
		} catch (error) {
			console.error("Error updating environment variable:", error);
			alert("Failed to update environment variable.");
		}
	};

	useEffect(() => {
		fetchEnvVars();
	}, [fetchEnvVars]);

	return loading ? (
		<div style={styles.loading}>Loading...</div>
	) : (
		<div style={styles.pageContainer}>
			<h2 style={styles.title}>Server Environment Variables</h2>
			<div style={styles.formContainer}>
				<div style={styles.inputGroup}>
					<label style={styles.label}>Select a variable:</label>
					<select
						style={styles.select}
						value={selectedVar}
						onChange={(e) => setSelectedVar(e.target.value)}
					>
						<option value="">
							-- Select an environment variable --
						</option>
						{Object.keys(envVars).map((key) => (
							<option key={key} value={key}>
								{key} ({envVars[key]})
							</option>
						))}
					</select>
				</div>
				<div style={styles.inputGroup}>
					<label style={styles.label}>New value:</label>
					<input
						style={styles.input}
						type="text"
						placeholder="Enter new value"
						value={newValue}
						onChange={(e) => setNewValue(e.target.value)}
					/>
				</div>
				<div style={styles.buttonContainer}>
					<button style={styles.button} onClick={handleUpdate}>
						Update
					</button>
				</div>
			</div>
		</div>
	);
};

const styles: { [key: string]: React.CSSProperties } = {
	pageContainer: {
		display: "flex",
		flexDirection: "column",
		padding: "20px",
		backgroundColor: "#1b1f27",
		color: "#00FF41",
		height: "100%",
		width: "100%",
		fontFamily: "monospace",
	},

	title: {
		fontSize: "24px",
		color: "#00FF41",
		marginBottom: "20px",
	},

	formContainer: {
		display: "flex",
		flexDirection: "column",
		gap: "20px",
	},

	inputGroup: {
		display: "flex",
		flexDirection: "column",
	},

	label: {
		fontSize: "14px",
		color: "#ddd",
		marginBottom: "6px",
	},

	select: {
		padding: "10px",
		fontSize: "14px",
		borderRadius: "5px",
		border: "1px solid #444",
		backgroundColor: "#222831",
		color: "#00FF41",
		width: "20%",
	},

	input: {
		padding: "10px",
		fontSize: "14px",
		borderRadius: "5px",
		border: "1px solid #444",
		backgroundColor: "#222831",
		color: "#00FF41",
		width: "20%",
	},

	buttonContainer: {
		display: "flex",
		gap: "10px",
		marginTop: "10px",
	},

	button: {
		padding: "10px 20px",
		fontSize: "14px",
		color: "#00FF41",
		backgroundColor: "#333",
		border: "1px solid #00FF41",
		borderRadius: "5px",
		cursor: "pointer",
		transition: "background-color 0.3s",
	},

	buttonHover: {
		backgroundColor: "#145523",
	},
};

export default Settings;
