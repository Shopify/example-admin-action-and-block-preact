import '@shopify/ui-extension';

//@ts-ignore
declare module './src/PrintActionExtension.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.order-details.print-action.render').Api;
  const globalThis: { shopify: typeof shopify };
}
