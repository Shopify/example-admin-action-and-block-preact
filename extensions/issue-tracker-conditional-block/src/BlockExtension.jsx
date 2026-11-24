import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";

import {
  getIssues,
  updateIssues,
  useProductId,
} from "../../issue-tracker-block/src/utils";
import { getVariantsCount } from "../../issue-tracker-conditional-action/src/utils";

const PAGE_SIZE = 3;

export default async () => {
  {
    render(<Extension />, document.body);
  }

  function Extension() {
    const { i18n, navigation } = shopify;
    const [issues, setIssues] = useState([]);
    // The issues as they were last saved, to restore when the merchant discards changes
    const [savedIssues, setSavedIssues] = useState([]);

    // The product being viewed, updated if the merchant moves to another product
    const productId = useProductId();
    const issuesCount = issues.length;
    const totalPages = issuesCount / PAGE_SIZE;

    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // [START conditional-block-extension.has-variants]
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
      // Ignore the responses if the merchant moves to another product before they arrive
      let stale = false;

      // Start from an empty, collapsed block, so the previous product's issues never show
      setLoading(true);
      setShouldRender(false);
      setIssues([]);
      setSavedIssues([]);
      setCurrentPage(1);

      (async function getProductInfo() {
        try {
          // Fetch the variants count and the issues at the same time.
          // getIssues returns the parsed array, or undefined if there are no issues yet
          const [variantsCount, productIssues] = await Promise.all([
            getVariantsCount(productId),
            getIssues(productId),
          ]);
          if (stale) return;

          // Only show the block's content if the product has more than one variant
          setShouldRender(variantsCount > 1);
          // [END conditional-block-extension.has-variants]

          if (Array.isArray(productIssues)) {
            setIssues(productIssues);
            setSavedIssues(productIssues);
          }
        } catch (error) {
          console.error(error);
        } finally {
          // Always leave the loading state, even if a request failed
          if (!stale) setLoading(false);
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

    const blockMarkup = loading ? (
      <s-spinner></s-spinner>
    ) : (
      <>
        <s-form id={`issues-form`} onSubmit={onSubmit} onReset={onReset}>
          {paginatedIssues.length > 0 ? (
            <s-table
              paginate
              onNextPage={() => setCurrentPage(currentPage + 1)}
              onPreviousPage={() => setCurrentPage(currentPage - 1)}
              hasNextPage={currentPage < totalPages}
              hasPreviousPage={currentPage > 1}
            >
              <s-table-header-row>
                <s-table-header listSlot="primary">
                  {i18n.translate("issue-column-heading")}
                </s-table-header>
                <s-table-header>
                  {i18n.translate("status-column-heading")}
                </s-table-header>
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
                            label={i18n.translate("select-label")}
                            name={`status-${id}`}
                            value={completed ? "completed" : "todo"}
                            onChange={(e) => handleChange(id, (/** @type {HTMLInputElement} */ (e.target)).value)}
                          >
                            <s-option value="todo">
                              {i18n.translate("option-todo")}
                            </s-option>
                            <s-option value="completed">
                              {i18n.translate("option-completed")}
                            </s-option>
                          </s-select>
                        </s-table-cell>
                        <s-table-cell>
                          <s-button
                            variant="tertiary"
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
              <s-button
                onClick={() => {
                  const url = `extension:issue-tracker-action`;
                  navigation?.navigate(url);
                }}
              >
                {i18n.translate("add-issue-button")}
              </s-button>
            </s-table>
          ) : (
            <s-text>{i18n.translate("no-issues-text")}</s-text>
          )}
          <s-box>
            <s-button
              onClick={() => {
                const url = `extension:issue-tracker-action`;
                navigation?.navigate(url);
              }}
            >
              {i18n.translate("add-issue-button")}
            </s-button>
          </s-box>
        </s-form>
      </>
    );

    // [START conditional-block-extension.conditional-markup]
    // Only render the block body if there is more than one variant, otherwise, return null to collapse the block
    return (
      <s-admin-block
        heading={i18n.translate("name")}
        collapsedSummary={
          !shouldRender ? i18n.translate("collapsed-summary") : null
        }
      >
        {shouldRender ? blockMarkup : null}
      </s-admin-block>
    );
    // [END conditional-block-extension.conditional-markup]
  }
};
