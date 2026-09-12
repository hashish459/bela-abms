import { ClassicTemplate } from "./Classic";
import { ModernTemplate } from "./Modern";
import { CompactTemplate } from "./Compact";
import { ThermalTemplate } from "./Thermal";
import { DualCopyTemplate } from "./DualCopy";
import { IndustrialTemplate } from "./Industrial";
import { BlueprintTemplate } from "./Blueprint";
import { ConcreteTemplate } from "./Concrete";
import type { InvoiceTemplateData } from "./types";

export * from "./types";

export function InvoiceTemplateRenderer({ template, data }: { template: string; data: InvoiceTemplateData }) {
  switch (template) {
    case "MODERN":
      return <ModernTemplate data={data} />;
    case "COMPACT":
      return <CompactTemplate data={data} />;
    case "THERMAL":
      return <ThermalTemplate data={data} />;
    case "DUAL_COPY":
      return <DualCopyTemplate data={data} />;
    case "INDUSTRIAL":
      return <IndustrialTemplate data={data} />;
    case "BLUEPRINT":
      return <BlueprintTemplate data={data} />;
    case "CONCRETE":
      return <ConcreteTemplate data={data} />;
    case "CLASSIC":
    default:
      return <ClassicTemplate data={data} />;
  }
}
