/// <reference types="../../../shopify.d.ts" />
import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";

import { getIssues, updateIssues } from "../../issue-tracker-block/src/utils";

export default function extension() {
  render(<Extension />, document.body);
}

const PAGE_SIZE = 3;

function Extension() {
  const { i18n, data, navigation } = shopify;
  const [issues, setIssues] = useState([]);

  const productId = data.selected[0].id;
  const issuesCount = issues.length;
  const totalPages = issuesCount / PAGE_SIZE;

  const [loading, setLoading] = useState(true);
  const [initialValues, setInitialValues] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    (async function getProductInfo() {
      const productData = await getIssues(productId);

      setLoading(false);

      if (productData?.data?.product?.variants?.edges.length > 1) {
        setShouldRender(true);
      }
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
  console.log({ paginatedIssues });

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

  const onSubmit = async () => {
    // Commit changes to the database
    await updateIssues(productId, issues);
  };

  const onReset = () => {};

  const blockMarkup = loading ? (
    <s-spinner></s-spinner>
  ) : (
    <>
      <s-text>Issues</s-text>
      <s-form id={`issues-form`} onSubmit={onSubmit} onReset={onReset}>
        {issues.length > 0 ? (
          <s-table
            paginate
            onNextPage={() => setCurrentPage(currentPage + 1)}
            onPreviousPage={() => setCurrentPage(currentPage - 1)}
            hasNextPage={currentPage < totalPages}
            hasPreviousPage={currentPage > 1}
          >
            <s-table-header-row>
              <s-table-header listSlot="primary">Issue</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header></s-table-header>
            </s-table-header-row>
            <s-table-body>
              {paginatedIssues.map(
                ({ id, title, description, completed }, index) => {
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
                          value={completed ? "completed" : "todo"}
                          onChange={(e) => handleChange(id, e.target.value)}
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
                },
              )}
            </s-table-body>
            <s-button
              onClick={() => {
                const url = `extension:issue-tracker-action`;
                navigation?.navigate(url);
              }}
            >
              Add issue
            </s-button>
          </s-table>
        ) : (
          <s-text>No issues for this product</s-text>
        )}
        <s-box>
          <s-button
            onClick={() => {
              const url = `extension:issue-tracker-action`;
              navigation?.navigate(url);
            }}
          >
            Add issue
          </s-button>
        </s-box>
      </s-form>
    </>
  );

  return (
    <s-admin-block
      title={i18n.translate("name")}
      collapsedSummary={!shouldRender ? "Not enough product variants" : null}
    >
      {shouldRender ? blockMarkup : null}
    </s-admin-block>
  );
}
