import { MenuItem } from './types';

/**
 * TUTORIAL UPLOAD GAMBAR MENU:
 *
 * 1. Simpan gambar di folder: /public/images/menu/
 * 2. Format nama file: [id-menu].jpg atau [id-menu].png
 *    Contoh: mie-ayam-bakar.jpg, bakso-spesial.png
 * 3. Ukuran gambar yang disarankan: 400x400 pixel (rasio 1:1)
 * 4. Format yang didukung: JPG, PNG, WEBP
 * 5. Update field 'image' di bawah dengan path: '/images/menu/nama-file.jpg'
 *
 * Contoh struktur folder:
 * /public
 *   /images
 *     /menu
 *       mie-ayam-bakar.jpg
 *       mie-ayam-kuah.jpg
 *       bakso-spesial.jpg
 *       es-teh.jpg
 */

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'mie-ayam-bakar',
    name: 'Mie Ayam Bakar',
    basePrice: 35000,
    image: '/images/menu/mie-ayam-bakar.png', // Ganti dengan gambar yang diupload
    category: 'main',
    addOns: [{ id: 'tambah-bakso', label: 'Tambah Bakso', price: 5000 }],
  },
  {
    id: 'mie-ayam-kuah',
    name: 'Mie Ayam Kuah',
    basePrice: 30000,
    image: '/images/menu/mie-ayam-kuah.png', // Ganti dengan gambar yang diupload
    category: 'main',
    addOns: [{ id: 'tambah-bakso', label: 'Tambah Bakso', price: 5000 }],
  },
  {
    id: 'bakso-spesial',
    name: 'Bakso Spesial',
    basePrice: 30000,
    image: '/images/menu/bakso-spesial.png', // Ganti dengan gambar yang diupload
    category: 'main',
    addOns: [],
  },
  {
    id: 'es-teh',
    name: 'Es Teh',
    basePrice: 10000,
    image: '/images/menu/es-teh.png', // Ganti dengan gambar yang diupload
    category: 'drinks',
    addOns: [],
  },
];

export const MENU_CATEGORIES = [
  { id: 'all', label: 'Semua' },
  { id: 'main', label: 'Makanan' },
  { id: 'drinks', label: 'Minuman' },
] as const;

export function getMenuItemById(id: string): MenuItem | undefined {
  return MENU_ITEMS.find((item) => item.id === id);
}

export function getMenuItemsByCategory(category: string): MenuItem[] {
  if (category === 'all') return MENU_ITEMS;
  return MENU_ITEMS.filter((item) => item.category === category);
}
