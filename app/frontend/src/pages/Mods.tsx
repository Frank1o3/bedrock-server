import axios from "axios";
import React, { useState, useEffect, useRef } from "react";

// Define types for the mod data
interface Mod {
	id: number;
	name: string;
	type: "behavior" | "resource";
}

const Mods: React.FC = () => {
	const [hoveredButton, setHoveredButton] = useState<string | null>(null);
	const [selectedMod, setSelectedMod] = useState<Mod | null>(null);
	const [availableMods, setAvailableMods] = useState<Mod[]>([]);
	const [activeMods, setActiveMods] = useState<Mod[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const fetchMods = async () => {
			try {
				const availableResponse = await axios.post("/api/mods/", {
					requestType: "available",
				});
				const activeData = await axios.post("/api/mods/", {
					requestType: "active",
				});

				if (
					availableResponse.status === 200 ||
					availableResponse.status === 201
				) {
					setAvailableMods(availableResponse.data.mods);
				}
				if (activeData.status === 200 || activeData.status === 201) {
					setActiveMods(activeData.data.mods);
				}
			} catch (error) {
				console.error("Error fetching mods:", error);
			}
		};

		fetchMods();
	}, []);

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			const socket = new WebSocket(
				`ws:${window.location.host}/ws/upload`
			);
			socket.onopen = () => {
				socket.send(
					JSON.stringify({
						filename: file.name,
						data: reader.result,
					})
				);
				socket.close();
			};
		};
		reader.readAsArrayBuffer(file);
	};

	const isModSelected = selectedMod !== null;

	return (
		<div style={styles.pageContainer}>
			{/* Header */}
			<div style={styles.header}>
				<h1 style={styles.title}>Mods Management</h1>
			</div>

			{/* Main Content */}
			<div style={styles.mainContent}>
				{/* Available Mods */}
				<div style={styles.section}>
					<h2 style={styles.subtitle}>Available Mods:</h2>
					<div style={styles.modList}>
						{availableMods.map((mod) => (
							<div
								key={mod.id}
								style={{
									...styles.modItem,
									background:
										selectedMod?.id === mod.id
											? "#3c4450"
											: "#2d3137",
								}}
								onClick={() => setSelectedMod(mod)}
							>
								<div>{mod.name}</div>
								<div style={styles.modTypeLabel}>
									{mod.type === "behavior"
										? "Behavior Pack"
										: "Resource Pack"}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Active Mods */}
				<div style={styles.section}>
					<h2 style={styles.subtitle}>Active Mods:</h2>
					<div style={styles.modList}>
						{activeMods.map((mod) => (
							<div
								key={mod.id}
								style={{
									...styles.modItem,
									background:
										selectedMod?.id === mod.id
											? "#3c4450"
											: "#2d3137",
								}}
								onClick={() => setSelectedMod(mod)}
							>
								<div>{mod.name}</div>
								<div style={styles.modTypeLabel}>
									{mod.type === "behavior"
										? "Behavior Pack"
										: "Resource Pack"}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Hidden file input for Upload */}
			<input
				type="file"
				ref={fileInputRef}
				style={{ display: "none" }}
				accept=".mcaddon"
				onChange={handleFileChange}
			/>

			{/* Action Buttons */}
			<div style={styles.actionButtons}>
				{["Enable", "Disable", "Remove"].map((label) => (
					<button
						key={label}
						style={{
							...styles.button,
							background:
								hoveredButton === label
									? "#145523"
									: isModSelected
									? "#2ea650"
									: "#444",
							cursor: isModSelected ? "pointer" : "not-allowed",
						}}
						onMouseEnter={() => setHoveredButton(label)}
						onMouseLeave={() => setHoveredButton(null)}
						disabled={!isModSelected}
						onClick={() => {
							if (isModSelected) {
								console.log(`${label} mod:`, selectedMod?.name);
							}
						}}
					>
						{label} Mod
					</button>
				))}

				<button
					style={{
						...styles.button,
						background:
							hoveredButton === "Upload" ? "#145523" : "#28a745",
					}}
					onMouseEnter={() => setHoveredButton("Upload")}
					onMouseLeave={() => setHoveredButton(null)}
					onClick={handleUploadClick}
				>
					Upload Mod
				</button>
			</div>
		</div>
	);
};

const styles: { [key: string]: React.CSSProperties } = {
	pageContainer: {
		display: "flex",
		flexDirection: "column",
		height: "100%",
		width: "100%",
		background: "#1b1f27",
		color: "#00FF41",
		fontFamily: "monospace",
		padding: "20px",
	},

	title: {
		fontSize: "20px",
		color: "#00FF41",
		marginBottom: "10px",
	},

	mainContent: {
		flex: 1,
		display: "flex",
		gap: "20px",
		overflowY: "auto",
	},

	modList: {
		flex: 1,
		background: "#222831",
		border: "2px solid #444",
		borderRadius: "8px",
		boxShadow: "0px 4px 10px rgba(0,0,0,0.5)",
		padding: "10px",
	},

	modItem: {
		padding: "8px",
		marginBottom: "6px",
		background: "#1b1f27",
		color: "#00FF41",
		borderRadius: "4px",
		border: "1px solid #333",
		cursor: "pointer",
		transition: "background 0.3s",
	},

	modTypeLabel: {
		fontSize: "12px",
		color: "#9affc7",
		opacity: 0.8,
		marginTop: "2px",
	},

	actionButtons: {
		display: "flex",
		gap: "10px",
		marginTop: "10px",
	},

	button: {
		background: "#333",
		color: "#00FF41",
		padding: "8px 15px",
		border: "1px solid #00FF41",
		borderRadius: "4px",
		cursor: "pointer",
		fontFamily: "monospace",
		fontSize: "14px",
		transition: "background 0.3s",
	},
};

export default Mods;
