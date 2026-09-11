import { BrandLogo } from "@/components/brand-logo";

type CompanyInfoForLetterhead = {
  legalName: string;
  displayName?: string | null;
  registeredAddress: string;
  registeredAddress2?: string | null;
  phone: string;
  phone2?: string | null;
  email: string;
  panNumber: string;
};

export function PrintLetterhead({
  company,
  documentTitle,
  documentNumber,
  documentDate,
  meta,
}: {
  company: CompanyInfoForLetterhead | null;
  documentTitle: string;
  documentNumber: string;
  documentDate: string;
  /** Extra label/value pairs shown on the right, e.g. due date, fiscal year. */
  meta?: { label: string; value: string }[];
}) {
  return (
    <div className="mb-6 border-b-2 border-foreground pb-4">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          <BrandLogo size={56} />
          <div>
            <div className="text-lg font-bold leading-tight">
              {company?.displayName || company?.legalName || "Bela Nepal Industries"}
            </div>
            {company && (
              <div className="mt-0.5 text-xs leading-snug text-muted">
                <div>
                  {company.registeredAddress}
                  {company.registeredAddress2 ? `, ${company.registeredAddress2}` : ""}
                </div>
                <div>
                  Tel: {company.phone}
                  {company.phone2 ? ` / ${company.phone2}` : ""} · {company.email}
                </div>
                <div>PAN: {company.panNumber}</div>
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-base font-bold uppercase tracking-wide">{documentTitle}</div>
          <div className="mt-0.5 text-xs text-muted">
            <div>
              No: <span className="font-medium text-foreground">{documentNumber}</span>
            </div>
            <div>
              Date: <span className="font-medium text-foreground">{documentDate}</span>
            </div>
            {meta?.map((m) => (
              <div key={m.label}>
                {m.label}: <span className="font-medium text-foreground">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
