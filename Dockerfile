# Use official Debian image for better platform compatibility
FROM --platform=linux/amd64 debian:bullseye-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    pkg-config \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Sui using suiup (official version manager with pre-built binaries)
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh \
    && ~/.local/bin/suiup install sui@testnet \
    && ln -sf ~/.local/bin/sui /usr/local/bin/sui

# Verify installations
RUN node --version && npm --version && sui --version

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install
RUN cd server && npm install
RUN cd client && npm install

COPY . .

RUN cd client && npm run build

EXPOSE 3000 3002

CMD ["npm", "run", "dev"]