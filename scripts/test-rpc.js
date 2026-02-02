import { AleoNetworkClient } from '@provablehq/sdk/testnet.js';

async function testRPC(endpoint) {
    console.log(`\nTesting endpoint: ${endpoint}`);
    try {
        const client = new AleoNetworkClient(endpoint);
        const latest = await client.getLatestBlock();
        console.log(`✅ Success! Latest block: ${latest}`);
    } catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        // Attempt to extract the URL if it's an axios error
        if (error.config?.url) {
            console.error(`   Requested URL: ${error.config.url}`);
        }
    }
}

async function runTests() {
    console.log('--- Aleo RPC Connection Diagnostics ---');

    const tests = [
        'https://api.explorer.provable.com/v1',
        'https://api.explorer.provable.com',
        'https://api.explorer.aleo.org/v1',
        'https://testnet.aleorpc.com'
    ];

    for (const t of tests) {
        await testRPC(t);
    }
}

runTests();
