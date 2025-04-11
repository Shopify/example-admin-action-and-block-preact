/// <reference types="../../../shopify.d.ts" />
import { useEffect, useState } from "preact/hooks";

// [START build-admin-print-action.create-ui-one]
import { render } from "preact";
// [END build-admin-print-action.create-ui-one]

const baseSrc = `https://cdn.shopify.com/static/extensibility/print-example`;

// [START build-admin-print-action.create-ui-two]
export default function extension() {
  render(<Extension />, document.body);
}
// [END build-admin-print-action.create-ui-two]

function Extension() {
  const { i18n, data } = shopify;
  // [START build-admin-print-action.set-src]
  const [src, setSrc] = useState(null);

  const [printInvoice, setPrintInvoice] = useState(true);
  const [printPackingSlip, setPrintPackingSlip] = useState(false);

  useEffect(() => {
    const printTypes = [];
    if (printInvoice) {
      printTypes.push("Invoice");
    }
    if (printPackingSlip) {
      printTypes.push("Packing Slip");
    }

    if (printTypes.length) {
      const params = new URLSearchParams({
        printType: printTypes.join(","),
        orderId: data.selected[0].id,
      });

      const fullSrc = `/print?${params.toString()}`;
      setSrc(fullSrc);
    } else {
      setSrc(null);
    }
  }, [data.selected, printInvoice, printPackingSlip]);
  // [END build-admin-print-action.set-src]

  // [START build-admin-print-action.create-ui-three]
  return (
    /*
      The s-admin-print-action component provides an API for setting the src of the Print Action extension wrapper.
      The document you set as src will be displayed as a print preview.
      When the user clicks the Print button, the browser will print that document.
      HTML, PDFs and images are supported.

      The `src` prop can be a...
        - Full URL: https://cdn.shopify.com/static/extensibility/print-example/document1.html
        - Relative path in your app: print-example/document1.html or /print-example/document1.html
        - Custom app: protocol: app:print (https://shopify.dev/docs/api/admin-extensions#custom-protocols)
    */
    <s-admin-print-action src={src}>
      <s-stack direction="block">
        <s-text type="strong">{i18n.translate("documents")}</s-text>
        <s-checkbox
          name="Invoice"
          checked={printInvoice}
          onChange={(value) => {
            setPrintInvoice(value);
          }}
          label={i18n.translate("invoice")}
        ></s-checkbox>
        <s-checkbox
          name="Packing Slips"
          checked={printPackingSlip}
          onChange={(value) => {
            setPrintPackingSlip(value);
          }}
          label={i18n.translate("packingSlip")}
        ></s-checkbox>
      </s-stack>
    </s-admin-print-action>
  );
  // [END build-admin-print-action.create-ui-three]
}
