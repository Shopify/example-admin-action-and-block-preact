import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";

import { updateIssues, getIssues } from "./utils";

export default function extension() {
  render(<Extension />, document.body);
}
const PAGE_SIZE = 3;

function Extension() {
  // [START connect-block-action.nav-api]
  const { data, navigation, i18n } = shopify;
  // [END connect-block-action.nav-api]

  const [loading, setLoading] = useState(true);
  const [_, setInitialValues] = useState([]);
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

  if (loading) {
    return (
      <s-stack direction="inline">
        <s-spinner />
      </s-stack>
    );
  }

  return (
    <s-admin-block heading={i18n.translate("name")}>
      <s-form id={`issues-form`} onSubmit={onSubmit} onReset={onReset}>
        {issues.length ? (
          <>
            <s-table
              paginate
              hasNextPage={totalPages > currentPage}
              hasPreviousPage={currentPage > 1}
              onNextPage={() => setCurrentPage(currentPage + 1)}
              onPreviousPage={() => setCurrentPage(currentPage - 1)}
            >
              <s-table-header-row>
                <s-table-header listSlot="primary">
                  {i18n.translate("issue-column-heading")}
                </s-table-header>
                <s-table-header>
                  {i18n.translate("status-column-heading")}
                </s-table-header>
                <s-table-header></s-table-header>
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
                            label={i18n.translate("status-column-heading")}
                            defaultValue={completed ? "completed" : "todo"}
                            onChange={(event) =>
                              handleChange(id, event.target.value)
                            }
                          >
                            <s-option value="todo">
                              {i18n.translate("option-todo")}
                            </s-option>
                            <s-option value="completed">
                              {i18n.translate("option-completed")}
                            </s-option>
                          </s-select>
                        </s-table-cell>

                        {/* [START connect-block-action.edit-button] */}
                        <s-table-cell>
                          <s-button
                            variant="tertiary"
                            icon="edit"
                            accessibilityLabel={i18n.translate(
                              "edit-issue-button",
                            )}
                            onClick={() => {
                              const url = `extension:issue-tracker-action?issueId=${id}`;
                              navigation?.navigate(url);
                            }}
                          />
                        </s-table-cell>
                        {/* [END connect-block-action.edit-button] */}

                        <s-table-cell>
                          <s-button
                            icon="delete"
                            accessibilityLabel={i18n.translate(
                              "delete-issue-button",
                            )}
                            onClick={() => handleDelete(id)}
                          />
                        </s-table-cell>
                      </s-table-row>
                    );
                  },
                )}
              </s-table-body>
            </s-table>

            {/* [START connect-block-action.create-issue] */}
            <s-button
              onClick={() => {
                const url = `extension:issue-tracker-action`;
                navigation?.navigate(url);
              }}
            >
              {i18n.translate("add-issue-button")}
            </s-button>
            {/* [END connect-block-action.create-issue] */}
          </>
        ) : (
          <>
            {/* [START connect-block-action.no-issues] */}
            <s-button
              onClick={() => {
                const url = `extension:issue-tracker-action`;
                navigation?.navigate(url);
              }}
            >
              {i18n.translate("add-issue-button")}
            </s-button>
            {/* [END connect-block-action.no-issues] */}
          </>
        )}
      </s-form>
    </s-admin-block>
  );
}
