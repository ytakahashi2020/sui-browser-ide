FROM --platform=linux/amd64 debian:bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/root/.local/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash ca-certificates curl wget git \
    build-essential pkg-config libssl-dev \
    gnupg lsb-release \
    tar xz-utils unzip \
  && rm -rf /var/lib/apt/lists/*

SHELL ["/bin/bash", "-eo", "pipefail", "-c"]

# Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# Sui (suiup; testnet をデフォルトに)
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | bash \
  && ~/.local/bin/suiup install -y sui@testnet \
  && ~/.local/bin/suiup which \
  && ln -sf /root/.local/bin/sui /usr/local/bin/sui \
  && /usr/local/bin/sui --version

# Verify
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
