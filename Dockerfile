# Use newer base: glibc >= 2.35 (bookworm has 2.36)
FROM --platform=linux/amd64 debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
# suiup/sui installs into ~/.local/bin
ENV PATH="/root/.local/bin:${PATH}"

# Base deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash ca-certificates curl wget git \
    build-essential pkg-config libssl-dev \
    gnupg lsb-release \
    tar xz-utils unzip \
  && rm -rf /var/lib/apt/lists/*

SHELL ["/bin/bash", "-eo", "pipefail", "-c"]

# Node.js 20 (NodeSource)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# Install Sui via suiup (prebuilt; set testnet as default non-interactively)
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | bash \
  && ~/.local/bin/suiup install -y sui@testnet \
  && ~/.local/bin/suiup which \
  && ln -sf /root/.local/bin/sui /usr/local/bin/sui \
  && /usr/local/bin/sui --version

# Verify
RUN node --version && npm --version && sui --version

WORKDIR /app

# (Optional) only copy manifests first (faster layer caching if you later edit code)
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# If you have lockfiles, prefer npm ci
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copy the rest
COPY . .

# Build client
RUN cd client && npm run build

EXPOSE 3000 3002
CMD ["npm", "run", "dev"]
