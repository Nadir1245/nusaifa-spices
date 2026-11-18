export const PLUGIN_REGISTRY = [
  {
    category: 'Payment',
    plugins: [
      { key: 'bkash', name: 'bKash', description: 'Mobile financial service payment', version: '1.0.0' },
      { key: 'nagad', name: 'Nagad', description: 'Mobile financial service payment', version: '1.0.0' },
      { key: 'sslcommerz', name: 'SSLCommerz', description: 'Payment gateway', version: '1.0.0' },
    ],
  },
  {
    category: 'Courier & Delivery',
    plugins: [
      { key: 'steadfast', name: 'Steadfast', description: 'Courier booking and delivery tracking', version: '1.0.0' },
      { key: 'pathao', name: 'Pathao Courier', description: 'Courier booking and delivery tracking', version: '1.0.0' },
      { key: 'redx', name: 'RedX', description: 'Courier booking and delivery tracking', version: '1.0.0' },
    ],
  },
  {
    category: 'Marketing & Analytics',
    plugins: [
      { key: 'meta-pixel', name: 'Meta Pixel', description: 'Facebook and Instagram campaign tracking', version: '1.0.0' },
      { key: 'google-analytics', name: 'Google Analytics', description: 'Website visitor analytics', version: '1.0.0' },
    ],
  },
  {
    category: 'Communication',
    plugins: [
      { key: 'whatsapp', name: 'WhatsApp', description: 'Customer communication', version: '1.0.0' },
      { key: 'email', name: 'Email Notifications', description: 'Order and customer email notifications', version: '1.0.0' },
      { key: 'sms', name: 'SMS Notifications', description: 'Order status SMS notifications', version: '1.0.0' },
    ],
  },
  {
    category: 'SEO & Store Tools',
    plugins: [
      { key: 'seo-tools', name: 'SEO Tools', description: 'Search engine optimization settings', version: '1.0.0' },
      { key: 'sitemap', name: 'XML Sitemap', description: 'Search engine sitemap', version: '1.0.0' },
      { key: 'product-reviews', name: 'Product Reviews', description: 'Customer product reviews', version: '1.0.0' },
    ],
  },
] as const;

export type RegisteredPluginKey =
  (typeof PLUGIN_REGISTRY)[number]['plugins'][number]['key'];

export function isRegisteredPlugin(key: string): boolean {
  return PLUGIN_REGISTRY.some((group) =>
    group.plugins.some((plugin) => plugin.key === key)
  );
}
