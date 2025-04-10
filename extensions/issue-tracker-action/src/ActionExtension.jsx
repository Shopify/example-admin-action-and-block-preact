/// <reference types="../../../shopify.d.ts" />
// [START build-admin-action.create-ui-one]
import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { getIssues, updateIssues } from "./utils";
// [END build-admin-action.create-ui-one]

// [START build-admin-action.create-ui-two]
export default function extension() {
  render(<Extension />, document.body);
}
// [END build-admin-action.create-ui-two]

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
