/// <reference types="../../../shopify.d.ts" />

// [START build-admin-block.create-ui-one]
import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
// [END build-admin-block.create-ui-one]

// [START build-admin-block.connect-api-one]
import { updateIssues, getIssues } from "./utils";
// [END build-admin-block.connect-api-one]

// [START build-admin-block.create-ui-two]
export default function extension() {
  render(<Extension />, document.body);
}
// [END build-admin-block.create-ui-two]
const PAGE_SIZE = 3;

function Extension() {
  const { data } = shopify;

  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState([]);
  const [issues, setIssues] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  // [START build-admin-block.get-initial-data]
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
  // [END build-admin-block.get-initial-data]

  // [START build-admin-block.add-change-and-delete-handlers]
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
  // [END build-admin-block.add-change-and-delete-handlers]

  const onSubmit = (event) => {
    // Commit changes to the database
    event.waitUntil(updateIssues(productId, issues));
  };

  const onReset = () => {};

  // [START build-admin-block.create-ui-three]
  if (loading) {
    return (
      <s-stack direction="inline">
        <s-spinner />
      </s-stack>
    );
  }

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
  // [END build-admin-block.create-ui-three]
}
