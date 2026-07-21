#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# VectoSiloAI — full-stack install script for a fresh Linux machine
# ─────────────────────────────────────────────────────────────
# Usage:  bash <(curl -fsSL https://raw.githubusercontent.com/.../scripts/install.sh)
# Or:     chmod +x scripts/install.sh && ./scripts/install.sh
# ─────────────────────────────────────────────────────────────

REPO_URL="https://github.com/hemesh9/vectosilo-ai.git"
REPO_DIR="$HOME/VectoSiloAI"
NODE_MAJOR=20
STT_PORT=5050
WS_PORT=3003
NEXT_PORT=3002

# ─── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }
info() { echo -e "${CYAN}[i]${NC} $*"; }

# ─── Pre-flight checks ───────────────────────────────────────
preflight() {
  info "Running pre-flight checks..."
  if [[ $EUID -eq 0 ]]; then
    err "Do NOT run as root. Run as a normal user with sudo privileges."
    exit 1
  fi
  if [[ $(uname -s) != "Linux" ]]; then
    err "This script is designed for Linux only."
    exit 1
  fi
  ARCH=$(uname -m)
  if [[ "$ARCH" != "x86_64" && "$ARCH" != "aarch64" ]]; then
    warn "Unsupported architecture: $ARCH. Proceed at your own risk."
  fi
}

# ─── Install system packages ─────────────────────────────────
install_system_deps() {
  info "Installing system dependencies..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    curl wget git build-essential \
    python3 python3-pip python3-venv \
    lxcfs \
    stockfish \
    netcat-openbsd \
    ca-certificates gnupg lsb-release \
    xvfb x11vnc fluxbox xterm novnc websockify \
    jq unzip
}

# ─── Install Node.js 20 ──────────────────────────────────────
install_node() {
  if command -v node &>/dev/null; then
    local ver
    ver=$(node -v | sed 's/v//;s/\..*//')
    if [[ "$ver" -ge "$NODE_MAJOR" ]]; then
      log "Node.js $(node -v) already installed"
      return
    fi
  fi
  info "Installing Node.js $NODE_MAJOR ..."
  curl -fsSL https://deb.nodesource.com/setup_$NODE_MAJOR.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
  log "Node.js $(node -v) installed"
}

# ─── Install Docker ──────────────────────────────────────────
install_docker() {
  if command -v docker &>/dev/null; then
    log "Docker already installed"
    return
  fi
  info "Installing Docker..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
  log "Docker installed — you may need to log out/back in for group changes"
}

# ─── Clone / update repo ─────────────────────────────────────
clone_repo() {
  if [[ -d "$REPO_DIR/.git" ]]; then
    info "Repo exists at $REPO_DIR, pulling latest..."
    cd "$REPO_DIR"
    git pull --ff-only
  else
    info "Cloning repo..."
    git clone "$REPO_URL" "$REPO_DIR"
    cd "$REPO_DIR"
  fi
}

# ─── Setup environment ───────────────────────────────────────
setup_env() {
  cd "$REPO_DIR"
  if [[ -f .env ]]; then
    warn ".env already exists — backing up to .env.backup.$(date +%s)"
    cp .env ".env.backup.$(date +%s)"
  fi
  # Create .env from scratch with self-hosted defaults
  cat > .env <<-ENVEOF
# ─── VectoSiloAI Self-Hosted ──────────────────────────────────────
# Get an API key at https://ollama.com  →  Settings → Keys
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_API_KEY=
OLLAMA_DEFAULT_MODEL=gemma4:31b
OLLAMA_FORCE_MODEL=

# ─── Web search ──────────────────────────────────────────────
SEARXNG_BASE_URL=http://localhost:6767
BRAVE_SEARCH_API_KEY=

# ─── MCP server (multi-query search) ─────────────────────────
# Leave blank to spawn a local MCP child process (dev).
# Set to http://127.0.0.1:3004/mcp for production systemd service.
MCP_SERVER_URL=

# ─── Chess engine ────────────────────────────────────────────
STOCKFISH_PATH=/usr/games/stockfish

# ─── Razorpay ────────────────────────────────────────────────
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# ─── Google OAuth ────────────────────────────────────────────
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ─── GitHub OAuth ────────────────────────────────────────────
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=

# ─── App ─────────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=VectoSiloAI
NEXT_PUBLIC_APP_VERSION=1.0.0
APP_URL=http://localhost:$NEXT_PORT

# ─── Email (SMTP) ────────────────────────────────────────────
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=VectoSiloAI <noreply@localhost>

# ─── Image generation ────────────────────────────────────────
IMAGE_API_BASE=https://image.pollinations.ai/prompt
IMAGE_API_MODEL=flux
IMAGE_API_KEY=
IMAGE_API_REFERRER=vectosiloai

# ─── Nvidia NIM ──────────────────────────────────────────────
NVIDIA_API_KEY=

# ─── STT (faster-whisper) ────────────────────────────────────
WHISPER_MODEL=tiny
STT_PORT=5050
ENVEOF

  log "Created .env with self-hosted defaults — EDIT .env with your real API keys!"
  info "Minimum to get started: set OLLAMA_API_KEY"
}

