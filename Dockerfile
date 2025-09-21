FROM ubuntu:25.10

# Build-time default version
ARG VERSION=1.21.101.1
# Runtime environment variable (fallback to ARG)
ENV BEDROCK_VERSION=${VERSION}

# Default No-IP env vars (can be overridden at runtime)
ENV NO_IP_USERNAME=changeme
ENV NO_IP_PASSWORD=changeme

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

# Copy app files and scripts
COPY ./app/BedrockServer /bedrock
COPY ./start.sh ./backup.sh ./rollback.sh ./entrypoint.sh /bedrock/
COPY ./crontab.txt /etc/cron.d/bedrock-backup

# Copy backend to the user's home directory
COPY ./app/backend/ /home/server/backend/
COPY ./app/frontend/static/ /home/server/frontend/static/

# Ensure backup directory exists inside the image
RUN mkdir -p /bedrock/backups && \
    chmod +x /bedrock/*.sh && \
    chmod 0644 /etc/cron.d/bedrock-backup && \
    chown -R server:server /bedrock /home/server && \
    crontab /etc/cron.d/bedrock-backup

# Switch to non-root user
USER server
WORKDIR /home/server

# Enable cron (runs in background automatically in container)
RUN service cron start

# Document ports (not strictly required but good practice)
EXPOSE 19132/tcp 19133/tcp 19132/udp 19133/udp 5000/tcp

# Set back working directory to /bedrock
WORKDIR /bedrock
ENTRYPOINT ["/bedrock/entrypoint.sh"]
