import { ClassicReceiptTemplate } from "./Classic";
import type { ReceiptTemplateData } from "./types";

export * from "./types";

export function ReceiptTemplateRenderer({ template, data }: { template: string; data: ReceiptTemplateData }) {
  switch (template) {
    case "CLASSIC":
    default:
      return <ClassicReceiptTemplate data={data} />;
  }
}
