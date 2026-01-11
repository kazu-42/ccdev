FROM docker.io/cloudflare/sandbox:0.3.3

# Set working directory
WORKDIR /workspace

# Create a welcome message
RUN echo '#!/bin/bash\necho "Welcome to ccdev Sandbox!"\necho "Available: Node.js, Python, Bun, Git, and more"\necho ""' > /etc/profile.d/welcome.sh && \
    chmod +x /etc/profile.d/welcome.sh
