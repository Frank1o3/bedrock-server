import React, { useState } from "react";

interface LoginProps {
	onAuthSubmit: (
		username: string,
		password: string,
		isLogin: boolean
	) => void;
}

const Login: React.FC<LoginProps> = ({ onAuthSubmit }) => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [isLogin, setIsLogin] = useState(true);

	const handleSubmit = () => {
		if (!username || !password) {
			alert("Please enter both username and password.");
			return;
		}
		onAuthSubmit(username, password, isLogin);
	};

	return (
		<div style={styles.container}>
			<h2>{isLogin ? "Login" : "Create Account"}</h2>
			<input
				type="text"
				placeholder="Username"
				value={username}
				onChange={(e) => setUsername(e.target.value)}
				style={styles.input}
			/>
			<input
				type="password"
				placeholder="Password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				style={styles.input}
			/>
			<button onClick={handleSubmit} style={styles.button}>
				{isLogin ? "Login" : "Create Account"}
			</button>
			<p onClick={() => setIsLogin(!isLogin)} style={styles.toggleText}>
				{isLogin
					? "Don't have an account? Create one"
					: "Already have an account? Login"}
			</p>
		</div>
	);
};

const styles: { [key: string]: React.CSSProperties } = {
	container: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		height: "100vh",
		background: "#222",
		color: "#fff",
	},
	input: {
		margin: "10px",
		padding: "10px",
		borderRadius: "4px",
		border: "none",
		width: "250px",
	},
	button: {
		padding: "10px 20px",
		marginTop: "10px",
		backgroundColor: "#4caf50",
		color: "white",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
	},
	toggleText: {
		marginTop: "15px",
		color: "#00aaff",
		cursor: "pointer",
		textDecoration: "underline",
	},
};

export default Login;
