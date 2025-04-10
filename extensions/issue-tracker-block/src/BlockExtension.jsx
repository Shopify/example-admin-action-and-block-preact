/// <reference types="../../../shopify.d.ts" />

import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";

export default function extension() {
  render(<Extension />, document.body);
}

const PAGE_SIZE = 3;

function Extension() {
  const { data } = shopify;

  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState([]);
  const [issues, setIssues] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const productId = data.selected[0].id;
  const issuesCount = issues.length;
  const totalPages = issuesCount / PAGE_SIZE;

  useEffect(() => {
    (async function getProductInfo() {
      // Load the product's metafield of type issues
      const productData = await getIssues(productId);

      setLoading(false);
      if (productData?.data?.product?.metafield?.value) {
        const parsedIssues = JSON.parse(
          productData.data.product.metafield.value,
        );
        setInitialValues(
          parsedIssues.map(({ completed }) => Boolean(completed)),
        );
        setIssues(parsedIssues);
      }
    })();
  }, [productId]);

  const paginatedIssues = useMemo(() => {
    if (issuesCount <= PAGE_SIZE) {
      // It's not necessary to paginate if there are fewer issues than the page size
      return issues;
    }

    // Slice the array after the last item of the previous page
    return [...issues].slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    );
  }, [issuesCount, issues, currentPage]);

  const handleChange = async (id, value) => {
    // Update the local state of the extension to reflect changes
    setIssues((currentIssues) => {
      // Create a copy of the array so that you don't mistakenly mutate the state
      const newIssues = [...currentIssues];
      // Find the index of the issue that you're interested in
      const editingIssueIndex = newIssues.findIndex(
        (listIssue) => listIssue.id == id,
      );
      // Overwrite that item with the new value
      newIssues[editingIssueIndex] = {
        // Spread the previous item to retain the values that you're not changing
        ...newIssues[editingIssueIndex],
        // Update the completed value
        completed: value === "completed" ? true : false,
      };
      return newIssues;
    });
  };

  const handleDelete = async (id) => {
    // Create a new array of issues, leaving out the one that you're deleting
    const newIssues = issues.filter((issue) => issue.id !== id);
    // Save to the local state
    setIssues(newIssues);
    // Commit changes to the database
    await updateIssues(productId, newIssues);
  };

  const onSubmit = (event) => {
    // Commit changes to the database
    event.waitUntil(updateIssues(productId, issues));
  };

  const onReset = () => {};

  return (
    <s-admin-block title="My Block Extension">
      <s-form id={`issues-form`} onSubmit={onSubmit} onReset={onReset}>
        <s-table paginate>
          <s-table-header-row>
            <s-table-header listSlot="primary">Issue</s-table-header>
            <s-table-header>Status</s-table-header>
            <s-table-header></s-table-header>
          </s-table-header-row>
          <s-table-body>
            {issues.map(({ id, title, description, completed }, index) => {
              return (
                <s-table-row key={id}>
                  <s-table-cell>
                    <s-stack direction="block">
                      <s-text>{title}</s-text>
                      <s-text>{description}</s-text>
                    </s-stack>
                  </s-table-cell>
                  <s-table-cell>
                    <s-select
                      labelAccessibilityVisibility="exclusive"
                      label="Status"
                    >
                      <s-option value="todo">Todo</s-option>
                      <s-option value="completed">Completed</s-option>
                    </s-select>
                  </s-table-cell>
                  <s-table-cell>
                    <s-button
                      variant="tertiary"
                      icon="delete"
                      accessibilityLabel="Delete issue"
                      onClick={() => handleDelete(id)}
                    />
                  </s-table-cell>
                </s-table-row>
              );
            })}
          </s-table-body>
        </s-table>
      </s-form>
    </s-admin-block>
  );
}

export async function updateIssues(id, newIssues) {
  // This example uses metafields to store the data. For more information, refer to https://shopify.dev/docs/apps/custom-data/metafields.
  return await makeGraphQLQuery(
    `mutation SetMetafield($namespace: String!, $ownerId: ID!, $key: String!, $type: String!, $value: String!) {
    metafieldDefinitionCreate(
      definition: {namespace: $namespace, key: $key, name: "Tracked Issues", ownerType: PRODUCT, type: $type, access: {admin: MERCHANT_READ_WRITE}}
    ) {
      createdDefinition {
        id
      }
    }
    metafieldsSet(metafields: [{ownerId:$ownerId, namespace:$namespace, key:$key, type:$type, value:$value}]) {
      userErrors {
        field
        message
        code
      }
    }
  }
  `,
    {
      ownerId: id,
      namespace: "$app:issues",
      key: "issues",
      type: "json",
      value: JSON.stringify(newIssues),
    },
  );
}

export async function getIssues(productId) {
  // This example uses metafields to store the data. For more information, refer to https://shopify.dev/docs/apps/custom-data/metafields.
  return await makeGraphQLQuery(
    `query Product($id: ID!) {
      product(id: $id) {
        metafield(namespace: "$app:issues", key:"issues") {
          value
        }
        variants(first: 2) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  `,
    { id: productId },
  );
}

async function makeGraphQLQuery(query, variables) {
  const graphQLQuery = {
    query,
    variables,
  };

  const res = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify(graphQLQuery),
  });

  if (!res.ok) {
    console.error("Network error");
  }

  return await res.json();
}
