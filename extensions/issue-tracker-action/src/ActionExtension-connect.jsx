/// <reference types="../../../shopify.d.ts" />

import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { getIssues, updateIssues } from "./utils";

export default function extension() {
  render(<Extension />, document.body);
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

function Extension() {
  // [START connect-action-block.intent-one]
  const { close, data, intents } = shopify;
  const issueId = intents?.launchUrl
    ? new URL(intents?.launchUrl)?.searchParams?.get("issueId")
    : null;
  const [loading, setLoading] = useState(issueId ? true : false);
  // [END connect-action-block.intent-one]

  const [issue, setIssue] = useState({
    title: "",
    description: "",
    id: issueId,
  });

  const [initialValues, setInitialValues] = useState([]);
  const [issues, setIssues] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [allIssues, setAllIssues] = useState([]);

  const [formErrors, setFormErrors] = useState(null);
  const { title, description, id } = issue;
  const isEditing = Boolean(id);

  useEffect(() => {
    getIssues(data.selected[0].id).then((issues) => {
      setLoading(false);
      setAllIssues(issues || []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = useCallback(async () => {
    const { isValid, errors } = validateForm(issue);
    setFormErrors(errors);

    if (isValid) {
      const newIssues = [...allIssues];

      // [START connect-action-block.intent-two]
      if (isEditing) {
        // Find the index of the issue that you're editing
        const editingIssueIndex = newIssues.findIndex(
          (listIssue) => listIssue.id == issue.id,
        );
        // Overwrite that issue's title and description with the new ones
        newIssues[editingIssueIndex] = {
          ...issue,
          title,
          description,
        };
      } else {
        // Add a new issue at the end of the list
        newIssues.push({
          id: generateId(allIssues),
          title,
          description,
          completed: false,
        });
      }

      // Commit changes to the database
      await updateIssues(data.selected[0].id, newIssues);
      // Close the modal using the 'close' API
      close();
      // [END connect-action-block.intent-two]
    }
  }, [issue, data.selected, allIssues, close, isEditing, title, description]);

  useEffect(() => {
    if (issueId) {
      // If opened from the block extension, you find the issue that's being edited
      const editingIssue = allIssues.find(({ id }) => `${id}` === issueId);
      if (editingIssue) {
        // Set the issue's ID in the state
        setIssue(editingIssue);
      }
    }
  }, [issueId, allIssues]);

  if (loading) {
    return <></>;
  }

  return (
    <s-admin-action title={isEditing ? "Edit your issue" : "Create an issue"}>
      <s-button slot="primaryAction" onClick={onSubmit}>
        {isEditing ? "Save" : "Create"}
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
}
