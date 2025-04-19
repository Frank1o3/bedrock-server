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
