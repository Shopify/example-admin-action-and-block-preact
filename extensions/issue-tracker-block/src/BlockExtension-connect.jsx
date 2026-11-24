import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";

import { updateIssues, getIssues, useProductId } from "./utils";

export default async () => {
  render(<Extension />, document.body);
}
const PAGE_SIZE = 3;

function Extension() {
  // [START connect-block-action.nav-api]
  const { navigation, i18n } = shopify;
  // [END connect-block-action.nav-api]

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState([]);
  // The issues as they were last saved, to restore when the merchant discards changes
  const [savedIssues, setSavedIssues] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  // The product being viewed, updated if the merchant moves to another product
  const productId = useProductId();
  const issuesCount = issues.length;
  const totalPages = issuesCount / PAGE_SIZE;

  useEffect(() => {
    // Ignore the response if the merchant moves to another product before it arrives
    let stale = false;

    // Start from an empty block, so the previous product's issues never show
    setLoading(true);
    setIssues([]);
    setSavedIssues([]);
    setCurrentPage(1);

    (async function getProductInfo() {
      // Load the issues stored in the product's metafield.
      // getIssues returns the parsed array, or undefined if there are no issues yet
      const productIssues = await getIssues(productId);
      if (stale) return;

      setLoading(false);
      if (Array.isArray(productIssues)) {
        setIssues(productIssues);
        setSavedIssues(productIssues);
      }
    })();

    return () => {
      stale = true;
    };
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
    // Create a new array of saved issues, leaving out the one that you're deleting
    const newSavedIssues = savedIssues.filter((issue) => issue.id !== id);
    // Remove the issue from the local state, keeping any unsaved status changes
    setIssues((currentIssues) =>
      currentIssues.filter((issue) => issue.id !== id),
    );
    // Commit the deletion to the database, then remember it as saved
    await updateIssues(productId, newSavedIssues);
    setSavedIssues(newSavedIssues);
  };

  const onSubmit = (event) => {
    // Commit changes to the database, then remember them as the saved issues
    event.waitUntil(
      updateIssues(productId, issues).then(() => setSavedIssues(issues)),
    );
  };

  const onReset = () => {
    // The merchant discarded their changes, so restore the last saved issues
    setIssues(savedIssues);
  };

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
                            name={`status-${id}`}
                            value={completed ? "completed" : "todo"}
                            onChange={(event) =>
                              handleChange(id, (/** @type {HTMLInputElement} */ (event.target)).value)
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
