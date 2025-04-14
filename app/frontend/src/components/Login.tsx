import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CSSProperties } from "react";

const Login: React.FC = () => {
	const [isLogin, setIsLogin] = useState<boolean>(true); // Toggle between Login and Signup
	const [username, setUsername] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	const handleSubmit = () => {
		if (!username || !password) {
			setError("Both fields are required");
			return;
		}

		// Simulate API call for authentication
		const userData = JSON.parse(localStorage.getItem("users") || "[]");
		const user = userData.find(
			(u: { username: string; password: string }) =>
				u.username === username
		);

		if (isLogin) {
			// Login logic
			if (user && user.password === password) {
				// Save user info in cookies for auto-login
				document.cookie = `username=${username}; path=/; max-age=3600`;
				document.cookie = `password=${password}; path=/; max-age=3600`;
				navigate("/", { replace: true });
				window.location.reload();
			} else {
				setError("Invalid username or password");
			}
		} else {
			// Signup logic
			if (user) {
				setError("Username already exists");
			} else {
				// Create new user
				userData.push({ username, password });
				localStorage.setItem("users", JSON.stringify(userData));

				// Auto-login after signup
				document.cookie = `username=${username}; path=/; max-age=3600`;
				document.cookie = `password=${password}; path=/; max-age=3600`;
				navigate("/", { replace: true });
				window.location.reload();
			}
		}
	};

	return (
		<section style={styles.pageContainer}>
			<form
				style={styles.formContainer}
				onSubmit={(e) => e.preventDefault()}
			>
				<h2>{isLogin ? "Login" : "Sign Up"}</h2>
				{error && <p style={styles.error}>{error}</p>}

				<label style={styles.inputGroup}>
					Username:
					<input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						style={styles.input}
						placeholder="Enter your username"
					/>
				</label>

				<label style={styles.inputGroup}>
					Password:
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						style={styles.input}
						placeholder="Enter your password"
					/>
				</label>

				<button
					type="submit"
					onClick={handleSubmit}
					style={styles.button}
				>
					{isLogin ? "Login" : "Sign Up"}
				</button>

				<p
					onClick={() => setIsLogin(!isLogin)}
					style={styles.toggleLink}
				>
					{isLogin
						? "Don't have an account? Sign Up"
						: "Already have an account? Login"}
				</p>
			</form>
		</section>
	);
};

const styles: { [key: string]: CSSProperties } = {
	pageContainer: {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		height: "100vh",
	},
	formContainer: {
		backgroundColor: "#1a1a1a",
		padding: "40px",
		borderRadius: "8px",
		boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
		width: "400px",
		display: "flex",
		flexDirection: "column",
	},
	inputGroup: {
		marginBottom: "20px",
	},
	input: {
		width: "100%",
		padding: "10px",
		fontSize: "14px",
		border: "1px solid #ddd",
		borderRadius: "4px",
	},
	button: {
		width: "100%",
		padding: "12px",
		backgroundColor: "#28a745",
		color: "#fff",
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "16px",
	},
	toggleLink: {
		textAlign: "center",
		color: "#007bff",
		cursor: "pointer",
	},
	error: {
		color: "red",
		fontSize: "14px",
		marginBottom: "15px",
	},
};

export default Login;
