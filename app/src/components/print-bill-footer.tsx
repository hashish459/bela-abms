type BankAccountForPrint = { bankName: string; accountName: string; accountNumber: string; branch: string | null } | null;

export function PrintBillFooter({
  terms,
  authorizedSignatory,
  footerNote,
  bankAccount,
  showBankDetails,
  qrUrl,
  showQrCode,
}: {
  terms: string | null;
  authorizedSignatory: string | null;
  footerNote: string | null;
  bankAccount: BankAccountForPrint;
  showBankDetails: boolean;
  qrUrl: string | null;
  showQrCode: boolean;
}) {
  const hasPaymentBlock = (showBankDetails && bankAccount) || (showQrCode && qrUrl);

  return (
    <div className="mt-4 border-t border-border pt-3">
      {terms && <p className="text-xs text-muted">{terms}</p>}

      {hasPaymentBlock && (
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          {showBankDetails && bankAccount && (
            <div className="text-xs text-muted">
              <div className="font-semibold text-foreground">Pay to</div>
              <div>{bankAccount.bankName}</div>
              <div>{bankAccount.accountName} — {bankAccount.accountNumber}</div>
              {bankAccount.branch && <div>{bankAccount.branch}</div>}
            </div>
          )}
          {showQrCode && qrUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- company-uploaded QR, arbitrary external/local path
            <img src={qrUrl} alt="Payment QR code" className="h-20 w-20 object-contain" />
          )}
        </div>
      )}

      {footerNote && <p className="mt-3 text-xs text-muted">{footerNote}</p>}

      <div className="mt-16 flex justify-between text-xs text-muted">
        <div>Prepared by</div>
        <div>{authorizedSignatory || "Authorized signature"}</div>
      </div>
    </div>
  );
}
