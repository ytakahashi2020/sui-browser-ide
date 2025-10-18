# Use official Debian image for better platform compatibility
FROM --platform=linux/amd64 debian:bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive
# Add ~/.local/bin to PATH in case we want to call sui without the symlink
ENV PATH="/root/.local/bin:${PATH}"

# ---- Base deps ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget git \
    build-essential pkg-config libssl-dev \
    gnupg lsb-release \
    tar xz-utils unzip \
  && rm -rf /var/lib/apt/lists/*

# ---- Node.js 20 (NodeSource) ----
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# ---- Sui (suiup: prebuilt binaries; avoids libclang/rocksdb build issues) ----
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh \
  && /root/.local/bin/suiup install sui@testnet \
  && ln -sf /root/.local/bin/sui /usr/local/bin/sui

# Verify installations
RUN node --version && npm --version && sui --version

WORKDIR /app

# (Optional) speed up installs by only copying the manifests first
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# If you have package-lock.json files, npm ci is faster/more deterministic
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Now copy the rest of the app
COPY . .

# Build client assets　
RUN cd client && npm run build

EXPOSE 3000 3002
CMD ["npm", "run", "dev"]
