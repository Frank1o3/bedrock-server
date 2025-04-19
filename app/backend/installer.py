import requests
import re
import os
import zipfile


def get_latest_bedrock_version():
    url = "https://www.minecraft.net/en-us/download/server/bedrock"
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    print("Fetching latest Bedrock server version...")
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    matches = re.findall(
        r'bedrock-server-(\d+\.\d+\.\d+\.\d+)\.zip', response.text)
    if not matches:
        raise Exception("Could not find version in response")

    latest_version = matches[0]
    download_url = f"https://minecraft.azureedge.net/bin-linux/bedrock-server-{latest_version}.zip"

    print(f"Downloading Bedrock Server {latest_version}...")
    zip_path = f"/bedrock/bedrock-server.zip"
    with open(zip_path, "wb") as f:
        f.write(requests.get(download_url).content)

    print("Extracting...")
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall("/bedrock")

    os.remove(zip_path)
    print("✅ Done.")


if __name__ == "__main__":
    get_latest_bedrock_version()
