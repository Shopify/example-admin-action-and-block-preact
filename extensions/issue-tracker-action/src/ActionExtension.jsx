/// <reference types="../../../shopify.d.ts" />
// [START build-admin-action.create-ui-one]
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
// [END build-admin-action.create-ui-one]

// [START build-admin-action.create-ui-two]
export default function extension() {
  render(<Extension />, document.body);
}
// [END build-admin-action.create-ui-two]

function Extension() {
  const { close, data } = shopify;
  const [issue, setIssue] = useState({ title: "", description: "" });
  const [allIssues, setAllIssues] = useState([]);
  const [formErrors, setFormErrors] = useState(null);
  const { title, description } = issue;

  // [START build-admin-action.connect-api-one]
  useEffect(() => {
    getIssues(data.selected[0].id).then((issues) => setAllIssues(issues || []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // [END build-admin-action.connect-api-one]

  // [START build-admin-action.connect-api-two]
  const onSubmit = useCallback(async () => {
    const { isValid, errors } = validateForm(issue);
    setFormErrors(errors);

    if (isValid) {
      // Commit changes to the database
      await updateIssues(data.selected[0].id, [
        ...allIssues,
        {
          id: generateId(allIssues),
          completed: false,
          ...issue,
        },
      ]);
      // Close the modal using the 'close' API
      close();
    }
  }, [issue, data.selected, allIssues, close]);
  // [END build-admin-action.connect-api-two]

  // [START build-admin-action.create-ui-three]
  return (
    <s-admin-action title="Create an issue">
      <s-button slot="primaryAction" onClick={onSubmit}>
        Create
      </s-button>
      <s-button slot="secondaryActions" onClick={close}>
        Cancel
      </s-button>
      <s-text-field
        value={title}
        error={formErrors?.title ? "Please enter a title" : undefined}
        onChange={(event) =>
          setIssue((prev) => ({ ...prev, title: event.target.value }))
        }
        label="Title"
        maxLength={50}
      />
      <s-box padding-block-start="large">
        <s-text-area
          value={description}
          error={
            formErrors?.description ? "Please enter a description" : undefined
          }
          onChange={(event) =>
            setIssue((prev) => ({ ...prev, description: event.target.value }))
          }
          label="Description"
          max-length={300}
        />
      </s-box>
    </s-admin-action>
  );
  // [END build-admin-action.create-ui-three]
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
  const res = await makeGraphQLQuery(
    `query Product($id: ID!) {
      product(id: $id) {
        metafield(namespace: "$app:issues", key:"issues") {
          value
        }
      }
    }
  `,
    { id: productId },
  );

  if (res?.data?.product?.metafield?.value) {
    return JSON.parse(res.data.product.metafield.value);
  }
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

function generateId(allIssues) {
  return !allIssues?.length ? 0 : allIssues[allIssues.length - 1].id + 1;
}

function validateForm({ title, description }) {
  return {
    isValid: Boolean(title) && Boolean(description),
    errors: {
      title: !title,
      description: !description,
    },
  };
}
