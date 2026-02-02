#!/bin/bash

# Rebuild and Deploy Escrow Program (Without Constructor)
# This script rebuilds the escrow program and deploys it to Aleo testnet

set -e  # Exit on error

echo "🔨 Rebuilding escrow program..."
cd leo-programs/escrow
leo build

echo ""
echo "✅ Build successful!"
echo ""
echo "📦 Compiled program location: leo-programs/escrow/build/main.aleo"
echo ""
echo "🚀 Now deploying to testnet..."
echo ""

# Check if private key is set
if [ -z "$ALEO_PRIVATE_KEY" ]; then
    echo "❌ ERROR: ALEO_PRIVATE_KEY environment variable not set"
    echo ""
    echo "Please set your private key:"
    echo "export ALEO_PRIVATE_KEY='your_private_key_here'"
    echo ""
    exit 1
fi

# Deploy the program
echo "Deploying job_marketplace_escrow_engine.aleo..."
leo deploy --network testnet --private-key "$ALEO_PRIVATE_KEY"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "⚠️  IMPORTANT: Update your .env file with the new deployment transaction ID"
echo ""
