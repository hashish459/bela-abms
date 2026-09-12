import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getProduct } from "@/server/inventory/service";
import { getBarcodeSetting } from "@/server/settings/service";
import { BarcodeLabelView } from "./barcode-label-view";

export const metadata = { title: "Barcode Label — Bela ABMS" };

export default async function BarcodeLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = (await getSession())!;
  if (!can(s.permissions, "inventory.product_item", "read")) redirect("/dashboard");

  const { id } = await params;
  const [product, setting] = await Promise.all([
    getProduct(s.companyId!, id).catch(() => null),
    getBarcodeSetting(s.companyId!),
  ]);
  if (!product) notFound();

  return (
    <BarcodeLabelView
      product={{
        id: product.id,
        name: product.name,
        sellingPrice: product.sellingPrice.toFixed(2),
        barcodeValue: product.barcodeValue,
      }}
      setting={{
        symbology: setting.symbology,
        labelWidthMm: setting.labelWidthMm,
        labelHeightMm: setting.labelHeightMm,
        showPrice: setting.showPrice,
        showName: setting.showName,
      }}
    />
  );
}
