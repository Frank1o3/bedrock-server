# Use the official Ubuntu image as the base
FROM ubuntu:20.04

# Install required dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    unzip \
    bash \
    cron \
    jq \
    sudo \
    tar \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and ensure they have permissions for the required directories
RUN useradd -m -s /bin/bash bedrock && \
    echo "bedrock ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

# Set working directory
WORKDIR /bedrock

RUN curl -L -A "bedrock-server-1.21.62.01.zip" -o bedrock-server-1.21.62.01.zip https://www.minecraft.net/bedrockdedicatedserver/bin-linux/bedrock-server-1.21.62.01.zip && \
    unzip bedrock-server-1.21.62.01.zip && \
    rm bedrock-server-1.21.62.01.zip

COPY ./app /bedrock
COPY ./start.sh ./backup.sh ./rollback.sh ./entrypoint.sh /bedrock/

# Set script permissions
RUN chmod +x /bedrock/*.sh && chown -R bedrock:bedrock /bedrock

# Install No-IP DUC
RUN wget --content-disposition https://www.noip.com/download/linux/latest -O noip-duc.tar.gz && \
    tar xf noip-duc.tar.gz && \
    cd /bedrock/noip-duc_*/binaries && \
    apt-get update && \
    apt-get install -y libpcap0.8 && \
    dpkg -i ./noip-duc_*.deb || apt-get install -f -y && \
    rm -rf /bedrock/noip-duc.tar.gz /bedrock/noip-duc_*

# Add the crontab configuration file
COPY ./crontab.txt /etc/cron.d/bedrock-backup

# Set correct permissions for crontab and add the user to cron
RUN chmod 0644 /etc/cron.d/bedrock-backup && crontab /etc/cron.d/bedrock-backup

# Ensure the cron daemon is running in the background
RUN service cron start

# Switch to the non-root user
USER bedrock

# Set entrypoint
ENTRYPOINT ["/bedrock/entrypoint.sh"]

# Default command starts the server
CMD ["/bedrock/start.sh"]
