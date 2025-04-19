import axios from "axios";
import React, { useState, useEffect } from "react";
import Cookies from "js-cookie";

const Settings: React.FC = () => {
	const [envVars, setEnvVars] = useState<{ [key: string]: string }>({});
	const [selectedVar, setSelectedVar] = useState<string>("");
	const [newValue, setNewValue] = useState<string>("");
	const [statusMsg, setStatusMsg] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState<boolean>(false);

	useEffect(() => {
		fetchEnvVars();
	}, []);

	const fetchEnvVars = async () => {
		try {
			const response = await axios.get("/api/settings", {
				headers: {
					username: Cookies.get("username"),
					password: Cookies.get("password"),
				}
			});
			setEnvVars(response.data);
		} catch (error) {
			console.error("Error fetching env vars:", error);
		}
	};

	const handleUpdate = async () => {
		if (!selectedVar || !newValue) {
			setStatusMsg("Please select a variable and enter a new value.");
			return;
		}
		setIsUpdating(true);
		try {
			await axios.post("/api/settings", {
				username: Cookies.get("username"),
				password: Cookies.get("password"),
				option: selectedVar,
				update: newValue,
			});
			setStatusMsg(`✅ "${selectedVar}" updated successfully.`);
			fetchEnvVars();
			setSelectedVar(""); // optional: reset form
			setNewValue("");
		} catch (error) {
			setStatusMsg("❌ Failed to update variable.");
			console.error("Error updating env var:", error);
		}
		setIsUpdating(false);
	};

	return (
		<div style={styles.container}>
			<h2 style={styles.title}>Environment Settings</h2>
			<select
				style={styles.select}
				value={selectedVar}
				onChange={(e) => setSelectedVar(e.target.value)}
			>
				<option value="">Select an environment variable</option>
				{Object.keys(envVars)
					.sort()
					.map((key) => (
						<option key={key} value={key}>
							{key} ({envVars[key]})
						</option>
					))}
			</select>

			<input
				type="text"
				style={styles.input}
				placeholder="Enter new value"
				value={newValue}
				onChange={(e) => setNewValue(e.target.value)}
			/>

			<button
				style={{
					...styles.button,
					cursor: isUpdating ? "not-allowed" : "pointer",
					opacity: isUpdating ? 0.6 : 1,
				}}
				onClick={handleUpdate}
				disabled={isUpdating}
			>
				{isUpdating ? "Updating..." : "Update"}
			</button>

			{statusMsg && <div style={styles.status}>{statusMsg}</div>}
		</div>
	);
};

const styles: { [key: string]: React.CSSProperties } = {
	container: {
		padding: "20px",
		background: "#1b1f27",
		color: "#00FF41",
		fontFamily: "monospace",
		display: "flex",
		flexDirection: "column",
		maxWidth: "400px",
		margin: "0 auto",
	},

	title: {
		fontSize: "18px",
		marginBottom: "10px",
	},

	select: {
		padding: "8px",
		marginBottom: "10px",
		borderRadius: "4px",
		border: "1px solid #444",
		background: "#222831",
		color: "#00FF41",
	},

	input: {
		padding: "8px",
		marginBottom: "10px",
		borderRadius: "4px",
		border: "1px solid #444",
		background: "#222831",
		color: "#00FF41",
	},

	button: {
		padding: "10px",
		background: "#28a745",
		border: "none",
		borderRadius: "4px",
		color: "#fff",
		fontWeight: "bold",
	},

	status: {
		marginTop: "10px",
		color: "#9affc7",
		fontSize: "14px",
	},
};

export default Settings;
