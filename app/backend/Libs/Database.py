from pathlib import Path
import sqlite3
import os


class Database:
    def __init__(self, path="database.db"):
        home_dir = Path.home()
        self.db_path = os.path.join(home_dir, path)
        self.conn = sqlite3.connect(self.db_path)
        self.conn.execute(
            """CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT, password TEXT,
                rank TEXT DEFAULT 'user' CHECK (rank IN ('user', 'admin')));""")
        self.cursor = self.conn.cursor()

    def insert_user(self, username, password, rank='user'):
        self.cursor.execute(
            "INSERT INTO users (username, password, rank) VALUES (?, ?, ?)", (username, password, rank))
        self.conn.commit()
        return self.cursor.lastrowid

    def get_all_users(self):
        self.cursor.execute("SELECT * FROM users")
        return self.cursor.fetchall()

    def get_users_by_rank(self, rank):
        self.cursor.execute("SELECT * FROM users WHERE rank=?", (rank,))
        return self.cursor.fetchall()

    def get_user(self, username=None, password=None):
        if username is None and password is None:
            return None
        if password:
            self.cursor.execute(
                "SELECT * FROM users WHERE username=? AND password=?", (username, password))
        else:
            self.cursor.execute(
                "SELECT * FROM users WHERE username=?", (username,))
        return self.cursor.fetchone()

    def update_user(self, user_id, username, password):
        self.cursor.execute(
            "UPDATE users SET username=?, password=? WHERE id=?", (username, password, user_id))
        self.conn.commit()
        return self.cursor.rowcount

    def delete_user(self, user_id):
        self.cursor.execute("DELETE FROM users WHERE id=?", (user_id,))
        self.conn.commit()
        return self.cursor.rowcount

    def close(self):
        self.conn.close()
