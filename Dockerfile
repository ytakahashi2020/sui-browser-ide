# Use official Debian image for better platform compatibility
FROM --platform=linux/amd64 debian:bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive
# ~/.local/bin を PATH に追加（suiup がここに入れる）
ENV PATH="/root/.local/bin:${PATH}"

# bash と基本ツール
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash ca-certificates curl wget git \
    build-essential pkg-config libssl-dev \
    gnupg lsb-release \
    tar xz-utils unzip \
  && rm -rf /var/lib/apt/lists/*

# 以降は bash + pipefail で失敗検出を厳格化
SHELL ["/bin/bash", "-eo", "pipefail", "-c"]

# Node.js 20 (NodeSource)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# Sui を suiup（事前ビルド）でインストール
# - どこに落ちたかを "suiup which" で確認
# - /usr/local/bin/sui に確実に symlink
RUN curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | bash \
  && ~/.local/bin/suiup install sui@testnet \
  && ~/.local/bin/suiup which sui \
  && ln -sf "$(~/.local/bin/suiup which sui)" /usr/local/bin/sui \
  && ls -l /usr/local/bin/sui \
  && /usr/local/bin/sui --version

# Verify installations (node/npm/sui)
RUN node --version && npm --version && sui --version

WORKDIR /app

# （任意）まずマニフェストだけコピーして依存解決
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# lockfile があるなら npm ci に置換すると再現性↑
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# 残りをコピー
COPY . .

# フロントをビルド
RUN cd client && npm run build

EXPOSE 3000 3002
CMD ["npm", "run", "dev"]
