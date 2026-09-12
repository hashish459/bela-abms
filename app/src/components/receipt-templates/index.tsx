import { ClassicReceiptTemplate } from "./Classic";
import { ModernReceiptTemplate } from "./Modern";
import { ThermalReceiptTemplate } from "./Thermal";
import { CompactReceiptTemplate } from "./Compact";
import type { ReceiptTemplateData } from "./types";

export * from "./types";

export function ReceiptTemplateRenderer({ template, data }: { template: string; data: ReceiptTemplateData }) {
  switch (template) {
    case "MODERN":
      return <ModernReceiptTemplate data={data} />;
    case "THERMAL":
      return <ThermalReceiptTemplate data={data} />;
    case "COMPACT":
      return <CompactReceiptTemplate data={data} />;
    case "CLASSIC":
    default:
      return <ClassicReceiptTemplate data={data} />;
  }
}
