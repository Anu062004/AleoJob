#!/bin/bash

# Deployment script for WSL
# Loads environment variables from .env.testnet or .env.mainnet
# Usage: bash scripts/deploy-wsl.sh [testnet|mainnet]

ENV_TYPE=${1:-testnet}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Try to load from .env file first, then .env.testnet/.env.mainnet
ENV_FILE="$PROJECT_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="$PROJECT_ROOT/.env.$ENV_TYPE"
fi

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    echo "📋 Loading environment from $ENV_FILE..."
    # Read .env file and export variables (skip comments and empty lines)
    set -a
    source "$ENV_FILE"
    set +a
    # Map ALEO_* variables to Leo CLI expected names
    export PRIVATE_KEY=${PRIVATE_KEY:-$ALEO_PRIVATE_KEY}
    export ENDPOINT=${ALEO_ENDPOINT:-${ENDPOINT}}
    export NETWORK=${ALEO_NETWORK:-${NETWORK}}
else
    echo "⚠️  Environment file not found: $ENV_FILE or .env"
    echo "   Using default testnet values..."
    export PRIVATE_KEY='APrivateKey1zkp8xH3uujgA4phUNeeRZfk31JzYuJkTUZbbvPjs2rijjYV'
    export ENDPOINT='https://api.explorer.provable.com/v2/testnet'
    export NETWORK='testnet'
    export CONSENSUS_VERSION=11
fi

# Set defaults if not set
export NETWORK=${NETWORK:-testnet}
export ENDPOINT=${ENDPOINT:-https://api.explorer.provable.com/v2/testnet}
export CONSENSUS_VERSION=${CONSENSUS_VERSION:-11}

BASE_DIR="$PROJECT_ROOT/leo-programs"
LEO_BIN=${LEO_BIN:-"$HOME/.cargo/bin/leo"}

# Leo 3.4.0 expects a REST endpoint that serves `/v2/testnet/block/height/latest`.
# `https://testnet.aleorpc.com` is a *node RPC* that does NOT match that path layout.
# So for deployment we automatically switch to a Leo-compatible explorer endpoint.
DEPLOY_ENDPOINT="$ENDPOINT"
# Leo CLI expects an explorer endpoint for live networks (v1), not the node RPC.
if [[ "$DEPLOY_ENDPOINT" == *"aleorpc.com"* ]]; then
    DEPLOY_ENDPOINT="https://api.explorer.provable.com/v1"
fi

echo "🔧 Configuration:"
echo "   Network: $NETWORK"
echo "   Endpoint: $ENDPOINT"
echo "   Deploy Endpoint: $DEPLOY_ENDPOINT"
echo "   Consensus Version: $CONSENSUS_VERSION"
echo ""

# Function to deploy a program with Leo CLI against the v1 explorer endpoint (as requested)
deploy_program() {
    local program_name=$1
    local program_dir="$BASE_DIR/$program_name"
    
    echo "========================================="
    echo "Deploying $program_name..."
    echo "========================================="
    
    cd "$program_dir" || exit 1

    if [ -z "$PRIVATE_KEY" ]; then
        echo "❌ PRIVATE_KEY is not set. Set ALEO_PRIVATE_KEY or PRIVATE_KEY in .env."
        return 1
    fi

    # Compile to ensure build artifacts are present
    $LEO_BIN clean >/dev/null 2>&1 || true
    $LEO_BIN build || {
        echo "❌ Failed to build $program_name"
        return 1
    }

    # Use the user-requested v1 explorer endpoint explicitly
    local endpoint_v1="https://api.explorer.provable.com/v1"

    $LEO_BIN deploy \
        --network "$NETWORK" \
        --endpoint "$endpoint_v1" \
        --consensus-version "${CONSENSUS_VERSION:-11}" \
        --broadcast \
        --priority-fees "${LEO_DEPLOY_PRIORITY_FEES:-0}" \
        -y || {
        echo "❌ Failed to deploy $program_name"
        return 1
    }

    echo "✅ $program_name deployed successfully!"
    echo ""
}

# Deploy all contracts in order (skip escrow - needs 10,000 credits)
deploy_program "access_control"
deploy_program "reputation"
# deploy_program "escrow"  # Skipped - needs 10,000 credits for namespace
deploy_program "job_registry"

echo "🎉 All deployments completed!"

