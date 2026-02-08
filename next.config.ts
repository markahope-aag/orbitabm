import type { NextConfig } from "next";

/**
 * Security Headers Configuration
 * 
 * Implements comprehensive security headers to protect against:
 * - XSS (Cross-Site Scripting) attacks
 * - CSRF (Cross-Site Request Forgery) attacks
 * - Clickjacking attacks
 * - MIME type sniffing
 * - Information disclosure
 * - Man-in-the-middle attacks
 */
const securityHeaders = [
  // Prevent DNS prefetching to reduce information leakage
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  // Enforce HTTPS connections (HSTS)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  // Enable XSS protection in browsers
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  // Prevent clickjacking attacks
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  // Permissions Policy (formerly Feature Policy)
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  },
  // Content Security Policy (CSP) - Comprehensive protection
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.github.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ')
  }
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Apply security headers to all routes
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Redirect HTTP to HTTPS in production
  async redirects() {
    return [
      // Force HTTPS in production
      ...(process.env.NODE_ENV === 'production' ? [
        {
          source: '/:path*',
          has: [
            {
              type: 'header' as const,
              key: 'x-forwarded-proto',
              value: 'http',
            },
          ],
          destination: 'https://:host/:path*',
          permanent: true,
        },
      ] : []),
    ];
  },

  // Optimize for security and performance
  compress: true,
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Image optimization security
  images: {
    domains: [], // Restrict external image domains
    dangerouslyAllowSVG: false, // Disable SVG support for security
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
