#!/bin/bash

# Script to find deployment transaction IDs for Aleo contracts
# Run this in WSL: bash scripts/find-tx-ids.sh

echo "Searching for deployment transaction IDs..."
echo ""

# Search around the known block for job_registry (13925614)
START_BLOCK=13925600
END_BLOCK=13925630

for block in $(seq $START_BLOCK $END_BLOCK); do
    result=$(curl -s "https://api.explorer.provable.com/v1/testnet/block/$block" 2>/dev/null | python3 -m json.tool 2>/dev/null)
    
    if echo "$result" | grep -q "access_control.aleo"; then
        tx_id=$(echo "$result" | grep -A 5 "access_control" | grep '"id"' | head -1 | cut -d'"' -f4)
        echo "✅ ACCESS_CONTROL found in block $block"
        echo "   Transaction ID: $tx_id"
        echo ""
    fi
    
    if echo "$result" | grep -q "reputation.aleo"; then
        tx_id=$(echo "$result" | grep -A 5 "reputation" | grep '"id"' | head -1 | cut -d'"' -f4)
        echo "✅ REPUTATION found in block $block"
        echo "   Transaction ID: $tx_id"
        echo ""
    fi
    
    if echo "$result" | grep -q "job_marketplace_escrow_engine.aleo"; then
        tx_id=$(echo "$result" | grep -A 5 "escrow" | grep '"id"' | head -1 | cut -d'"' -f4)
        echo "✅ ESCROW found in block $block"
        echo "   Transaction ID: $tx_id"
        echo ""
    fi
done

echo "✅ JOB_REGISTRY Transaction ID: at14g4cs6suhz5c7m3yuhlpxfn82tk70vuushtusw5xcnrh6lgyrvqq4klrgm"
echo "   Block: 13925614"





