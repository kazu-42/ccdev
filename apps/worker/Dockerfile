FROM docker.io/cloudflare/sandbox:0.6.11

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/* && \
    ln -sf /usr/bin/python3 /usr/bin/python

EXPOSE 3000
