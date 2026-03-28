import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'POS Family Bakso',
    short_name: 'Family Bakso POS',
    description: 'POS Family Bakso dengan dukungan offline untuk tablet kasir.',
    start_url: '/kasir',
    display: 'standalone',
    background_color: '#f6f8fb',
    theme_color: '#0ea5a8',
    lang: 'id',
    icons: [
      {
        src: '/images/logo-family-bakso.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/logo-family-bakso.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/images/logo-family-bakso.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
