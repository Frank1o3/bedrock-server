from Shared.data import bedrock_process, bash_process
import subprocess

import socket
import psutil
def get_ip():
    """
    Get the first non-loopback IPv4 address from Ethernet or Wireless interfaces.
    """
    interfaces = psutil.net_if_addrs()

    for interface_name, interface_addresses in interfaces.items():
        name_lower = interface_name.lower()
        if not any(tag in name_lower for tag in ("eth", "en", "wlan", "wl")):
            continue

        for address in interface_addresses:
            if address.family == socket.AF_INET and not address.address.startswith("127."):
                return address.address

    return None  # or return "127.0.0.1" if you want a fallback


def start_bedrock_server():
    global bedrock_process

    # Ensure the previous process is completely stopped before starting a new one
    if bedrock_process is not None and bedrock_process.poll() is None:
        return  # Server is already running, do nothing

    # Start a new Bedrock server process
    bedrock_process = subprocess.Popen(
        ["/bin/bash", "/bedrock/start.sh"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )


def start_bash_console():
    global bash_process

    # Ensure the previous process is completely stopped before starting a new one
    if bash_process is not None and bash_process.poll() is None:
        return  # Server is already running, do nothing

    # Start a new Bedrock server process
    bash_process = subprocess.Popen(
        ["/bin/bash"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
