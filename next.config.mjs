/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output giver et lille Docker-image (kun det noedvendige + server.js).
  output: 'standalone',
  experimental: {
    // pdfkit er et server-only modul der ikke maa bundles af webpack.
    serverComponentsExternalPackages: ['pdfkit', 'fontkit'],
    // pdfkit har AFM-font-filer der skal med i standalone-outputtet, ellers
    // fejler PDF-genereringen i Docker. P40: det samme for den indlejrede
    // Unicode-font (Liberation Sans) i assets/fonts.
    outputFileTracingIncludes: {
      '/api/admin/rapport/pdf': ['./node_modules/pdfkit/js/data/**/*', './assets/fonts/**/*'],
    },
  },
};

export default nextConfig;
