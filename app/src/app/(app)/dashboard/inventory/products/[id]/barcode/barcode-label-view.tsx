"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api, Button, Card, PageHeader, toast } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { BarcodeSvg } from "@/components/barcode-svg";

type Product = { id: string; name: string; sellingPrice: string; barcodeValue: string | null };
type Setting = { symbology: string; labelWidthMm: number; labelHeightMm: number; showPrice: boolean; showName: boolean };

export function BarcodeLabelView({ product, setting }: { product: Product; setting: Setting }) {
  const router = useRouter();
  const [value, setValue] = useState(product.barcodeValue);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    const res = await api<{ barcodeValue: string }>(`/api/inventory/products/${product.id}/barcode`, { method: "POST" });
    setGenerating(false);
    if (!res.ok) return toast(res.error.message, "err");
    setValue(res.data.barcodeValue);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Inventory", "Products", product.name, "Barcode"]}
        title={`Barcode — ${product.name}`}
        action={
          <div className="flex gap-2" data-app-chrome>
            <Link href="/dashboard/inventory/products">
              <Button variant="outline"><ArrowLeft size={14} /> Back</Button>
            </Link>
            {value && <PrintButton />}
          </div>
        }
      />

      {!value ? (
        <Card className="max-w-md p-6 text-center">
          <p className="mb-4 text-sm text-muted">
            This product has no barcode value yet. Generate one from the Settings › Barcode
            prefix and counter.
          </p>
          <Button loading={generating} onClick={generate}>Generate barcode</Button>
        </Card>
      ) : (
        <>
          {setting.symbology === "EAN13" && (
            <p className="mx-auto mb-3 max-w-md text-center text-xs text-danger" data-app-chrome>
              Settings › Barcode is set to EAN13, but only Code128 rendering is implemented —
              the label below is Code128. Switch the setting to CODE128 to match, or treat
              this as a known gap.
            </p>
          )}
          <Card
            className="mx-auto flex flex-col items-center justify-center gap-1 p-4 print:shadow-none"
            style={{ width: `${setting.labelWidthMm}mm`, minHeight: `${setting.labelHeightMm}mm` }}
          >
            {setting.showName && <div className="w-full truncate text-center text-xs font-medium">{product.name}</div>}
            <BarcodeSvg value={value} height={40} />
            {setting.showPrice && <div className="text-xs font-semibold">Rs. {product.sellingPrice}</div>}
          </Card>
        </>
      )}
    </>
  );
}
