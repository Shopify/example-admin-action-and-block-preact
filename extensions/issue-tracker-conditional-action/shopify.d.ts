import '@shopify/ui-extension';

//@ts-ignore
declare module './src/ActionExtension.jsx' {
  const shopify: import('@shopify/ui-extensions/admin.product-details.action.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/condition/shouldRender.js' {
  const shopify: import('@shopify/ui-extensions/admin.product-details.action.should-render').Api;
  const globalThis: { shopify: typeof shopify };
}
