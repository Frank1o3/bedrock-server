import React, { useState } from "react";
import { CSSProperties } from "react";

interface UserSession {
	username: string;
	role: 'admin' | 'user';
	authenticated: boolean;
}

interface SidebarProps {
	setActivePage: (page: string) => void;
	userSession: UserSession;
	onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ setActivePage, userSession, onLogout }) => {
	const [isHovered, setIsHovered] = useState(false);

	return (
		<div
			style={{
				...styles.sidebar,
				width: isHovered ? "250px" : "10px",
			}}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div style={{ ...styles.content, opacity: isHovered ? 1 : 0 }}>
				{/* User Info Section */}
				<div style={styles.userSection}>
					<div style={styles.userIcon}>👤</div>
					<div style={styles.userInfo}>
						<div style={styles.username}>{userSession.username}</div>
						<div style={styles.userRole}>
							{userSession.role === 'admin' ? '⚙️ Admin' : '👥 User'}
						</div>
					</div>
				</div>

				{/* Navigation Menu */}
				<div style={styles.menuSection}>
					<h3 style={styles.menuTitle}>🎮 Server Control</h3>
					<ul style={styles.navList}>
						<li
							onClick={() => setActivePage("Console")}
							style={styles.link}
						>
							📺 Console
						</li>
						<li
							onClick={() => setActivePage("Mods")}
							style={styles.link}
						>
							🧩 Mods
						</li>
						<li
							onClick={() => setActivePage("Settings")}
							style={styles.link}
						>
							⚙️ Settings
						</li>
					</ul>
				</div>

				{/* Logout Section */}
				<div style={styles.logoutSection}>
					<button onClick={onLogout} style={styles.logoutButton}>
						🚪 Logout
					</button>
				</div>
			</div>
		</div>
	);
};

const styles: { [key: string]: CSSProperties } = {
	sidebar: {
		height: "100%",
		background: "linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)",
		color: "#fff",
		padding: "10px",
		display: "flex",
		flexDirection: "column",
		transition: "width 0.3s ease",
		overflow: "hidden",
		borderRight: "2px solid #333",
		boxShadow: "2px 0 10px rgba(0, 0, 0, 0.3)",
	},
	content: {
		padding: "10px",
		transition: "opacity 0.3s ease",
		display: "flex",
		flexDirection: "column",
		height: "100%",
	},
	userSection: {
		display: "flex",
		alignItems: "center",
		padding: "15px 10px",
		background: "rgba(0, 255, 65, 0.1)",
		border: "1px solid rgba(0, 255, 65, 0.3)",
		borderRadius: "8px",
		marginBottom: "20px",
	},
	userIcon: {
		fontSize: "32px",
		marginRight: "12px",
	},
	userInfo: {
		flex: 1,
	},
	username: {
		fontWeight: "bold",
		color: "#00FF41",
		fontSize: "16px",
		marginBottom: "4px",
		whiteSpace: "nowrap",
	},
	userRole: {
		fontSize: "12px",
		color: "#9affc7",
		opacity: 0.8,
		whiteSpace: "nowrap",
	},
	menuSection: {
		flex: 1,
		marginBottom: "20px",
	},
	menuTitle: {
		color: "#00FF41",
		fontSize: "14px",
		marginBottom: "15px",
		padding: "0 10px",
		whiteSpace: "nowrap",
		textShadow: "0 1px 3px rgba(0, 255, 65, 0.5)",
	},
	navList: {
		listStyle: "none",
		padding: 0,
		margin: 0,
	},
	link: {
		cursor: "pointer",
		padding: "12px 15px",
		display: "block",
		color: "#fff",
		borderRadius: "6px",
		marginBottom: "8px",
		transition: "all 0.3s ease",
		whiteSpace: "nowrap",
		background: "rgba(255, 255, 255, 0.05)",
		border: "1px solid transparent",
	},
	logoutSection: {
		marginTop: "auto",
		padding: "10px 0",
		borderTop: "1px solid #333",
	},
	logoutButton: {
		width: "100%",
		padding: "12px 15px",
		background: "#dc3545",
		color: "#fff",
		border: "none",
		borderRadius: "6px",
		cursor: "pointer",
		fontSize: "14px",
		fontWeight: "bold",
		transition: "background 0.3s ease",
		whiteSpace: "nowrap",
	},
};

export default Sidebar;
