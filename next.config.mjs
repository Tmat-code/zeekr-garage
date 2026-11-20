/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output giver et lille Docker-image (kun det noedvendige + server.js).
  output: 'standalone',
  experimental: {
    // pdfkit er et server-only modul der ikke maa bundles af webpack.
    serverComponentsExternalPackages: ['pdfkit'],
    // pdfkit har AFM-font-filer der skal med i standalone-outputtet, ellers
    // fejler PDF-genereringen i Docker.
    outputFileTracingIncludes: {
      '/api/admin/rapport/pdf': ['./node_modules/pdfkit/js/data/**/*'],
    },
  },
};

export default nextConfig;
