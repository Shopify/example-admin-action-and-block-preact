import "@shopify/ui-extensions";

//@ts-ignore
declare module "./src/ActionExtension.jsx" {
  const shopify: import("@shopify/ui-extensions/admin.product-details.action.render").Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module "./src/ActionExtension-connect.jsx" {
  const shopify: import("@shopify/ui-extensions/admin.product-details.action.render").Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module "./src/ActionExtension-backend.jsx" {
  const shopify: import("@shopify/ui-extensions/admin.product-details.action.render").Api;
  const globalThis: { shopify: typeof shopify };
}
