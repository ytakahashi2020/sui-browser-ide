# Sui Browser IDE

RemixのようなブラウザベースのSui開発環境です。環境構築不要で、ブラウザ上でSuiスマートコントラクトの開発ができます。

## 機能

- ✅ Suiコマンドラインの実行
- ✅ ファイル/フォルダの作成・編集
- ✅ ウォレット接続（@mysten/dapp-kit使用）
- ✅ Moveコードエディタ
- ✅ 統合ターミナル

## セットアップ

### 方法1: Docker Compose（推奨）

```bash
docker-compose up
```

ブラウザで http://localhost:3000 を開いてください。

### 方法2: ローカル開発

```bash
# 依存関係のインストール
npm run install:all

# 開発サーバーの起動
npm run dev
```

## 使い方

1. **ファイルエクスプローラー**: 左側のパネルでファイルやフォルダを管理
2. **エディタ**: Moveコードを編集（シンタックスハイライト付き）
3. **ターミナル**: 下部でSuiコマンドを実行
4. **ウォレット**: 右上でウォレットを接続

## 技術スタック

- Frontend: React + TypeScript + Vite
- UI: TailwindCSS
- エディタ: Monaco Editor
- ターミナル: xterm.js
- ウォレット: @mysten/dapp-kit
- Backend: Express + WebSocket