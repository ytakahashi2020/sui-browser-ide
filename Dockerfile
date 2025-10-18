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

# Download and install pre-built Sui binary
RUN wget -O /tmp/sui-ubuntu-x86_64.tgz https://github.com/MystenLabs/sui/releases/download/testnet-v1.14.0/sui-ubuntu-x86_64.tgz \
    && tar -xzf /tmp/sui-ubuntu-x86_64.tgz -C /tmp \
    && mv /tmp/sui-ubuntu-x86_64/sui /usr/local/bin/sui \
    && chmod +x /usr/local/bin/sui \
    && rm -rf /tmp/sui-ubuntu-x86_64* \
    && sui --version

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