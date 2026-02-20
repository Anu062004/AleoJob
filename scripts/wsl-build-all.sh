#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/mnt/c/Users/ankur/OneDrive/Desktop/AleoAleo/leo-programs"
PROGRAMS=(access_control reputation job_registry escrow)
LEO_BIN="${LEO_BIN:-$HOME/.cargo/bin/leo}"

if [[ ! -x "$LEO_BIN" ]]; then
  echo "Leo binary not found at: $LEO_BIN"
  echo "Set LEO_BIN to your leo executable path."
  exit 1
fi

for p in "${PROGRAMS[@]}"; do
  echo "===== BUILD ${p} ====="
  cd "${BASE_DIR}/${p}"
  "$LEO_BIN" clean >/dev/null 2>&1 || true
  "$LEO_BIN" build
done
