FROM ubuntu:latest

# Set environment to non-interactive (avoid tzdata prompt)
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
    rsync curl wget unzip bash cron jq sudo tar python3 python3-pip python3-venv build-essential libpcap0.8 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Add non-root user
RUN useradd -m -s /bin/bash server && \
    echo "server ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Set working directory
WORKDIR /bedrock

# Download Bedrock Server
RUN curl -L -A "bedrock-server.zip" -o bedrock-server.zip https://www.minecraft.net/bedrockdedicatedserver/bin-linux/bedrock-server-1.21.73.01.zip && \
    unzip bedrock-server.zip && \
    rm bedrock-server.zip

# Copy app files and scripts
COPY ./app/BedrockServer /bedrock
COPY ./start.sh ./backup.sh ./rollback.sh ./entrypoint.sh /bedrock/
COPY ./crontab.txt /etc/cron.d/bedrock-backup

# Copy backend to the user's home directory
COPY ./app/backend/ /home/server/backend/
COPY ./app/frontend/static/ /home/server/frontend/static/

# Set permissions
RUN chmod +x /bedrock/*.sh && \
    chmod 0644 /etc/cron.d/bedrock-backup && \
    chown -R server:server /bedrock /home/server && \
    crontab /etc/cron.d/bedrock-backup


# Switch to user for user-space install
USER server
WORKDIR /home/server

# Install No-IP DUC using package manager method
RUN wget --content-disposition https://www.noip.com/download/linux/latest && \
    tar xf noip-duc_3.3.0.tar.gz && \
    cd /home/server/noip-duc_3.3.0/binaries && sudo apt install ./noip-duc_3.3.0_amd64.deb

RUN service cron start

# Set back working directory to /bedrock
WORKDIR /bedrock
ENTRYPOINT ["/bedrock/entrypoint.sh"]
