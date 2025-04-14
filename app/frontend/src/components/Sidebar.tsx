import React, { useState } from "react";
import { CSSProperties } from "react";

interface SidebarProps {
	setActivePage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ setActivePage }) => {
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
				<h2 style={styles.title}>Menu</h2>
				<ul style={styles.navList}>
					<li
						onClick={() => setActivePage("Console")}
						style={styles.link}
					>
						Bedrock Console
					</li>
					<li
						onClick={() => setActivePage("Mods")}
						style={styles.link}
					>
						Mods
					</li>
					<li
						onClick={() => setActivePage("Settings")}
						style={styles.link}
					>
						Settings
					</li>
				</ul>
			</div>
		</div>
	);
};

const styles: { [key: string]: CSSProperties } = {
	sidebar: {
		height: "100%",
		background: "#1a1a1a",
		color: "#fff",
		padding: "20px 13px",
		display: "flex",
		flexDirection: "column",
		transition: "width 0.3s ease",
		overflow: "hidden",
	},
	content: {
		padding: "13px 10px",
		transition: "opacity 0.3s ease",
	},
	title: {
		marginBottom: "20px",
		whiteSpace: "nowrap",
	},
	navList: {
		listStyle: "none",
		padding: 0,
		margin: 0,
	},
	link: {
		cursor: "pointer",
		padding: "10px 13px",
		display: "block",
		color: "#fff",
		borderBottom: "1px solid #333",
		whiteSpace: "nowrap",
	},
};

export default Sidebar;
