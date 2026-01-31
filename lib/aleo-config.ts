// Aleo Configuration
// Central configuration for Aleo network and program IDs
// NOTE: Currently configured for TESTNET only

export const ALEO_CONFIG = {
  network: 'testnet' as const, // Force testnet - change in production
  // RPC endpoints (used for submit/broadcast-style calls; ordered by preference)
  // Recommended combo: Provable testnet first, then local snarkOS as fallback.
  rpcEndpoints: (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ALEO_RPC_ENDPOINTS) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ALEO_ENDPOINTS) ||
    (typeof process !== 'undefined' && process.env?.ALEO_ENDPOINT) ||
    (typeof process !== 'undefined' && process.env?.ENDPOINT) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALEO_RPC_ENDPOINTS) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALEO_ENDPOINTS) ||
    'https://api.explorer.aleo.org/v1/testnet,https://api.explorer.provable.com/v1/testnet'
  )
    .split(',')
    .map((s: any) => s.trim())
    .filter(Boolean),

  // Explorer/query endpoints (used for reads like balances/records; ordered by preference)
  queryEndpoints: (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ALEO_QUERY_ENDPOINTS) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ALEO_QUERY_ENDPOINT) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALEO_QUERY_ENDPOINTS) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALEO_QUERY_ENDPOINT) ||
    'https://api.explorer.aleo.org/v1/testnet'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Back-compat single fields (some older code may still reference these)
  endpoint: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ALEO_ENDPOINT) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALEO_ENDPOINT) ||
    'https://api.explorer.aleo.org/v1/testnet',
  queryEndpoint: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ALEO_QUERY_ENDPOINT) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ALEO_QUERY_ENDPOINT) ||
    'https://api.explorer.aleo.org/v1/testnet',

  // Program IDs (deployed to testnet)
  programs: {
    accessControl: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ACCESS_CONTROL_PROGRAM_ID) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ACCESS_CONTROL_PROGRAM_ID) ||
      'access_control.aleo',
    reputation: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_REPUTATION_PROGRAM_ID) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REPUTATION_PROGRAM_ID) ||
      'reputation.aleo',
    jobRegistry: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_JOB_REGISTRY_PROGRAM_ID) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JOB_REGISTRY_PROGRAM_ID) ||
      'job_registry.aleo',
    escrow: (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ESCROW_PROGRAM_ID) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ESCROW_PROGRAM_ID) ||
      'job_marketplace_escrow_engine.aleo',
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


