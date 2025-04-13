FROM ubuntu:latest

# Set environment to non-interactive (avoid tzdata prompt)
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && \
    apt-get install -y \
    rsync curl wget unzip bash cron jq sudo tar python3 python3-pip libpcap0.8 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Add non-root user
RUN useradd -m -s /bin/bash bedrock && \
    echo "bedrock ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Set working directory
WORKDIR /bedrock

# Download Bedrock Server
RUN curl -L -A "bedrock-server.zip" -o bedrock-server.zip https://www.minecraft.net/bedrockdedicatedserver/bin-linux/bedrock-server-1.21.72.01.zip && \
    unzip bedrock-server.zip && \
    rm bedrock-server.zip

# Copy app files and scripts
COPY ./app/BedrockServer /bedrock
COPY ./start.sh ./backup.sh ./rollback.sh ./entrypoint.sh /bedrock/
COPY ./crontab.txt /etc/cron.d/bedrock-backup

COPY ./app/Backend ${HOME}/Backend

# Set permissions
RUN chmod +x /bedrock/*.sh && \
    chmod 0644 /etc/cron.d/bedrock-backup && \
    chown -R bedrock:bedrock /bedrock && \
    crontab /etc/cron.d/bedrock-backup

# Install No-IP DUC
RUN wget --content-disposition https://www.noip.com/download/linux/latest -O noip-duc.tar.gz && \
    tar xf noip-duc.tar.gz && \
    dpkg -i /bedrock/noip-duc_*/binaries/noip-duc_*.deb || apt-get install -f -y && \
    rm -rf /bedrock/noip-duc*

# Switch to non-root user
USER bedrock

ENTRYPOINT ["/bedrock/entrypoint.sh"]
CMD ["/bedrock/start.sh"]
