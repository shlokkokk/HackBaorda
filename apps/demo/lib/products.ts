export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  badge?: string;
}

export const PRODUCTS: Product[] = [
  { id: 'wf-001', name: 'Wireless Earbuds Pro', price: 129.99, category: 'Audio', image: '🎧', badge: 'Best Seller' },
  { id: 'wf-002', name: 'Smart Watch Series X', price: 299.0, category: 'Wearables', image: '⌚' },
  { id: 'wf-003', name: 'USB-C Hub 7-in-1', price: 49.99, category: 'Accessories', image: '🔌' },
  { id: 'wf-004', name: 'Mechanical Keyboard', price: 159.0, category: 'Peripherals', image: '⌨️', badge: 'New' },
  { id: 'wf-005', name: '4K Webcam', price: 89.99, category: 'Video', image: '📷' },
  { id: 'wf-006', name: 'Portable SSD 1TB', price: 119.0, category: 'Storage', image: '💾' },
];
