import React, { useState } from "react";

interface LoginProps {
	onAuthSubmit: (
		username: string,
		password: string,
		isLogin: boolean
	) => void;
	loading?: boolean;
	error?: string;
}

const Login: React.FC<LoginProps> = ({ onAuthSubmit, loading = false, error }) => {
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
			<div style={styles.loginCard}>
				<h1 style={styles.title}>🏰 Bedrock Server</h1>
				<h2 style={styles.subtitle}>
					{isLogin ? "Welcome Back" : "Create Account"}
				</h2>
				
				{!isLogin && (
					<div style={styles.infoBox}>
						<p>ℹ️ The first account created will be the admin.</p>
						<p>Additional accounts will be standard users.</p>
					</div>
				)}
				
				{error && (
					<div style={styles.errorBox}>
						❌ {error}
					</div>
				)}
				
				<input
					type="text"
					placeholder="Username"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					style={styles.input}
					disabled={loading}
					onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
				/>
				<input
					type="password"
					placeholder="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					style={styles.input}
					disabled={loading}
					onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
				/>
				<button 
					onClick={handleSubmit} 
					style={{
						...styles.button,
						opacity: loading ? 0.7 : 1,
						cursor: loading ? 'not-allowed' : 'pointer'
					}}
					disabled={loading}
				>
					{loading 
						? (isLogin ? "Signing in..." : "Creating account...")
						: (isLogin ? "Sign In" : "Create Account")
					}
				</button>
				<p 
					onClick={() => !loading && setIsLogin(!isLogin)} 
					style={{
						...styles.toggleText,
						cursor: loading ? 'not-allowed' : 'pointer',
						opacity: loading ? 0.7 : 1
					}}
				>
					{isLogin
						? "Don't have an account? Create one"
						: "Already have an account? Sign in"}
				</p>
			</div>
		</div>
	);
};

const styles: { [key: string]: React.CSSProperties } = {
	container: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		height: "100vh",
		background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
		padding: "20px",
	},
	loginCard: {
		background: "rgba(0, 0, 0, 0.8)",
		padding: "40px",
		borderRadius: "12px",
		boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
		border: "1px solid rgba(255, 255, 255, 0.1)",
		backdropFilter: "blur(10px)",
		maxWidth: "400px",
		width: "100%",
		textAlign: "center",
	},
	title: {
		color: "#00FF41",
		marginBottom: "10px",
		fontSize: "28px",
		fontWeight: "bold",
		textShadow: "0 2px 4px rgba(0, 255, 65, 0.3)",
	},
	subtitle: {
		color: "#fff",
		marginBottom: "20px",
		fontSize: "18px",
		fontWeight: "300",
	},
	infoBox: {
		background: "rgba(0, 123, 255, 0.1)",
		border: "1px solid rgba(0, 123, 255, 0.3)",
		borderRadius: "8px",
		padding: "15px",
		marginBottom: "20px",
		color: "#87CEEB",
		fontSize: "14px",
	},
	errorBox: {
		background: "rgba(220, 53, 69, 0.1)",
		border: "1px solid rgba(220, 53, 69, 0.3)",
		borderRadius: "8px",
		padding: "15px",
		marginBottom: "20px",
		color: "#FFB6C1",
		fontSize: "14px",
	},
	input: {
		width: "100%",
		padding: "12px 16px",
		margin: "8px 0",
		border: "1px solid rgba(255, 255, 255, 0.2)",
		borderRadius: "8px",
		background: "rgba(255, 255, 255, 0.1)",
		color: "#fff",
		fontSize: "16px",
		transition: "all 0.3s ease",
		outline: "none",
		boxSizing: "border-box",
	},
	button: {
		width: "100%",
		padding: "12px 20px",
		marginTop: "16px",
		background: "linear-gradient(135deg, #00FF41 0%, #00CC33 100%)",
		color: "#000",
		border: "none",
		borderRadius: "8px",
		fontSize: "16px",
		fontWeight: "bold",
		transition: "all 0.3s ease",
		boxShadow: "0 4px 15px rgba(0, 255, 65, 0.3)",
	},
	toggleText: {
		marginTop: "20px",
		color: "#00BFFF",
		fontSize: "14px",
		textDecoration: "underline",
		transition: "color 0.3s ease",
	},
};

export default Login;
