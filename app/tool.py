#!/bedrock/.venv/bin/python3
import subprocess
import threading
import flask
from flask import Flask, request, render_template
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Start Bedrock server
process = subprocess.Popen(
    ["/bin/bash", "/bedrock/start.sh"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1
)

# Function to read logs and emit to WebSocket


def stream_logs():
    for line in iter(process.stdout.readline, ''):
        socketio.emit('log', {'data': line.strip()})


# Run log streaming in a separate thread
threading.Thread(target=stream_logs, daemon=True).start()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/send_command', methods=['POST'])
def send_command():
    cmd = request.form['command']
    if process.poll() is None:
        process.stdin.write(cmd + "\n")
        process.stdin.flush()
        return "Command sent!", 200
    return "Server is not running!", 500


# Start Flask server
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