# ─── Install Node dependencies ───────────────────────────────
install_node_deps() {
  cd "$REPO_DIR"
  info "Installing Node.js dependencies (this may take a while)..."
  npm install --legacy-peer-deps 2>&1 | tail -3
  log "Node dependencies installed"
}

# ─── Build Next.js ───────────────────────────────────────────
build_next() {
  cd "$REPO_DIR"
  info "Building Next.js app..."
  npx next build 2>&1 | tail -5
  log "Next.js build complete"
}

# ─── Python voice services ───────────────────────────────────
setup_python_voice() {
  cd "$REPO_DIR"
  info "Setting up Python virtual environment for voice services..."

  python3 -m venv venv
  source venv/bin/activate

  pip install --quiet --upgrade pip

  # ── faster-whisper STT ──
  pip install --quiet faster-whisper fastapi uvicorn

  # ── edge-tts TTS ──
  pip install --quiet edge-tts

  log "Python voice services ready"
}

# ─── Docker: SearXNG ─────────────────────────────────────────
deploy_searxng() {
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q searxng; then
    log "SearXNG already running"
    return
  fi

  info "Deploying SearXNG container on port 6767..."
  mkdir -p "$REPO_DIR/searxng/config"

  docker run -d --name searxng --restart always \
    -p 6767:8080 \
    -v "$REPO_DIR/searxng/config:/etc/searxng:rw" \
    -e BASE_URL=http://localhost:6767 \
    -e SEARXNG_SETTINGS_PATH=/etc/searxng/settings.yml \
    searxng/searxng:latest

  # Wait for container to be ready
  sleep 5

  # Disable limiter so /search?format=json works from backend
  docker exec searxng sh -c "
    cat /etc/searxng/settings.yml | sed 's/limiter: .*/limiter: false/' > /tmp/settings.yml &&
    cp /tmp/settings.yml /etc/searxng/settings.yml
  " 2>/dev/null || true

  # Ensure JSON format is enabled
  docker exec searxng sh -c "
    grep -q 'formats:' /etc/searxng/settings.yml && \
    sed -i 's/formats:.*/formats: [html, json]/' /etc/searxng/settings.yml || true
  " 2>/dev/null || true

  docker restart searxng
  log "SearXNG running on http://localhost:6767"
}

# ─── Docker: MIT App Inventor ────────────────────────────────
deploy_appinventor() {
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q appinventor; then
    log "MIT App Inventor already running"
    return
  fi

  info "Deploying MIT App Inventor on port 8888..."
  docker run -d --name appinventor --restart always \
    -p 8888:8888 \
    cup319/appinventor

  log "MIT App Inventor running on http://localhost:8888"
}

# ─── lxcfs (virtualized /proc for sandbox) ───────────────────
setup_lxcfs() {
  info "Enabling lxcfs for sandbox /proc virtualization..."
  sudo systemctl enable lxcfs 2>/dev/null || true
  sudo systemctl start lxcfs 2>/dev/null || true

  # Verify the FUSE mount
  if mountpoint -q /var/lib/lxcfs/proc; then
    log "lxcfs active"
  else
    warn "lxcfs mount not detected — may need manual intervention"
  fi
}

# ─── Systemd service for STT server ──────────────────────────
setup_stt_service() {
  info "Creating systemd service for faster-whisper STT on port $STT_PORT..."

  sudo tee /etc/systemd/system/vectosilo-stt.service >/dev/null <<-SERVICEEOF
[Unit]
Description=VectoSiloAI faster-whisper STT server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$REPO_DIR
ExecStart=$REPO_DIR/venv/bin/python $REPO_DIR/scripts/stt-server.py $STT_PORT
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICEEOF

  sudo systemctl daemon-reload
  sudo systemctl enable vectosilo-stt
  sudo systemctl start vectosilo-stt
  log "STT service started (port $STT_PORT)"
}

