import axios from "axios";
import React, { useState, useEffect, useRef } from "react";

// Define types for the mod data
interface Mod {
	id: number;
	name: string;
	type: "behavior" | "resource";
	uuid?: string;
	enabled?: boolean;
	version?: number[];
	description?: string;
}

const Mods: React.FC = () => {
	const [hoveredButton, setHoveredButton] = useState<string | null>(null);
	const [selectedMod, setSelectedMod] = useState<Mod | null>(null);
	const [availableMods, setAvailableMods] = useState<Mod[]>([]);
	const [activeMods, setActiveMods] = useState<Mod[]>([]);
	const [uploadStatus, setUploadStatus] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const fetchMods = async () => {
		setIsLoading(true);
		try {
			const availableResponse = await axios.post("/api/mods/", {
				requestType: "available",
			}, { withCredentials: true });
			
			const activeResponse = await axios.post("/api/mods/", {
				requestType: "active",
			}, { withCredentials: true });

			if (availableResponse.data?.mods) {
				const enrichedMods = availableResponse.data.mods.map((mod: any) => ({
					...mod,
					uuid: mod.id.toString(), // Convert ID to UUID string for consistency
					type: mod.Type || "unknown"
				}));
				setAvailableMods(enrichedMods);
			}
			
			if (activeResponse.data?.mods) {
				const enrichedActiveMods = activeResponse.data.mods.map((mod: any) => ({
					...mod,
					uuid: mod.id.toString(),
					type: mod.Type || "unknown",
					enabled: true
				}));
				setActiveMods(enrichedActiveMods);
			}
		} catch (error) {
			console.error("Error fetching mods:", error);
			setUploadStatus("Failed to fetch mods");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchMods();
	}, []);

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.name.endsWith('.mcaddon') && !file.name.endsWith('.mcpack')) {
			setUploadStatus("Error: Only .mcaddon and .mcpack files are supported");
			return;
		}

		setUploadStatus(`Uploading ${file.name}...`);
		setIsLoading(true);

		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await axios.post('/api/mods/upload', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
				withCredentials: true
			});

			if (response.data.success) {
				setUploadStatus(`✅ ${response.data.message}`);
				// Refresh the mod lists
				await fetchMods();
			} else {
				setUploadStatus(`❌ Upload failed: ${response.data.message || 'Unknown error'}`);
			}
		} catch (error: any) {
			console.error('Upload error:', error);
			setUploadStatus(`❌ Upload failed: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
		} finally {
			setIsLoading(false);
			// Clear the file input
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	const handleModAction = async (action: 'enable' | 'disable' | 'remove') => {
		if (!selectedMod || !selectedMod.uuid) {
			setUploadStatus("No mod selected");
			return;
		}

		setUploadStatus(`${action}ing mod...`);
		setIsLoading(true);

		try {
			const response = await axios.post('/api/mods/action', {
				action: action,
				mod_uuid: selectedMod.uuid,
				mod_type: selectedMod.type
			}, { withCredentials: true });

			if (response.data.success) {
				setUploadStatus(`✅ ${response.data.message}`);
				// Refresh the mod lists
				await fetchMods();
				// Clear selection if mod was removed
				if (action === 'remove') {
					setSelectedMod(null);
				}
			} else {
				setUploadStatus(`❌ ${action} failed: ${response.data.message || 'Unknown error'}`);
			}
		} catch (error: any) {
			console.error('Mod action error:', error);
			setUploadStatus(`❌ ${action} failed: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
		} finally {
			setIsLoading(false);
		}
	};

	const isModSelected = selectedMod !== null;
	const isModFromActiveList = activeMods.some(mod => mod.id === selectedMod?.id);

	return (
		<div style={styles.pageContainer}>
			{/* Header */}
			<div style={styles.header}>
				<h1 style={styles.title}>Mods Management</h1>
				{uploadStatus && (
					<div style={{
						...styles.statusMessage,
						color: uploadStatus.includes('✅') ? '#4CAF50' : 
						       uploadStatus.includes('❌') ? '#f44336' : '#FFA726'
					}}>
						{uploadStatus}
					</div>
				)}
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
				accept=".mcaddon,.mcpack"
				onChange={handleFileChange}
			/>

			{/* Action Buttons */}
			<div style={styles.actionButtons}>
				{/* Enable/Disable Button - contextual */}
				{isModSelected && (
					<button
						style={{
							...styles.button,
							background: hoveredButton === "toggle" ? "#145523" : 
							           isModFromActiveList ? "#ff9800" : "#4caf50",
							cursor: "pointer"
						}}
						onMouseEnter={() => setHoveredButton("toggle")}
						onMouseLeave={() => setHoveredButton(null)}
						onClick={() => handleModAction(isModFromActiveList ? "disable" : "enable")}
						disabled={isLoading}
					>
						{isModFromActiveList ? "Disable" : "Enable"} Mod
					</button>
				)}

				{/* Remove Button */}
				<button
					style={{
						...styles.button,
						background:
							hoveredButton === "Remove"
								? "#c62828"
								: isModSelected
								? "#f44336"
								: "#666",
						cursor: isModSelected && !isLoading ? "pointer" : "not-allowed",
					}}
					onMouseEnter={() => setHoveredButton("Remove")}
					onMouseLeave={() => setHoveredButton(null)}
					disabled={!isModSelected || isLoading}
					onClick={() => handleModAction("remove")}
				>
					Remove Mod
				</button>

				{/* Upload Button */}
				<button
					style={{
						...styles.button,
						background:
							hoveredButton === "Upload" ? "#145523" : "#28a745",
						cursor: isLoading ? "not-allowed" : "pointer"
					}}
					onMouseEnter={() => setHoveredButton("Upload")}
					onMouseLeave={() => setHoveredButton(null)}
					onClick={handleUploadClick}
					disabled={isLoading}
				>
					{isLoading ? "Processing..." : "Upload Mod"}
				</button>

				{/* Refresh Button */}
				<button
					style={{
						...styles.button,
						background: hoveredButton === "Refresh" ? "#145523" : "#2196F3",
						cursor: isLoading ? "not-allowed" : "pointer"
					}}
					onMouseEnter={() => setHoveredButton("Refresh")}
					onMouseLeave={() => setHoveredButton(null)}
					onClick={fetchMods}
					disabled={isLoading}
				>
					Refresh
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

	statusMessage: {
		padding: "8px 12px",
		marginTop: "10px",
		backgroundColor: "rgba(0, 0, 0, 0.3)",
		border: "1px solid #444",
		borderRadius: "4px",
		fontFamily: "monospace",
		fontSize: "14px",
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
