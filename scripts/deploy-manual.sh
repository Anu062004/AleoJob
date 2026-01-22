#!/bin/bash

# Manual deployment - try one contract at a time
# Usage: bash deploy-manual.sh <contract_name>

export PRIVATE_KEY='APrivateKey1zkp8xH3uujgA4phUNeeRZfk31JzYuJkTUZbbvPjs2rijjYV'
export ENDPOINT='https://api.explorer.provable.com/v2/testnet'
export NETWORK='testnet'

BASE_DIR="/mnt/c/Users/ankur/OneDrive/Desktop/AleoAleo/leo-programs"
LEO_BIN="$HOME/.cargo/bin/leo"

CONTRACT=$1

if [ -z "$CONTRACT" ]; then
    echo "Usage: bash deploy-manual.sh <contract_name>"
    echo "Available: access_control, reputation, escrow, job_registry"
    exit 1
fi

PROGRAM_DIR="$BASE_DIR/$CONTRACT"

echo "Deploying $CONTRACT..."
cd "$PROGRAM_DIR" || exit 1

# Try deployment with various flags
$LEO_BIN deploy \
    --network "$NETWORK" \
    --endpoint "$ENDPOINT" \
    --consensus-version 11 \
    --broadcast \
    --priority-fee 0 \
    --yes