# ─── Systemd service for Edge TTS wrapper ───────────────────
setup_tts_service() {
  # edge-tts is on-demand (called per-request), no daemon needed.
  # But create a helper alias
  if ! command -v vectosilo-tts &>/dev/null; then
    sudo tee /usr/local/bin/vectosilo-tts >/dev/null <<-TTSEOF
#!/usr/bin/env bash
exec $REPO_DIR/venv/bin/python $REPO_DIR/scripts/edge-tts-wrapper.py "\$@"
TTSEOF
    sudo chmod +x /usr/local/bin/vectosilo-tts
    log "TTS helper installed at /usr/local/bin/vectosilo-tts"
  fi
}

# ─── Systemd service for WebSocket server ───────────────────
setup_ws_service() {
  info "Creating systemd service for WebSocket server on port $WS_PORT..."

  sudo tee /etc/systemd/system/vectosilo-ws.service >/dev/null <<-SERVICEEOF
[Unit]
Description=VectoSiloAI WebSocket server (sandbox terminal, VNC proxy)
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$REPO_DIR
ExecStart=/usr/bin/node $REPO_DIR/server-ws.mjs
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICEEOF

  sudo systemctl daemon-reload
  sudo systemctl enable vectosilo-ws
  sudo systemctl start vectosilo-ws
  log "WebSocket service started (port $WS_PORT)"
}

# ─── Systemd service for Next.js ────────────────────────────
setup_next_service() {
  info "Creating systemd service for Next.js on port $NEXT_PORT..."

  sudo tee /etc/systemd/system/vectosilo-next.service >/dev/null <<-SERVICEEOF
[Unit]
Description=VectoSiloAI Next.js app server
After=network.target vectosilo-ws.service
Wants=vectosilo-ws.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$REPO_DIR
ExecStart=/usr/bin/npx next start -p $NEXT_PORT
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICEEOF

  sudo systemctl daemon-reload
  sudo systemctl enable vectosilo-next
  sudo systemctl start vectosilo-next
  log "Next.js service started (port $NEXT_PORT)"
}

# ─── Systemd: searxng-mul-mcp MCP server ───────────────────
setup_mcp_service() {
  info "Creating systemd service for SearXNG MCP server..."

  # We'll run it in HTTP mode on port 3004 for robustness
  sudo tee /etc/systemd/system/vectosilo-mcp.service >/dev/null <<-SERVICEEOF
[Unit]
Description=VectoSiloAI SearXNG MCP server (multi-query parallel search)
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$REPO_DIR
ExecStart=/usr/bin/npx -y searxng-mul-mcp --transport=http --host=127.0.0.1 --port=3004
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
Environment=SEARXNG_URL=http://localhost:6767

[Install]
WantedBy=multi-user.target
SERVICEEOF

  sudo systemctl daemon-reload
  sudo systemctl enable vectosilo-mcp
  sudo systemctl start vectosilo-mcp
  log "MCP service started (port 3004)"
}

# ─── Optional: cloudflared tunnel ──────────────────────────
setup_cloudflared() {
  if command -v cloudflared &>/dev/null; then
    log "cloudflared already installed"
  else
    info "Installing cloudflared..."
    curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$(dpkg --print-architecture) -o /tmp/cloudflared
    sudo install /tmp/cloudflared /usr/local/bin/cloudflared
    rm /tmp/cloudflared
    log "cloudflared installed"
  fi

  local tunnel_token
  tunnel_token="${VECTOSILO_TUNNEL_TOKEN:-}"
  if [[ -n "$tunnel_token" ]]; then
    info "Setting up cloudflared tunnel..."
    sudo cloudflared service install "$tunnel_token"
    sudo systemctl enable cloudflared
    sudo systemctl start cloudflared
    log "cloudflared tunnel running"
  else
    warn "VECTOSILO_TUNNEL_TOKEN not set — skipping tunnel setup"
    warn "  export VECTOSILO_TUNNEL_TOKEN='...' and re-run to install"
    warn "  Or run: sudo cloudflared tunnel login"
    warn "  Then:   sudo cloudflared tunnel create vectosiloai"
  fi
}

