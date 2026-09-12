"use client";

import { useState } from "react";
import { api, Button, Card, Field, Input, PageHeader, Toggle, inputClass, toast } from "@/components/ui";

type Setting = {
  symbology: string; prefix: string; nextNumber: number;
  labelWidthMm: number; labelHeightMm: number; showPrice: boolean; showName: boolean;
};

export function BarcodeSettingForm({ initial, canUpdate }: { initial: Setting; canUpdate: boolean }) {
  const [symbology, setSymbology] = useState(initial.symbology);
  const [prefix, setPrefix] = useState(initial.prefix);
  const [nextNumber, setNextNumber] = useState(String(initial.nextNumber));
  const [labelWidthMm, setLabelWidthMm] = useState(String(initial.labelWidthMm));
  const [labelHeightMm, setLabelHeightMm] = useState(String(initial.labelHeightMm));
  const [showPrice, setShowPrice] = useState(initial.showPrice);
  const [showName, setShowName] = useState(initial.showName);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api("/api/settings/barcode", {
      method: "PUT",
      body: JSON.stringify({
        symbology, prefix, nextNumber: Number(nextNumber),
        labelWidthMm: Number(labelWidthMm), labelHeightMm: Number(labelHeightMm),
        showPrice, showName,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Barcode setting saved");
  }

  return (
    <>
      <PageHeader crumbs={["Settings", "Barcode"]} title="Barcode" />
      <p className="mb-3 text-sm text-muted">
        Symbology and label layout for printed product barcodes. Generate and print a
        product&apos;s label from its detail page under Inventory › Products.
      </p>

      <Card className="max-w-2xl space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Symbology">
            <select value={symbology} onChange={(e) => setSymbology(e.target.value)} disabled={!canUpdate} className={inputClass}>
              <option value="CODE128">CODE128</option>
              <option value="EAN13">EAN13</option>
            </select>
          </Field>
          <Field label="Prefix">
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} disabled={!canUpdate} placeholder="BELA" />
          </Field>
          <Field label="Next number">
            <Input type="number" min="1" value={nextNumber} onChange={(e) => setNextNumber(e.target.value)} disabled={!canUpdate} />
          </Field>
          <Field label="Label width (mm)">
            <Input type="number" min="10" value={labelWidthMm} onChange={(e) => setLabelWidthMm(e.target.value)} disabled={!canUpdate} />
          </Field>
          <Field label="Label height (mm)">
            <Input type="number" min="10" value={labelHeightMm} onChange={(e) => setLabelHeightMm(e.target.value)} disabled={!canUpdate} />
          </Field>
        </div>
        <div className="space-y-3">
          <Toggle checked={showPrice} onChange={setShowPrice} label="Show price on label" />
          <Toggle checked={showName} onChange={setShowName} label="Show product name on label" />
        </div>
        {canUpdate && (
          <div className="flex justify-end pt-2">
            <Button loading={saving} onClick={save}>Save</Button>
          </div>
        )}
      </Card>
    </>
  );
}
