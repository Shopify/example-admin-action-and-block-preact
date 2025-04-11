/// <reference types="../../../../shopify.d.ts" />

// [START conditional-action-extension.module]

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

// Use direct API calls to fetch data from Shopify.
// See https://shopify.dev/docs/api/admin-graphql for more information about Shopify's GraphQL API
async function getVariantsCount(id) {
  const getProductQuery = {
    query: `query Product($id: ID!) {
      product(id: $id) {
        variantsCount {
          count
        }
      }
    }`,
    variables: { id },
  };

  const res = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify(getProductQuery),
  });

  if (!res.ok) {
    console.error("Network error");
  }

  const productData = await res.json();
  return productData.data.product.variantsCount.count;
}
