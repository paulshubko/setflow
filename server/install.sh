#!/usr/bin/env bash
# SetFlow sync server installer for Ubuntu (run on the server).
#
#   curl -fsSL https://raw.githubusercontent.com/paulshubko/setflow/main/server/install.sh | sudo bash
#
# Re-running is safe: it updates the code and keeps your data and token.
#   ... | sudo bash -s -- --rotate-token     generate a new token (old one stops working)
set -euo pipefail

main() {
  if [ "$(id -u)" -ne 0 ]; then echo "Run with sudo."; exit 1; fi

  local RAW="https://raw.githubusercontent.com/paulshubko/setflow/main/server"
  local APP=/opt/setflow DATA=/var/lib/setflow ENVF=/etc/setflow/env PORT=8787
  local ROTATE=0
  [ "${1:-}" = "--rotate-token" ] && ROTATE=1

  echo "==> Node.js"
  if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
    apt-get update -y
    apt-get install -y nodejs
  fi
  node --version

  echo "==> User and folders"
  id setflow >/dev/null 2>&1 || useradd --system --home "$DATA" --shell /usr/sbin/nologin setflow
  mkdir -p "$APP" "$DATA" /etc/setflow
  chown -R setflow:setflow "$DATA"

  echo "==> Server code"
  local SRC_DIR=""
  if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "$(dirname "${BASH_SOURCE[0]}")/server.js" ]; then
    SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  fi
  if [ -n "$SRC_DIR" ]; then
    install -m 0644 "$SRC_DIR/server.js" "$APP/server.js"
  else
    curl -fsSL "$RAW/server.js" -o "$APP/server.js.new"
    node --check "$APP/server.js.new"
    mv "$APP/server.js.new" "$APP/server.js"
  fi

  echo "==> Token"
  local NEWTOKEN=0
  if [ ! -f "$ENVF" ] || [ "$ROTATE" = 1 ]; then
    local TOKEN
    TOKEN="$(head -c 24 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n')"
    umask 077
    {
      echo "SETFLOW_TOKEN=$TOKEN"
      echo "PORT=$PORT"
      echo "DATA_DIR=$DATA"
      echo "ALLOWED_ORIGINS=https://paulshubko.github.io"
    } > "$ENVF"
    chmod 600 "$ENVF"
    umask 022
    NEWTOKEN=1
  fi

  echo "==> systemd service"
  cat > /etc/systemd/system/setflow-sync.service <<EOF
[Unit]
Description=SetFlow sync server
After=network.target

[Service]
EnvironmentFile=$ENVF
ExecStart=/usr/bin/env node $APP/server.js
User=setflow
Group=setflow
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$DATA

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable setflow-sync.service >/dev/null
  systemctl restart setflow-sync.service
  sleep 2
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null; then
    echo "Server is up on 127.0.0.1:$PORT"
  else
    echo "Server did not start. Logs: journalctl -u setflow-sync -n 50"; exit 1
  fi

  echo "==> Public HTTPS address (Tailscale Funnel)"
  local URL=""
  if command -v tailscale >/dev/null 2>&1; then
    if tailscale funnel --bg "$PORT"; then
      URL="https://$(tailscale status --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).Self.DNSName.replace(/\.$/,"")))')"
    else
      echo "Funnel is not enabled yet. Open the link printed above, enable it, then run:  sudo tailscale funnel --bg $PORT"
    fi
  else
    echo "Tailscale is not installed."
  fi

  local TOKEN_NOW
  TOKEN_NOW="$(grep '^SETFLOW_TOKEN=' "$ENVF" | cut -d= -f2-)"
  echo
  echo "=========================================================="
  [ "$NEWTOKEN" = 1 ] && echo "NEW TOKEN (save it, shown only here): $TOKEN_NOW" || echo "Token unchanged (see $ENVF). Use --rotate-token for a new one."
  if [ -n "$URL" ]; then
    echo "Server URL: $URL"
    local PAYLOAD
    PAYLOAD="$(printf '{"u":"%s","t":"%s"}' "$URL" "$TOKEN_NOW" | base64 -w0 | tr '+/' '-_' | tr -d '=')"
    echo
    echo "Open this link on your phone once, it fills the settings in SetFlow:"
    echo "https://paulshubko.github.io/setflow/#sync=$PAYLOAD"
  fi
  echo "=========================================================="
  echo "Data: $DATA/state.json, daily backups: $DATA/backups/"
}
main "$@"
