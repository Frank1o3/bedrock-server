import React, { useEffect, useState, useRef } from "react";
import { CSSProperties } from "react";
import axios from "axios";

const Console: React.FC = () => {
	const [bedrockLogs, setBedrockLogs] = useState<string[]>([]);
	const [bashLogs, setBashLogs] = useState<string[]>([]);
	const [bedrockCommand, setBedrockCommand] = useState("");

	const [bashCommand, setBashCommand] = useState("");
	const ws = useRef<WebSocket | null>(null);
	const bedrockLogRef = useRef<HTMLDivElement | null>(null);
	const bashLogRef = useRef<HTMLDivElement | null>(null);

	// State to track the hover state of individual buttons
	const [hoveredButton, setHoveredButton] = useState<string | null>(null);

	useEffect(() => {
		ws.current = new WebSocket(`ws://${window.location.host}/ws`);

		ws.current.onmessage = (event) => {
			const data = JSON.parse(event.data);
			const { source, message } = data;

			if (source === "bedrock") {
				setBedrockLogs((prev) => [...prev, message]);
			} else if (source === "bash") {
				setBashLogs((prev) => [...prev, message]);
			}
		};

		return () => {
			ws.current?.close();
		};
	}, []);

	useEffect(() => {
		if (bedrockLogRef.current) {
			bedrockLogRef.current.scrollTop =
				bedrockLogRef.current.scrollHeight;
		}
	}, [bedrockLogs]);

	useEffect(() => {
		if (bashLogRef.current) {
			bashLogRef.current.scrollTop = bashLogRef.current.scrollHeight;
		}
	}, [bashLogs]);

	const sendCommand = async (
		command: string,
		endpoint: string,
		setter: React.Dispatch<React.SetStateAction<string>>
	) => {
		try {
			const res = await axios.post(
				endpoint,
				{ command: command },
				{ withCredentials: true }
			);

			if (!res.data.success) {
				throw new Error(`Failed to send command: ${res.status}`);
			}
		} catch (error) {
			console.error("Command error:", error);
			// Optional: show user feedback, maybe a toast or an alert div
		}
		setter("");
	};

	const handleReset = async (message: string) => {
		await sendCommand(
			`kick @a ${message}`,
			"/send_command",
			setBedrockCommand
		);
		await sendCommand("stop", "/send_command", setBedrockCommand);
		setTimeout(() => {
			sendCommand("start", "/server_command", setBedrockCommand);
		}, 1000);
	};

	return (
		<div style={styles.pageContainer}>
			{/* TOP SECTION - Terminals */}
			<div style={styles.terminalsContainer}>
				<div style={styles.consoleWrapper}>
					<h2 style={styles.title}>🖥️ Bedrock Server Console</h2>
					<div ref={bedrockLogRef} style={styles.console}>
						{bedrockLogs.map((log, idx) => (
							<div key={idx}>{log}</div>
						))}
					</div>
					<div style={styles.inputContainer}>
						<input
							type="text"
							value={bedrockCommand}
							onChange={(e) => setBedrockCommand(e.target.value)}
							placeholder="Enter Bedrock command"
							style={styles.input}
						/>
						<button
							onClick={() =>
								sendCommand(
									bedrockCommand,
									"/send_command",
									setBedrockCommand
								)
							}
							style={{
								...styles.button,
								background:
									hoveredButton === "bedrock"
										? "#145523"
										: "#28a745",
							}}
							onMouseEnter={() => setHoveredButton("bedrock")}
							onMouseLeave={() => setHoveredButton(null)}
						>
							Send
						</button>
					</div>
				</div>

				<div style={styles.consoleWrapper}>
					<h2 style={styles.title}>💻 Bash Terminal</h2>
					<div ref={bashLogRef} style={styles.console}>
						{bashLogs.map((log, idx) => (
							<div key={idx}>{log}</div>
						))}
					</div>
					<div style={styles.inputContainer}>
						<input
							type="text"
							value={bashCommand}
							onChange={(e) => setBashCommand(e.target.value)}
							placeholder="Enter Bash command"
							style={styles.input}
						/>
						<button
							onClick={() =>
								sendCommand(
									bashCommand,
									"/send_terminal_command",
									setBashCommand
								)
							}
							style={{
								...styles.button,
								background:
									hoveredButton === "bash"
										? "#145523"
										: "#28a745",
							}}
							onMouseEnter={() => setHoveredButton("bash")}
							onMouseLeave={() => setHoveredButton(null)}
						>
							Send
						</button>
					</div>
				</div>
			</div>
			<div style={{ display: "flex", gap: "10px", padding: "10px" }}>
				<button
					onClick={() => {
						sendCommand(
							"execute at @r run summon lightning_bolt ~ ~ ~",
							"/send_command",
							setBedrockCommand
						);
					}}
					style={{
						...styles.button,
						background:
							hoveredButton === "strike" ? "#145523" : "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("strike")}
					onMouseLeave={() => setHoveredButton(null)}
				>
					Strike a Player
				</button>
				<button
					onClick={() => {
						sendCommand(
							"reload",
							"/send_command",
							setBedrockCommand
						);
					}}
					style={{
						...styles.button,
						background:
							hoveredButton === "reload" ? "#145523" : "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("reload")}
					onMouseLeave={() => setHoveredButton(null)}
				>
					Reload Mods
				</button>
				<button
					onClick={() => {
						sendCommand(
							"start",
							"/server_command",
							setBedrockCommand
						);
					}}
					style={{
						...styles.button,
						background:
							hoveredButton === "start" ? "#145523" : "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("start")}
					onMouseLeave={() => setHoveredButton(null)}
				>
					Start Bedrock Server
				</button>
				<button
					onClick={() => {
						sendCommand("stop", "/send_command", setBedrockCommand);
					}}
					style={{
						...styles.button,
						background:
							hoveredButton === "stop" ? "#145523" : "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("stop")}
					onMouseLeave={() => setHoveredButton(null)}
				>
					Stop Bedrock Server
				</button>
				<button
					onClick={() => handleReset("Restarting server...")}
					style={{
						...styles.button,
						background:
							hoveredButton === "reset" ? "#145523" : "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("reset")}
					onMouseLeave={() => setHoveredButton(null)}
				>
					Reset Server
				</button>
				<button
					onClick={() => {
						sendCommand(
							"start bash",
							"/server_command",
							setBedrockCommand
						);
					}}
					style={{
						...styles.button,
						background:
							hoveredButton === "startBash"
								? "#145523"
								: "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("startBash")}
					onMouseLeave={() => setHoveredButton(null)}
				>
					Start Server Bash
				</button>
				<button
					onClick={() => {
						sendCommand(
							"stop bash",
							"/server_command",
							setBedrockCommand
						);
					}}
					style={{
						...styles.button,
						background:
							hoveredButton === "stopBash"
								? "#145523"
								: "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("stopBash")}
					onMouseLeave={() => setHoveredButton(null)}
				>
					Stop Bedrock Bash
				</button>
				<button
					onClick={() => {
						sendCommand(
							"./backup.sh",
							"/send_terminal_command",
							setBashCommand
						);
					}}
					style={{
						...styles.button,
						background:
							hoveredButton === "backup" ? "#145523" : "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("backup")}
					onMouseLeave={() => setHoveredButton(null)}
				>
					Backup
				</button>
				<button
					onClick={() => {
						sendCommand(
							"./rollback.sh",
							"/send_terminal_command",
							setBashCommand
						);
						handleReset("Rolling back...");
					}}
					style={{
						...styles.button,
						background:
							hoveredButton === "rollback"
								? "#145523"
								: "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("rollback")}
					onMouseLeave={() => setHoveredButton(null)}
				>
					Rollback
				</button>
				<button
					onClick={() => {
						sendCommand(
							'noip-duc -g all.ddnskey.com --username "$NO_IP_USERNAME" --password "$NO_IP_PASSWORD" >> /bedrock/noip.log 2>&1',
							"/send_terminal_command",
							setBashCommand
						);
					}}
					style={{
						...styles.button,
						background:
							hoveredButton === "updateDDNS"
								? "#145523"
								: "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("updateDDNS")}
					onMouseLeave={() => setHoveredButton(null)}
				>
					Update DDNS
				</button>
			</div>
		</div>
	);
};

const styles: { [key: string]: CSSProperties } = {
	pageContainer: {
		display: "flex",
		flexDirection: "column",
		height: "100%",
		width: "100%",
		background: "#1b1f27",
	},
	terminalsContainer: {
		display: "flex",
		gap: "20px",
		padding: "20px",
		height: "40%",
	},
	consoleWrapper: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
	},
	console: {
		flex: 1,
		overflowY: "auto",
		border: "2px solid #444",
		padding: "10px",
		background: "#222831",
		color: "#00FF41",
		fontFamily: "monospace",
		borderRadius: "8px",
		boxShadow: "0px 4px 10px rgba(0,0,0,0.5)",
		fontSize: "14px",
	},
	title: {
		color: "#ddd",
		fontSize: "18px",
		marginBottom: "10px",
	},
	inputContainer: {
		marginTop: "10px",
		display: "flex",
		gap: "10px",
	},
	input: {
		flexGrow: 1,
		padding: "8px",
		fontSize: "14px",
		border: "1px solid #555",
		background: "#1b1f27",
		color: "#ddd",
		borderRadius: "4px",
	},
	button: {
		padding: "8px 15px",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		transition: "background 0.3s",
	},
};

export default Console;