# ─── Status summary ──────────────────────────────────────────
print_summary() {
  echo ""
  echo -e "${CYAN}══════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  VectoSiloAI installation complete!${NC}"
  echo -e "${CYAN}══════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  ${YELLOW}Services:${NC}"
  echo -e "    Next.js app         →  http://localhost:$NEXT_PORT"
  echo -e "    WebSocket server    →  ws://localhost:$WS_PORT"
  echo -e "    SearXNG search      →  http://localhost:6767"
  echo -e "    MIT App Inventor    →  http://localhost:8888"
  echo -e "    STT (faster-whisper) →  http://localhost:$STT_PORT"
  echo -e "    MCP server          →  http://localhost:3004"
  echo -e "    TTS (edge-tts)      →  /usr/local/bin/vectosilo-tts"
  echo ""
  echo -e "  ${YELLOW}Systemd services:${NC}"
  echo -e "    sudo systemctl status vectosilo-next"
  echo -e "    sudo systemctl status vectosilo-ws"
  echo -e "    sudo systemctl status vectosilo-stt"
  echo -e "    sudo systemctl status vectosilo-mcp"
  echo ""
  echo -e "  ${YELLOW}Logs:${NC}"
  echo -e "    journalctl -u vectosilo-next -f"
  echo -e "    journalctl -u vectosilo-ws -f"
  echo -e "    journalctl -u vectosilo-stt -f"
  echo -e "    journalctl -u vectosilo-mcp -f"
  echo ""
  echo -e "  ${YELLOW}Next steps:${NC}"
  echo -e "    1. Edit $REPO_DIR/.env with your real API keys"
  echo -e "    2. Restart services: sudo systemctl restart vectosilo-next"
  echo -e "    3. For faster-whisper, a large model download on first use"
  echo -e "    4. Log out and back in if Docker group was added"
  echo -e "    5. (Optional) Set up cloudflared tunnel for public access"
  echo ""
}

# ─── Interactive menu ─────────────────────────────────────────
show_menu() {
  echo ""
  echo -e "${CYAN}Select what to install:${NC}"
  echo -e "  ${GREEN}1)${NC}  Full stack (everything)"
  echo -e "  ${GREEN}2)${NC}  Minimal: Web app + search only"
  echo -e "  ${GREEN}3)${NC}  Voice services only (STT + TTS)"
  echo -e "  ${GREEN}4)${NC}  Docker services only (SearXNG + App Inventor)"
  echo -e "  ${GREEN}5)${NC}  System services only (systemd units)"
  echo -e "  ${GREEN}6)${NC}  cloudflared tunnel"
  echo -e "  ${GREEN}0)${NC}  Exit"
  echo ""
  read -rp "Choice [0-6]: " choice
  echo ""
}

main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║        VectoSiloAI — full-stack installer             ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
  echo ""

  preflight

  local mode="${1:-}"
  if [[ -z "$mode" ]]; then
    show_menu
    case "$choice" in
      1) mode="full" ;;
      2) mode="minimal" ;;
      3) mode="voice" ;;
      4) mode="docker" ;;
      5) mode="services" ;;
      6) mode="tunnel" ;;
      0) exit 0 ;;
      *) err "Invalid choice"; exit 1 ;;
    esac
  fi

  case "$mode" in
    full)
      install_system_deps
      install_node
      install_docker
      clone_repo
      setup_env
      install_node_deps
      build_next
      setup_python_voice
      deploy_searxng
      deploy_appinventor
      setup_lxcfs
      setup_stt_service
      setup_tts_service
      setup_ws_service
      setup_next_service
      setup_mcp_service
      ;;
    minimal)
      install_system_deps
      install_node
      install_docker
      clone_repo
      setup_env
      install_node_deps
      build_next
      deploy_searxng
      setup_ws_service
      setup_next_service
      setup_mcp_service
      ;;
    voice)
      setup_python_voice
      setup_stt_service
      setup_tts_service
      ;;
    docker)
      install_docker
      deploy_searxng
      deploy_appinventor
      ;;
    services)
      setup_stt_service
      setup_tts_service
      setup_ws_service
      setup_next_service
      setup_mcp_service
      ;;
    tunnel)
      setup_cloudflared
      exit 0
      ;;
    *)
      err "Unknown mode: $mode"
      echo "Usage: $0 [full|minimal|voice|docker|services|tunnel]"
      exit 1
      ;;
  esac

  print_summary
}

main "$@"
