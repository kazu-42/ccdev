// Cloudflare Access JWT Validation Middleware
import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { Env } from '../types';

/**
 * Cloudflare Access JWT payload structure
 * @see https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */
export interface AccessPayload {
  aud: string[];
  email: string;
  exp: number;
  iat: number;
  nonce: string;
  identity_nonce: string;
  sub: string;
  iss: string;
  country?: string;
  custom?: Record<string, unknown>;
}

/**
 * Validates Cloudflare Access JWT token
 *
 * Cloudflare Access automatically adds the JWT to request headers:
 * - Cf-Access-Jwt-Assertion: Contains the JWT
 *
 * @param request - The incoming request
 * @param env - Environment bindings with TEAM_DOMAIN and POLICY_AUD
 * @returns AccessPayload if valid, null otherwise
 */
export async function validateAccessToken(
  request: Request,
  env: Env
): Promise<AccessPayload | null> {
  // Get JWT from Cloudflare Access header
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) {
    return null;
  }

  // Ensure required env vars are present
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_POLICY_AUD) {
    console.error('Missing CF_ACCESS_TEAM_DOMAIN or CF_ACCESS_POLICY_AUD');
    return null;
  }

  try {
    // Create JWKS endpoint URL
    const certsUrl = new URL(
      '/cdn-cgi/access/certs',
      env.CF_ACCESS_TEAM_DOMAIN
    );

    // Create remote JWKS validator
    const JWKS = createRemoteJWKSet(certsUrl);

    // Verify the token
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.CF_ACCESS_TEAM_DOMAIN,
      audience: env.CF_ACCESS_POLICY_AUD,
    });

    return payload as unknown as AccessPayload;
  } catch (error) {
    console.error('Access token validation failed:', error);
    return null;
  }
}

/**
 * Extracts user email from Cloudflare Access headers
 * This is a simpler check that doesn't validate the JWT signature
 * Use validateAccessToken for full validation
 */
export function getAccessEmail(request: Request): string | null {
  return request.headers.get('Cf-Access-Authenticated-User-Email');
}

/**
 * Checks if request is authenticated via Cloudflare Access
 */
export function hasAccessHeaders(request: Request): boolean {
  return (
    request.headers.has('Cf-Access-Jwt-Assertion') ||
    request.headers.has('Cf-Access-Authenticated-User-Email')
  );
}
