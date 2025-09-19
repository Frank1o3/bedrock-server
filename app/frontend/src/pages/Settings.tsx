import axios from "axios";
import React, { useState, useEffect } from "react";

interface ServerSettings {
	env_vars: { [key: string]: string };
	server_properties: { [key: string]: string };
	success: boolean;
}

const Settings: React.FC = () => {
	const [settings, setSettings] = useState<ServerSettings | null>(null);
	const [loading, setLoading] = useState(true);
	const [statusMsg, setStatusMsg] = useState<string>("");
	const [isUpdating, setIsUpdating] = useState<boolean>(false);
	const [activeTab, setActiveTab] = useState<'env' | 'server' | 'users'>('env');

	useEffect(() => {
		fetchSettings();
	}, []);

	const fetchSettings = async () => {
		setLoading(true);
		try {
			const response = await axios.get("/api/settings", { withCredentials: true });
			setSettings(response.data);
			setStatusMsg("");
		} catch (error: any) {
			console.error("Error fetching settings:", error);
			setStatusMsg(`❌ ${error.response?.data?.detail || 'Failed to load settings'}`);
		} finally {
			setLoading(false);
		}
	};

	const handleSettingUpdate = async (key: string, value: string, type: 'env' | 'server_prop') => {
		if (!key || value === undefined) {
			setStatusMsg("❌ Invalid setting data");
			return;
		}
		
		setIsUpdating(true);
		setStatusMsg(`🔄 Updating ${key}...`);
		
		try {
			const response = await axios.post("/api/settings/update", {
				setting_key: key,
				setting_value: value,
				setting_type: type
			}, { withCredentials: true });
			
			if (response.data.success) {
				setStatusMsg(`✅ ${response.data.message}`);
				await fetchSettings(); // Refresh settings
			} else {
				setStatusMsg(`❌ ${response.data.message || 'Update failed'}`);
			}
		} catch (error: any) {
			console.error("Error updating setting:", error);
			setStatusMsg(`❌ ${error.response?.data?.detail || 'Failed to update setting'}`);
		} finally {
			setIsUpdating(false);
			// Clear status after 5 seconds
			setTimeout(() => setStatusMsg(""), 5000);
		}
	};

	// Component for individual setting items
	const SettingItem: React.FC<{label: string, value: string, settingKey: string, type: 'env' | 'server_prop', description?: string}> = 
		({ label, value, settingKey, type, description }) => {
		const [editValue, setEditValue] = useState(value);
		const [isEditing, setIsEditing] = useState(false);
		
		const handleSave = async () => {
			await handleSettingUpdate(settingKey, editValue, type);
			setIsEditing(false);
		};
		
		const handleCancel = () => {
			setEditValue(value);
			setIsEditing(false);
		};
		
		return (
			<div style={styles.settingItem}>
				<div style={styles.settingHeader}>
					<div>
						<strong style={styles.settingLabel}>{label}</strong>
						{description && <p style={styles.settingDescription}>{description}</p>}
					</div>
					{!isEditing && (
						<button 
							onClick={() => setIsEditing(true)} 
							style={styles.editButton}
							disabled={isUpdating}
						>
							✏️ Edit
						</button>
					)}
				</div>
				
				{isEditing ? (
					<div style={styles.editContainer}>
						<input
							type="text"
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							style={styles.editInput}
							disabled={isUpdating}
						/>
						<div style={styles.editButtons}>
							<button 
								onClick={handleSave} 
								style={{...styles.saveButton, opacity: isUpdating ? 0.6 : 1}}
								disabled={isUpdating}
							>
								✅ Save
							</button>
							<button 
								onClick={handleCancel} 
								style={styles.cancelButton}
								disabled={isUpdating}
							>
								❌ Cancel
							</button>
						</div>
					</div>
				) : (
					<div style={styles.currentValue}>
						<code>{value || '(not set)'}</code>
					</div>
				)}
			</div>
		);
	};

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h1 style={styles.title}>⚙️ Server Settings</h1>
				{statusMsg && (
					<div style={{
						...styles.statusMessage,
						color: statusMsg.includes('✅') ? '#4CAF50' : 
						       statusMsg.includes('❌') ? '#f44336' : '#FFA726'
					}}>
						{statusMsg}
					</div>
				)}
			</div>

			{/* Tab Navigation */}
			<div style={styles.tabContainer}>
				<button 
					style={{...styles.tab, ...(activeTab === 'env' ? styles.activeTab : {})}}
					onClick={() => setActiveTab('env')}
				>
					🌍 Environment
				</button>
				<button 
					style={{...styles.tab, ...(activeTab === 'server' ? styles.activeTab : {})}}
					onClick={() => setActiveTab('server')}
				>
					🛠️ Server Properties
				</button>
			</div>

			{/* Tab Content */}
			<div style={styles.tabContent}>
				{loading ? (
					<div style={styles.loading}>
						<div style={styles.loadingSpinner}>🔄</div>
						<p>Loading server settings...</p>
					</div>
				) : (
					<>
						{activeTab === 'env' && (
							<div style={styles.settingsSection}>
								<h3 style={styles.sectionTitle}>Environment Variables</h3>
								<p style={styles.sectionDescription}>
									These environment variables control various aspects of the server container.
								</p>
								
								{settings?.env_vars && Object.keys(settings.env_vars).length > 0 ? (
									Object.entries(settings.env_vars).map(([key, value]) => (
										<SettingItem 
											key={key}
											label={key}
											value={value}
											settingKey={key}
											type="env"
											description={getEnvVarDescription(key)}
										/>
									))
								) : (
									<div style={styles.noSettings}>No environment variables available</div>
								)}
							</div>
						)}

						{activeTab === 'server' && (
							<div style={styles.settingsSection}>
								<h3 style={styles.sectionTitle}>Server Properties</h3>
								<p style={styles.sectionDescription}>
									These settings directly control the Minecraft Bedrock server configuration.
								</p>
								
								{settings?.server_properties && Object.keys(settings.server_properties).length > 0 ? (
									Object.entries(settings.server_properties).map(([key, value]) => (
										<SettingItem 
											key={key}
											label={key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
											value={value}
											settingKey={key}
											type="server_prop"
											description={getServerPropDescription(key)}
										/>
									))
								) : (
									<div style={styles.noSettings}>No server properties available</div>
								)}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);

	// Helper functions for descriptions
	function getEnvVarDescription(key: string): string {
		const descriptions: { [key: string]: string } = {
			'NO_IP_USERNAME': 'Username for No-IP dynamic DNS service',
			'SERVER_NAME': 'Display name for the server',
			'GAMEMODE': 'Default game mode (survival, creative, adventure)',
			'DIFFICULTY': 'Server difficulty (peaceful, easy, normal, hard)',
			'MAX_PLAYERS': 'Maximum number of players allowed',
			'ALLOW_CHEATS': 'Enable or disable cheats (true/false)',
			'LEVEL_NAME': 'Name of the world/level'
		};
		return descriptions[key] || 'Server environment variable';
	}

	function getServerPropDescription(key: string): string {
		const descriptions: { [key: string]: string } = {
			'server-name': 'The name of the server displayed in the server list',
			'gamemode': 'The default game mode for players',
			'difficulty': 'The difficulty level of the game',
			'allow-cheats': 'Whether cheats are allowed on the server',
			'max-players': 'Maximum number of players that can join',
			'online-mode': 'Whether to authenticate players with Xbox Live',
			'white-list': 'Whether to use a whitelist for players',
			'server-port': 'The port number the server listens on',
			'server-portv6': 'The IPv6 port number the server listens on',
			'level-name': 'The name of the level (world)',
			'level-seed': 'The seed used to generate the world',
			'default-player-permission-level': 'Default permission level for players'
		};
		return descriptions[key] || 'Server configuration property';
	}
};

const styles: { [key: string]: React.CSSProperties } = {
	container: {
		height: "100%",
		width: "100%",
		padding: "20px",
		background: "#1b1f27",
		color: "#00FF41",
		fontFamily: "monospace",
		display: "flex",
		flexDirection: "column",
		overflowY: "auto",
	},
	header: {
		marginBottom: "20px",
		borderBottom: "2px solid #333",
		paddingBottom: "15px",
	},
	title: {
		fontSize: "28px",
		marginBottom: "10px",
		color: "#00FF41",
		textShadow: "0 2px 4px rgba(0, 255, 65, 0.3)",
	},
	statusMessage: {
		padding: "10px 15px",
		background: "rgba(0, 0, 0, 0.3)",
		border: "1px solid #444",
		borderRadius: "6px",
		marginTop: "10px",
		fontWeight: "bold",
	},
	tabContainer: {
		display: "flex",
		marginBottom: "20px",
		borderBottom: "1px solid #333",
	},
	tab: {
		padding: "12px 24px",
		background: "transparent",
		border: "none",
		color: "#888",
		cursor: "pointer",
		fontFamily: "monospace",
		fontSize: "16px",
		borderBottom: "3px solid transparent",
		transition: "all 0.3s ease",
	},
	activeTab: {
		color: "#00FF41",
		borderBottomColor: "#00FF41",
		background: "rgba(0, 255, 65, 0.1)",
	},
	tabContent: {
		flex: 1,
		overflowY: "auto",
	},
	loading: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		padding: "60px 20px",
		color: "#888",
	},
	loadingSpinner: {
		fontSize: "48px",
		marginBottom: "20px",
		animation: "spin 2s linear infinite",
	},
	settingsSection: {
		marginBottom: "30px",
	},
	sectionTitle: {
		fontSize: "22px",
		color: "#00FF41",
		marginBottom: "10px",
	},
	sectionDescription: {
		color: "#888",
		marginBottom: "20px",
		fontStyle: "italic",
	},
	settingItem: {
		background: "#222831",
		border: "1px solid #444",
		borderRadius: "8px",
		padding: "20px",
		marginBottom: "15px",
		transition: "border-color 0.3s ease",
	},
	settingHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: "15px",
	},
	settingLabel: {
		color: "#00FF41",
		fontSize: "16px",
		marginBottom: "5px",
	},
	settingDescription: {
		color: "#888",
		fontSize: "14px",
		margin: "5px 0 0 0",
		fontStyle: "italic",
	},
	currentValue: {
		padding: "10px 15px",
		background: "rgba(0, 0, 0, 0.3)",
		border: "1px solid #333",
		borderRadius: "6px",
	},
	editContainer: {
		display: "flex",
		gap: "10px",
		alignItems: "center",
		flexWrap: "wrap",
	},
	editInput: {
		flex: 1,
		padding: "8px 12px",
		background: "#1b1f27",
		border: "1px solid #00FF41",
		borderRadius: "4px",
		color: "#00FF41",
		fontFamily: "monospace",
		fontSize: "14px",
		minWidth: "200px",
	},
	editButtons: {
		display: "flex",
		gap: "8px",
	},
	editButton: {
		padding: "6px 12px",
		background: "#007bff",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "12px",
		transition: "background 0.3s ease",
	},
	saveButton: {
		padding: "6px 12px",
		background: "#28a745",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "12px",
		transition: "background 0.3s ease",
	},
	cancelButton: {
		padding: "6px 12px",
		background: "#6c757d",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "12px",
		transition: "background 0.3s ease",
	},
	noSettings: {
		textAlign: "center",
		padding: "40px 20px",
		color: "#666",
		fontStyle: "italic",
	},
};

export default Settings;
