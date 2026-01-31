#!/usr/bin/env python3
import json
import sys
import urllib.request

blocks = {
    'access_control': 13925577,
    'reputation': 13925593,
    'escrow': 13925818
}

results = {}

for name, block_num in blocks.items():
    try:
        url = f'https://api.explorer.provable.com/v1/testnet/block/{block_num}'
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0')
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read())
            
            for tx in data.get('transactions', []):
                if tx.get('type') == 'deploy':
                    program = tx.get('transaction', {}).get('deployment', {}).get('program', '')
                    program_lower = program.lower()
                    if name in program_lower or (name == 'escrow' and 'escrow' in program_lower):
                        tx_id = tx.get('transaction', {}).get('id', '')
                        if tx_id:
                            results[name] = tx_id
                            break
    except Exception as e:
        print(f"Error fetching {name}: {e}", file=sys.stderr)

# Print results
for name, tx_id in results.items():
    print(f"{name.upper()}_DEPLOY_TX_ID={tx_id}")

