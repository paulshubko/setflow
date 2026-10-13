#!/usr/bin/env bash
# SetFlow shed: the full exercise catalog (873 exercises, 2 photos each) on your home server.
# Run on the server (Ubuntu), like the sync server installer:
#   curl -fsSL https://raw.githubusercontent.com/paulshubko/setflow/main/shed/setup-shed.sh | sudo bash
# Idempotent: safe to run again. Nothing is exposed to the internet by this script.
set -euo pipefail

COMMIT="f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5"   # pinned free-exercise-db revision (ids stay stable)
SHED="${SHED:-/srv/setflow-shed}"
PORT="${PORT:-8090}"
RAW="https://raw.githubusercontent.com/paulshubko/setflow/main/shed"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"

[ "$(id -u)" = 0 ] || { echo "Run with sudo (see the command at the top of this file)."; exit 1; }

echo "==> packages"
if [ -z "${SKIP_APT:-}" ]; then
  apt-get update -qq
  apt-get install -y -qq git python3 curl
fi

echo "==> directories"
mkdir -p "$SHED/public"
chmod 755 "$SHED" "$SHED/public"

echo "==> dataset @ ${COMMIT:0:7}"
if [ ! -d "$SHED/source/.git" ]; then
  git init -q "$SHED/source"
  git -C "$SHED/source" remote add origin https://github.com/yuhonas/free-exercise-db.git
fi
if [ "$(git -C "$SHED/source" rev-parse HEAD 2>/dev/null || true)" != "$COMMIT" ]; then
  git -C "$SHED/source" fetch -q --depth 1 origin "$COMMIT"
  git -C "$SHED/source" checkout -q --force FETCH_HEAD
fi

echo "==> catalog"
for f in shed_server.py build_catalog.py; do
  if [ -n "$HERE" ] && [ -f "$HERE/$f" ]; then cp "$HERE/$f" "$SHED/$f"; else curl -fsSL "$RAW/$f" -o "$SHED/$f"; fi
done
ln -sfn "$SHED/source/exercises" "$SHED/public/img"
python3 "$SHED/build_catalog.py" "$SHED/source" "$SHED/public/catalog.json" "$COMMIT"
chmod -R a+rX "$SHED"

if [ -z "${SKIP_SYSTEMD:-}" ]; then
  echo "==> systemd service"
  cat >/etc/systemd/system/setflow-shed.service <<EOF
[Unit]
Description=SetFlow shed (exercise photos, read-only)
After=network.target

[Service]
DynamicUser=yes
ExecStart=/usr/bin/python3 $SHED/shed_server.py --root $SHED/public --port $PORT --host 127.0.0.1
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadOnlyPaths=$SHED

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now setflow-shed
  systemctl restart setflow-shed
  sleep 1

  echo "==> local check"
  curl -fsS "http://127.0.0.1:$PORT/catalog.json" -o /dev/null -w "catalog.json: HTTP %{http_code}, %{size_download} bytes\n"
  curl -fsS "http://127.0.0.1:$PORT/img/Goblet_Squat/0.jpg" -o /dev/null -w "photo: HTTP %{http_code}, %{size_download} bytes\n"
fi
du -sh "$SHED/source" | sed 's/^/disk used: /'

cat <<EOF

Done. The shed listens on 127.0.0.1:$PORT only (not on the internet yet).
Publish just the /shed path next to your sync route (does not touch it):
  tailscale funnel status
  sudo tailscale funnel --bg --https=443 --set-path=/shed $PORT
  tailscale funnel status
Check from your phone on mobile data:   <your sync address>/shed/catalog.json
Turn it off again:                       sudo tailscale funnel --https=443 --set-path=/shed off
Logs:                                    journalctl -u setflow-shed -n 50
EOF
