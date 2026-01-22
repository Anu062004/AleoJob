// JWT Helper for Aleo Address Authentication
// NOTE: This is a simplified implementation for development.
// In production, use a proper JWT library (e.g. jsonwebtoken) and Supabase Auth custom claims.

export function createJWT(aleoAddress: string): string {
  const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    aleo_address: aleoAddress,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from(`${encodedHeader}.${encodedPayload}.${secret}`).toString('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJWT(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.aleo_address || null;
  } catch {
    return null;
  }
}


