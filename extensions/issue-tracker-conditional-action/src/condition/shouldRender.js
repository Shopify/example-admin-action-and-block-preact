/// <reference types="../../../../shopify.d.ts" />

// [START conditional-action-extension.module]
import { getVariantsCount } from "../utils";

// [START conditional-action-extension.register]
export default async function extension() {
  // [END conditional-action-extension.register]

  // [START conditional-action-extension.display]
  const { data } = shopify;
  const variantCount = await getVariantsCount(data.selected[0].id);
  return { display: variantCount > 1 };
  // [END conditional-action-extension.display]
}
// [END conditional-action-extension.module]
