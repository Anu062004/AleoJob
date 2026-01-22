#!/bin/bash

# Load environment variables from .env files
# Usage: source scripts/load-env.sh [testnet|mainnet]

ENV_TYPE=${1:-testnet}

if [ "$ENV_TYPE" = "mainnet" ]; then
    ENV_FILE=".env.mainnet"
else
    ENV_FILE=".env.testnet"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    echo "   Please create it from .env.example"
    exit 1
fi

echo "📋 Loading environment from $ENV_FILE..."

# Export all variables from .env file
export $(cat "$ENV_FILE" | grep -v '^#' | grep -v '^$' | xargs)

echo "✅ Environment loaded:"
echo "   Network: $ALEO_NETWORK"
echo "   Endpoint: $ALEO_ENDPOINT"
echo "   Address: $ALEO_ADDRESS"







