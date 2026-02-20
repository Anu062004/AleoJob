// Aleo Configuration
// Central configuration for Aleo network and program IDs
// NOTE: Currently configured for TESTNET only

function readEnvValue(keys: string[]): string | undefined {
  for (const key of keys) {
    if (typeof process !== 'undefined') {
      const processValue = process.env?.[key];
      if (typeof processValue === 'string' && processValue.trim()) {
        return processValue.trim();
      }
    }

    if (typeof import.meta !== 'undefined') {
      const importMetaEnv = (import.meta as any).env;
      const importMetaValue = importMetaEnv?.[key];
      if (typeof importMetaValue === 'string' && importMetaValue.trim()) {
        return importMetaValue.trim();
      }
    }
  }

  return undefined;
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const rpcEndpointRaw =
  readEnvValue([
    'NEXT_PUBLIC_ALEO_RPC_ENDPOINTS',
    'ALEO_RPC_ENDPOINTS',
    'NEXT_PUBLIC_ALEO_ENDPOINTS',
    'VITE_ALEO_RPC_ENDPOINTS',
    'VITE_ALEO_ENDPOINTS',
    'NEXT_PUBLIC_ALEO_ENDPOINT',
    'VITE_ALEO_ENDPOINT',
    'ALEO_ENDPOINT',
    'ENDPOINT',
  ]) || 'https://api.explorer.aleo.org/v1,https://api.explorer.provable.com/v1';

const queryEndpointRaw =
  readEnvValue([
    'NEXT_PUBLIC_ALEO_QUERY_ENDPOINTS',
    'NEXT_PUBLIC_ALEO_QUERY_ENDPOINT',
    'VITE_ALEO_QUERY_ENDPOINTS',
    'VITE_ALEO_QUERY_ENDPOINT',
    'NEXT_PUBLIC_ALEO_ENDPOINT',
    'VITE_ALEO_ENDPOINT',
    'ALEO_ENDPOINT',
  ]) || rpcEndpointRaw;

const endpointRaw =
  readEnvValue(['NEXT_PUBLIC_ALEO_ENDPOINT', 'VITE_ALEO_ENDPOINT']) || 'https://api.explorer.aleo.org/v1';

const queryEndpointSingleRaw =
  readEnvValue(['NEXT_PUBLIC_ALEO_QUERY_ENDPOINT', 'VITE_ALEO_QUERY_ENDPOINT']) ||
  splitCsv(queryEndpointRaw)[0] ||
  endpointRaw;

const accessControlProgram =
  readEnvValue([
    'NEXT_PUBLIC_ACCESS_CONTROL_PROGRAM_ID',
    'VITE_ACCESS_CONTROL_PROGRAM_ID',
    'NEXT_PUBLIC_ALEO_ACCESS_CONTROL_PROGRAM',
    'VITE_ALEO_ACCESS_CONTROL_PROGRAM',
    'ACCESS_CONTROL_PROGRAM_ID',
    'ALEO_ACCESS_CONTROL_PROGRAM_ID',
  ]) || 'access_control_v3.aleo';

const reputationProgram =
  readEnvValue([
    'NEXT_PUBLIC_REPUTATION_PROGRAM_ID',
    'VITE_REPUTATION_PROGRAM_ID',
    'NEXT_PUBLIC_ALEO_REPUTATION_PROGRAM',
    'VITE_ALEO_REPUTATION_PROGRAM',
    'REPUTATION_PROGRAM_ID',
    'ALEO_REPUTATION_PROGRAM_ID',
  ]) || 'reputation_v3.aleo';

const jobRegistryProgram =
  readEnvValue([
    'NEXT_PUBLIC_JOB_REGISTRY_PROGRAM_ID',
    'VITE_JOB_REGISTRY_PROGRAM_ID',
    'NEXT_PUBLIC_ALEO_JOB_REGISTRY_PROGRAM',
    'VITE_ALEO_JOB_REGISTRY_PROGRAM',
    'JOB_REGISTRY_PROGRAM_ID',
    'ALEO_JOB_REGISTRY_PROGRAM_ID',
  ]) || 'job_registry_v3.aleo';

const escrowProgram =
  readEnvValue([
    'NEXT_PUBLIC_ESCROW_PROGRAM_ID',
    'VITE_ESCROW_PROGRAM_ID',
    'NEXT_PUBLIC_ALEO_ESCROW_PROGRAM',
    'VITE_ALEO_ESCROW_PROGRAM',
    'ESCROW_PROGRAM_ID',
    'ALEO_ESCROW_PROGRAM_ID',
  ]) || 'escrow_v4.aleo';

export const ALEO_CONFIG = {
  network: 'testnet' as const, // Force testnet - change in production
  // RPC endpoints (used for submit/broadcast-style calls; ordered by preference)
  // Recommended combo: Provable testnet first, then local snarkOS as fallback.
  rpcEndpoints: (() => {
    const endpoints = splitCsv(rpcEndpointRaw)
      .map((s: string) => {
        // Only strip /testnet (not testnet3) and /v1 if they're at the end
        // Preserve testnet3, testnetbeta, etc.
        return s
          .replace(/\/testnet(?!3|beta)\/?$/, '')  // Remove /testnet but keep /testnet3 or /testnetbeta
          .replace(/\/v1\/?$/, '')
          .replace(/\/+$/, '');
      })
      .filter(Boolean);

    console.log('🔍 [Aleo Config] RPC Endpoints:', endpoints);
    return endpoints;
  })(),

  // Explorer/query endpoints (used for reads like balances/records; ordered by preference)
  queryEndpoints: splitCsv(queryEndpointRaw)
    .map((s: string) => s.endsWith('/testnet') ? s.replace('/testnet', '') : s)
    .filter(Boolean),

  // Back-compat single fields (some older code may still reference these)
  endpoint: endpointRaw.replace(/\/testnet$/, ''),
  queryEndpoint: queryEndpointSingleRaw.replace(/\/testnet$/, ''),

  // Program IDs (deployed to testnet)
  programs: {
    accessControl: accessControlProgram,
    reputation: reputationProgram,
    jobRegistry: jobRegistryProgram,
    escrow: escrowProgram,
  },

  // Deployment transaction IDs (for reference - deployed on testnet)
  deploymentTxIds: {
    accessControl: 'at1gle07ajny33jlew26rf3thz0z4msux047y6p4qpt72j995fcevgqhx8dyp',
    reputation: 'at16jhed2qd4yjfue4zjlxyt0ljvnrrkg488fnzmp9dlp6pt9jvnqqqsh64f5',
    jobRegistry: 'at14g4cs6suhz5c7m3yuhlpxfn82tk70vuushtusw5xcnrh6lgyrvqq4klrgm',
    escrow: 'at1nx028nv4acplcck5ure03y49ezlmwvthsjktsk0nk0kvmkz245xqjhxpac',
  },

  // Server-side only (not exposed to browser)
  server: {
    privateKey: (typeof process !== 'undefined' && process.env?.ALEO_PRIVATE_KEY) || undefined,
    viewKey: (typeof process !== 'undefined' && process.env?.ALEO_VIEW_KEY) || undefined,
    address: (typeof process !== 'undefined' && process.env?.ALEO_ADDRESS) || undefined,
  },
} as const;

// Credits required
export const ALEO_CREDITS = {
  JOB_SEEKER_ACCESS: 1,
  JOB_GIVER_ACCESS: 3,
} as const;
