#!/bin/bash

# Manual deployment - try one contract at a time
# Usage: bash deploy-manual.sh <contract_name>

export PRIVATE_KEY='APrivateKey1zkp8xH3uujgA4phUNeeRZfk31JzYuJkTUZbbvPjs2rijjYV'
export ENDPOINT='https://api.provable.com/v2/testnet'
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

echo "🔨 Building $CONTRACT..."
cd "$PROGRAM_DIR" || exit 1

# Build the program first
$LEO_BIN build

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Deploying $CONTRACT to testnet..."

# Deploy with updated endpoint
$LEO_BIN deploy \
    --network "$NETWORK" \
    --endpoint "$ENDPOINT" \
    --private-key "$PRIVATE_KEY" \
    --priority-fee 0 \
    --yes

echo ""
echo "✅ Deployment complete!"



