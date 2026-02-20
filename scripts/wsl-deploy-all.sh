#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/mnt/c/Users/ankur/OneDrive/Desktop/AleoAleo/leo-programs"
REPORT_FILE="/mnt/c/Users/ankur/OneDrive/Desktop/AleoAleo/TRANSACTION_IDS_LIVE_$(date +%Y%m%d_%H%M%S).txt"
PROGRAMS=(access_control reputation job_registry escrow)

LEO_BIN="${LEO_BIN:-$HOME/.cargo/bin/leo}"
PRIVATE_KEY="${PRIVATE_KEY:-${ALEO_PRIVATE_KEY:-}}"
NETWORK="${NETWORK:-testnet}"
ENDPOINT="${ENDPOINT:-https://api.explorer.provable.com/v1}"
PRIORITY_FEES="${LEO_DEPLOY_PRIORITY_FEES:-0}"

if [[ ! -x "$LEO_BIN" ]]; then
  echo "Leo binary not found at: $LEO_BIN"
  echo "Set LEO_BIN to your leo executable path."
  exit 1
fi

if [[ -z "$PRIVATE_KEY" ]]; then
  echo "PRIVATE_KEY / ALEO_PRIVATE_KEY is not set."
  exit 1
fi

echo "Aleo deployment report - $(date)" > "$REPORT_FILE"
echo "Network: $NETWORK" >> "$REPORT_FILE"
echo "Endpoint: $ENDPOINT" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

deploy_program() {
  local program_dir="$1"
  local path="${BASE_DIR}/${program_dir}"

  echo "=================================================="
  echo "Deploying ${program_dir}..."
  echo "=================================================="

  cd "$path"
  "$LEO_BIN" build >/dev/null

  local output
  set +e
  output=$("$LEO_BIN" deploy \
    --network "$NETWORK" \
    --endpoint "$ENDPOINT" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --priority-fees "$PRIORITY_FEES" \
    --yes 2>&1)
  local code=$?
  set -e

  echo "$output"

  if [[ $code -ne 0 ]]; then
    echo "${program_dir}: FAILED" | tee -a "$REPORT_FILE"
    echo "$output" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    return $code
  fi

  local tx_id
  tx_id=$(echo "$output" | grep -Eo 'at1[0-9a-z]+' | head -n 1 || true)

  if [[ -z "$tx_id" ]]; then
    tx_id="NOT_FOUND_IN_OUTPUT"
  fi

  echo "${program_dir}: ${tx_id}" | tee -a "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  return 0
}

overall_code=0
for p in "${PROGRAMS[@]}"; do
  if ! deploy_program "$p"; then
    overall_code=1
  fi
done

echo "Report written to: $REPORT_FILE"
exit $overall_code
