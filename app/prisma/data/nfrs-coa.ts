// AUTO-GENERATED from the Bela / Nepal E-Billing reference NFRS chart of accounts
// (Docs/REFERENCE-API-MAP.md). 36 account heads, 106 groups, 181 ledgers.
// Regenerate: see Docs/PROGRESS.md. Do not edit by hand.

export type SeedAccountType = "AS" | "LI" | "EQ" | "IN" | "EX";
export type SeedCurrentType = "CU" | "NC" | "O";
export type SeedFinancialType = "FI" | "NF" | "O";

export const NFRS_ACCOUNT_HEADS: {
  code: string; name: string;
  accountType: SeedAccountType; currentType: SeedCurrentType; financialType: SeedFinancialType;
}[] = [
  {
    "code": "ADE",
    "name": "Administration Expenses",
    "accountType": "EX",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "CWIP",
    "name": "Capital Work In Progress",
    "accountType": "AS",
    "currentType": "CU",
    "financialType": "NF"
  },
  {
    "code": "CCE",
    "name": "Cash & Cash Equivalent",
    "accountType": "AS",
    "currentType": "CU",
    "financialType": "FI"
  },
  {
    "code": "COS",
    "name": "Cost Of Goods Sold",
    "accountType": "EX",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "DTA",
    "name": "Deferred Tax Assets",
    "accountType": "AS",
    "currentType": "NC",
    "financialType": "NF"
  },
  {
    "code": "DTE",
    "name": "Deferred Tax Expenses",
    "accountType": "EX",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "DTL",
    "name": "Deferred Tax liability",
    "accountType": "LI",
    "currentType": "NC",
    "financialType": "NF"
  },
  {
    "code": "DTOCI",
    "name": "Deferred Tax On Other Compressive Income",
    "accountType": "EX",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "FNI",
    "name": "Finance Income",
    "accountType": "IN",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "FNE",
    "name": "Financial Expenses",
    "accountType": "EX",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "ITE",
    "name": "Income Tax Expenses",
    "accountType": "EX",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "ITP",
    "name": "Income Tax Payable",
    "accountType": "LI",
    "currentType": "CU",
    "financialType": "NF"
  },
  {
    "code": "ITR",
    "name": "Income Tax Receivable",
    "accountType": "AS",
    "currentType": "NC",
    "financialType": "NF"
  },
  {
    "code": "IAS",
    "name": "Intangible Assets",
    "accountType": "AS",
    "currentType": "NC",
    "financialType": "NF"
  },
  {
    "code": "INV",
    "name": "Inventory",
    "accountType": "AS",
    "currentType": "CU",
    "financialType": "NF"
  },
  {
    "code": "LTB",
    "name": "Long Term Borrowing",
    "accountType": "LI",
    "currentType": "NC",
    "financialType": "FI"
  },
  {
    "code": "OCI",
    "name": "Other Comprehensive Income",
    "accountType": "IN",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "OFAC",
    "name": "Other Financial Assets",
    "accountType": "AS",
    "currentType": "CU",
    "financialType": "FI"
  },
  {
    "code": "OFA",
    "name": "Other Financial Assets",
    "accountType": "AS",
    "currentType": "NC",
    "financialType": "FI"
  },
  {
    "code": "OFL",
    "name": "Other Financial Liabilities",
    "accountType": "LI",
    "currentType": "CU",
    "financialType": "FI"
  },
  {
    "code": "OIC",
    "name": "Other Income",
    "accountType": "IN",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "ONFA-C",
    "name": "Other Non-Financial Assets",
    "accountType": "AS",
    "currentType": "CU",
    "financialType": "NF"
  },
  {
    "code": "ONFA",
    "name": "Other Non-Financial Assets",
    "accountType": "AS",
    "currentType": "NC",
    "financialType": "NF"
  },
  {
    "code": "ONFC-C",
    "name": "Other Non-Financial Liabilities",
    "accountType": "LI",
    "currentType": "CU",
    "financialType": "NF"
  },
  {
    "code": "ONFC",
    "name": "Other Non-Financial Liabilities",
    "accountType": "LI",
    "currentType": "NC",
    "financialType": "NF"
  },
  {
    "code": "PRE",
    "name": "Prepayments",
    "accountType": "AS",
    "currentType": "NC",
    "financialType": "FI"
  },
  {
    "code": "PPE",
    "name": "Property, Plant And Equipment",
    "accountType": "AS",
    "currentType": "NC",
    "financialType": "NF"
  },
  {
    "code": "R&S",
    "name": "Reverse And Surplus",
    "accountType": "EQ",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "RBO-C",
    "name": "Retirement Benefit Obligations",
    "accountType": "LI",
    "currentType": "CU",
    "financialType": "FI"
  },
  {
    "code": "RBO",
    "name": "Retirement Benefit Obligations",
    "accountType": "LI",
    "currentType": "NC",
    "financialType": "FI"
  },
  {
    "code": "RFO",
    "name": "Revenue From Operations",
    "accountType": "IN",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "SDE",
    "name": "Selling & Distribution Expenses",
    "accountType": "EX",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "SHC",
    "name": "Share Capital",
    "accountType": "EQ",
    "currentType": "O",
    "financialType": "O"
  },
  {
    "code": "STB",
    "name": "Short Term Borrowings",
    "accountType": "LI",
    "currentType": "CU",
    "financialType": "FI"
  },
  {
    "code": "TRR",
    "name": "Trade Receivable",
    "accountType": "AS",
    "currentType": "CU",
    "financialType": "FI"
  },
  {
    "code": "TRP",
    "name": "Trade Payable",
    "accountType": "LI",
    "currentType": "CU",
    "financialType": "FI"
  }
];

export const NFRS_GROUPS: { code: string; name: string; headCode: string }[] = [
  {
    "code": "ADE-01",
    "name": "Amortisation",
    "headCode": "ADE"
  },
  {
    "code": "ADE-02",
    "name": "Audit Fee",
    "headCode": "ADE"
  },
  {
    "code": "ADE-03",
    "name": "Balances Write Back/ Write Off",
    "headCode": "ADE"
  },
  {
    "code": "ADE-04",
    "name": "Bank Charges",
    "headCode": "ADE"
  },
  {
    "code": "ADE-05",
    "name": "Communication Expense",
    "headCode": "ADE"
  },
  {
    "code": "ADE-06",
    "name": "Depreciation",
    "headCode": "ADE"
  },
  {
    "code": "ADE-07",
    "name": "Directors Meeting Fee",
    "headCode": "ADE"
  },
  {
    "code": "ADE-08",
    "name": "Electricity Expenses",
    "headCode": "ADE"
  },
  {
    "code": "ADE-09",
    "name": "Employee Expenses",
    "headCode": "ADE"
  },
  {
    "code": "ADE-10",
    "name": "Exchange Loss/(Gain)",
    "headCode": "ADE"
  },
  {
    "code": "ADE-11",
    "name": "Fines & Penalties",
    "headCode": "ADE"
  },
  {
    "code": "ADE-12",
    "name": "Fuel Expenses",
    "headCode": "ADE"
  },
  {
    "code": "ADE-13",
    "name": "General Expenses",
    "headCode": "ADE"
  },
  {
    "code": "ADE-14",
    "name": "Gift & Donations",
    "headCode": "ADE"
  },
  {
    "code": "ADE-15",
    "name": "Insurance Expenses",
    "headCode": "ADE"
  },
  {
    "code": "ADE-16",
    "name": "Legal And Professional Expenses",
    "headCode": "ADE"
  },
  {
    "code": "ADE-17",
    "name": "Loss On Sale Of Assets",
    "headCode": "ADE"
  },
  {
    "code": "ADE-18",
    "name": "Rates & Taxes",
    "headCode": "ADE"
  },
  {
    "code": "ADE-19",
    "name": "Rent Expenses",
    "headCode": "ADE"
  },
  {
    "code": "ADE-20",
    "name": "Repair & Maintenance -Building",
    "headCode": "ADE"
  },
  {
    "code": "ADE-21",
    "name": "Repair & Maintenance -Computers",
    "headCode": "ADE"
  },
  {
    "code": "ADE-22",
    "name": "Repair & Maintenance -Office Equipment",
    "headCode": "ADE"
  },
  {
    "code": "ADE-23",
    "name": "Repair & Maintenance -Plant & Machinery",
    "headCode": "ADE"
  },
  {
    "code": "ADE-24",
    "name": "Repair & Maintenance -Vehicles",
    "headCode": "ADE"
  },
  {
    "code": "ADE-25",
    "name": "Security Expenses",
    "headCode": "ADE"
  },
  {
    "code": "ADE-26",
    "name": "Travel Expenses",
    "headCode": "ADE"
  },
  {
    "code": "CCE-01",
    "name": "Cash In Bank",
    "headCode": "CCE"
  },
  {
    "code": "CCE-02",
    "name": "Cash In Hand",
    "headCode": "CCE"
  },
  {
    "code": "CCE-03",
    "name": "Khalti",
    "headCode": "CCE"
  },
  {
    "code": "CCE-04",
    "name": "eSewa",
    "headCode": "CCE"
  },
  {
    "code": "CCE-05",
    "name": "POS",
    "headCode": "CCE"
  },
  {
    "code": "COS-01",
    "name": "Consumption Cost",
    "headCode": "COS"
  },
  {
    "code": "COS-02",
    "name": "Direct Cost",
    "headCode": "COS"
  },
  {
    "code": "CWIP-01",
    "name": "Capital Work In Progress",
    "headCode": "CWIP"
  },
  {
    "code": "DTA-01",
    "name": "Deferred Tax Asset",
    "headCode": "DTA"
  },
  {
    "code": "DTE-01",
    "name": "Deferred Tax Expenses",
    "headCode": "DTE"
  },
  {
    "code": "DTL-01",
    "name": "Deferred Tax Liability",
    "headCode": "DTL"
  },
  {
    "code": "DTOCI-01",
    "name": "Deferred Tax On Other Compressive Income",
    "headCode": "DTOCI"
  },
  {
    "code": "FNE-01",
    "name": "Financial Expenses",
    "headCode": "FNE"
  },
  {
    "code": "FNI-01",
    "name": "Finance Income",
    "headCode": "FNI"
  },
  {
    "code": "IAS-01",
    "name": "Intangible Assets",
    "headCode": "IAS"
  },
  {
    "code": "INV-01",
    "name": "Finished Goods",
    "headCode": "INV"
  },
  {
    "code": "INV-02",
    "name": "Raw Materials",
    "headCode": "INV"
  },
  {
    "code": "INV-03",
    "name": "Work In Progress",
    "headCode": "INV"
  },
  {
    "code": "ITE-01",
    "name": "Income Tax Expenses",
    "headCode": "ITE"
  },
  {
    "code": "ITP-01",
    "name": "Income Tax Payable",
    "headCode": "ITP"
  },
  {
    "code": "ITR-01",
    "name": "Income Tax Receivable",
    "headCode": "ITR"
  },
  {
    "code": "LTB-01",
    "name": "Term Loan",
    "headCode": "LTB"
  },
  {
    "code": "LTB-02",
    "name": "Vehicle Loan",
    "headCode": "LTB"
  },
  {
    "code": "OCI-01",
    "name": "Other Comprehensive Income",
    "headCode": "OCI"
  },
  {
    "code": "OFA-01",
    "name": "Investments",
    "headCode": "OFA"
  },
  {
    "code": "OFA-02",
    "name": "Other Financial Assets",
    "headCode": "OFA"
  },
  {
    "code": "OFAC-01",
    "name": "Fixed Deposits",
    "headCode": "OFAC"
  },
  {
    "code": "OFAC-02",
    "name": "Interest Income Receivables",
    "headCode": "OFAC"
  },
  {
    "code": "OFAC-03",
    "name": "Letter Of Credit(LC)Margin",
    "headCode": "OFAC"
  },
  {
    "code": "OFAC-04",
    "name": "Other Deposits",
    "headCode": "OFAC"
  },
  {
    "code": "OFAC-05",
    "name": "Security Deposits",
    "headCode": "OFAC"
  },
  {
    "code": "OFAC-06",
    "name": "Staff Advance -Salary",
    "headCode": "OFAC"
  },
  {
    "code": "OFAC-07",
    "name": "Telegraphic Transfer(TT)Margin",
    "headCode": "OFAC"
  },
  {
    "code": "OFL-01",
    "name": "Corporate Social Responsibility(CSR) Payables",
    "headCode": "OFL"
  },
  {
    "code": "OFL-02",
    "name": "Dividend Payable",
    "headCode": "OFL"
  },
  {
    "code": "OFL-03",
    "name": "Employee Bonus Payable",
    "headCode": "OFL"
  },
  {
    "code": "OFL-04",
    "name": "Interest Payable",
    "headCode": "OFL"
  },
  {
    "code": "OFL-05",
    "name": "other Advances",
    "headCode": "OFL"
  },
  {
    "code": "OFL-06",
    "name": "Other Payable",
    "headCode": "OFL"
  },
  {
    "code": "OFL-07",
    "name": "Provision For Expenses",
    "headCode": "OFL"
  },
  {
    "code": "OIC-01",
    "name": "Other Income",
    "headCode": "OIC"
  },
  {
    "code": "ONFA-01",
    "name": "Other Deposits",
    "headCode": "ONFA"
  },
  {
    "code": "ONFA-C-01",
    "name": "Advance To Suppliers",
    "headCode": "ONFA-C"
  },
  {
    "code": "ONFA-C-02",
    "name": "Customs Deposits",
    "headCode": "ONFA-C"
  },
  {
    "code": "ONFA-C-03",
    "name": "Prepaid Expenses",
    "headCode": "ONFA-C"
  },
  {
    "code": "ONFA-C-04",
    "name": "Staff Advance -Salary",
    "headCode": "ONFA-C"
  },
  {
    "code": "ONFA-C-05",
    "name": "Staff Advance - Travel & Others",
    "headCode": "ONFA-C"
  },
  {
    "code": "ONFA-C-06",
    "name": "Vat Receivable",
    "headCode": "ONFA-C"
  },
  {
    "code": "ONFC-01",
    "name": "Deposit Received",
    "headCode": "ONFC"
  },
  {
    "code": "ONFC-02",
    "name": "Long Term Deposits",
    "headCode": "ONFC"
  },
  {
    "code": "ONFC-C-01",
    "name": "Advance Received From Customers",
    "headCode": "ONFC-C"
  },
  {
    "code": "ONFC-C-02",
    "name": "Deposits Received",
    "headCode": "ONFC-C"
  },
  {
    "code": "ONFC-C-03",
    "name": "Employees Payable",
    "headCode": "ONFC-C"
  },
  {
    "code": "ONFC-C-04",
    "name": "Luxury Tax",
    "headCode": "ONFC-C"
  },
  {
    "code": "ONFC-C-05",
    "name": "Other Statutory Liabilities",
    "headCode": "ONFC-C"
  },
  {
    "code": "ONFC-C-06",
    "name": "TDS Payable",
    "headCode": "ONFC-C"
  },
  {
    "code": "ONFC-C-07",
    "name": "Vat Payable",
    "headCode": "ONFC-C"
  },
  {
    "code": "PPE-01",
    "name": "Building",
    "headCode": "PPE"
  },
  {
    "code": "PPE-02",
    "name": "Computer",
    "headCode": "PPE"
  },
  {
    "code": "PPE-03",
    "name": "Furniture & Fixture",
    "headCode": "PPE"
  },
  {
    "code": "PPE-04",
    "name": "Land",
    "headCode": "PPE"
  },
  {
    "code": "PPE-05",
    "name": "Leasehold Development",
    "headCode": "PPE"
  },
  {
    "code": "PPE-06",
    "name": "Office Equipment",
    "headCode": "PPE"
  },
  {
    "code": "PPE-07",
    "name": "Other Assets",
    "headCode": "PPE"
  },
  {
    "code": "PPE-08",
    "name": "Plant & Machinery",
    "headCode": "PPE"
  },
  {
    "code": "PPE-09",
    "name": "Vehicles",
    "headCode": "PPE"
  },
  {
    "code": "PRE-01",
    "name": "Prepayments",
    "headCode": "PRE"
  },
  {
    "code": "R&S-01",
    "name": "Acturial Reverse",
    "headCode": "R&S"
  },
  {
    "code": "R&S-02",
    "name": "Profit And Loss Account",
    "headCode": "R&S"
  },
  {
    "code": "R&S-03",
    "name": "Revaluation Reserve",
    "headCode": "R&S"
  },
  {
    "code": "R&S-04",
    "name": "Security Premium",
    "headCode": "R&S"
  },
  {
    "code": "RBO-01",
    "name": "Retirement Benefit Obligations(NC)",
    "headCode": "RBO"
  },
  {
    "code": "RBO-C-01",
    "name": "Retirement Benefit Obligations",
    "headCode": "RBO-C"
  },
  {
    "code": "RFO-01",
    "name": "Other Sales",
    "headCode": "RFO"
  },
  {
    "code": "RFO-02",
    "name": "Sales",
    "headCode": "RFO"
  },
  {
    "code": "SDE-01",
    "name": "Selling Distribution Expenses",
    "headCode": "SDE"
  },
  {
    "code": "SHC-01",
    "name": "Share Capital",
    "headCode": "SHC"
  },
  {
    "code": "STB-01",
    "name": "Short Term Borrowings",
    "headCode": "STB"
  },
  {
    "code": "TRP-01",
    "name": "Trade Payable",
    "headCode": "TRP"
  },
  {
    "code": "TRR-01",
    "name": "Trade Receivable",
    "headCode": "TRR"
  }
];

export const NFRS_LEDGERS: { code: string; name: string; groupCode: string }[] = [
  {
    "code": "ADE-01-0001",
    "name": "Amortisation Expenses",
    "groupCode": "ADE-01"
  },
  {
    "code": "ADE-02-0001",
    "name": "Audit Fee",
    "groupCode": "ADE-02"
  },
  {
    "code": "ADE-03-0001",
    "name": "Balance Write Back/ Write Off",
    "groupCode": "ADE-03"
  },
  {
    "code": "ADE-04-0001",
    "name": "Bank Charges",
    "groupCode": "ADE-04"
  },
  {
    "code": "ADE-05-0001",
    "name": "Internet Expenses",
    "groupCode": "ADE-05"
  },
  {
    "code": "ADE-05-0002",
    "name": "Postage & Courier",
    "groupCode": "ADE-05"
  },
  {
    "code": "ADE-05-0003",
    "name": "Printing & Stationary Expenses",
    "groupCode": "ADE-05"
  },
  {
    "code": "ADE-05-0004",
    "name": "Telephone Expenses",
    "groupCode": "ADE-05"
  },
  {
    "code": "ADE-06-0001",
    "name": "Depreciation On Building",
    "groupCode": "ADE-06"
  },
  {
    "code": "ADE-06-0002",
    "name": "Depreciation On Computer",
    "groupCode": "ADE-06"
  },
  {
    "code": "ADE-06-0003",
    "name": "Depreciation On Furniture & Fixture",
    "groupCode": "ADE-06"
  },
  {
    "code": "ADE-06-0004",
    "name": "Depreciation On Office Equipment",
    "groupCode": "ADE-06"
  },
  {
    "code": "ADE-06-0005",
    "name": "Depreciation On Vehicles",
    "groupCode": "ADE-06"
  },
  {
    "code": "ADE-06-0006",
    "name": "Depreciation On Other Assets",
    "groupCode": "ADE-06"
  },
  {
    "code": "ADE-06-0007",
    "name": "Depreciation On Plant & Machinery",
    "groupCode": "ADE-06"
  },
  {
    "code": "ADE-06-0008",
    "name": "Depreciation On Leasehold Development",
    "groupCode": "ADE-06"
  },
  {
    "code": "ADE-07-0001",
    "name": "Directors Meeting Fee",
    "groupCode": "ADE-07"
  },
  {
    "code": "ADE-08-0001",
    "name": "Electricity Expenses",
    "groupCode": "ADE-08"
  },
  {
    "code": "ADE-09-0001",
    "name": "Employee Bonus",
    "groupCode": "ADE-09"
  },
  {
    "code": "ADE-09-0002",
    "name": "Salary & Allowances",
    "groupCode": "ADE-09"
  },
  {
    "code": "ADE-09-0003",
    "name": "Staff Welfare",
    "groupCode": "ADE-09"
  },
  {
    "code": "ADE-10-0001",
    "name": "Exchange Loss(Gain)- Realised",
    "groupCode": "ADE-10"
  },
  {
    "code": "ADE-10-0002",
    "name": "Exchange Loss(Gain)- Unrealised",
    "groupCode": "ADE-10"
  },
  {
    "code": "ADE-11-0001",
    "name": "Fines & Penalties",
    "groupCode": "ADE-11"
  },
  {
    "code": "ADE-12-0001",
    "name": "Fuel Expenses -Admin Vehicle",
    "groupCode": "ADE-12"
  },
  {
    "code": "ADE-13-0001",
    "name": "Annual Maintenance Charge",
    "groupCode": "ADE-13"
  },
  {
    "code": "ADE-13-0002",
    "name": "Festival & Pooja Expenses",
    "groupCode": "ADE-13"
  },
  {
    "code": "ADE-13-0003",
    "name": "Fooding & Lodging Expenses",
    "groupCode": "ADE-13"
  },
  {
    "code": "ADE-13-0004",
    "name": "Freight Expenses",
    "groupCode": "ADE-13"
  },
  {
    "code": "ADE-13-0005",
    "name": "Misc Expenses",
    "groupCode": "ADE-13"
  },
  {
    "code": "ADE-13-0006",
    "name": "General Expenses",
    "groupCode": "ADE-13"
  },
  {
    "code": "ADE-14-0001",
    "name": "Gift & Donations",
    "groupCode": "ADE-14"
  },
  {
    "code": "ADE-15-0001",
    "name": "Staff Insurance",
    "groupCode": "ADE-15"
  },
  {
    "code": "ADE-15-0002",
    "name": "Vehicle Insurance",
    "groupCode": "ADE-15"
  },
  {
    "code": "ADE-16-0001",
    "name": "Legal & Consultancy Fee",
    "groupCode": "ADE-16"
  },
  {
    "code": "ADE-17-0001",
    "name": "Loss On Sale Of Assets",
    "groupCode": "ADE-17"
  },
  {
    "code": "ADE-18-0001",
    "name": "Rates & Taxes",
    "groupCode": "ADE-18"
  },
  {
    "code": "ADE-18-0002",
    "name": "Renewal & Registration Fee",
    "groupCode": "ADE-18"
  },
  {
    "code": "ADE-19-0001",
    "name": "Office Rent",
    "groupCode": "ADE-19"
  },
  {
    "code": "ADE-20-0001",
    "name": "Repair & Maintenance -Building",
    "groupCode": "ADE-20"
  },
  {
    "code": "ADE-21-0001",
    "name": "Repair & Maintenance -Computers",
    "groupCode": "ADE-21"
  },
  {
    "code": "ADE-22-0001",
    "name": "Repair & Maintenance -Office Equipment",
    "groupCode": "ADE-22"
  },
  {
    "code": "ADE-23-0001",
    "name": "Repair & Maintenance -Plant & Machinery",
    "groupCode": "ADE-23"
  },
  {
    "code": "ADE-24-0001",
    "name": "Repair & Maintenance -Vehicles",
    "groupCode": "ADE-24"
  },
  {
    "code": "ADE-25-0001",
    "name": "Security Expenses",
    "groupCode": "ADE-25"
  },
  {
    "code": "ADE-26-0001",
    "name": "Tour & Travelling Expenses",
    "groupCode": "ADE-26"
  },
  {
    "code": "CCE-01-0001",
    "name": "Bank Account",
    "groupCode": "CCE-01"
  },
  {
    "code": "CCE-02-0001",
    "name": "Cash In Hand",
    "groupCode": "CCE-02"
  },
  {
    "code": "CCE-03-0001",
    "name": "Khalti",
    "groupCode": "CCE-03"
  },
  {
    "code": "CCE-04-0001",
    "name": "eSewa",
    "groupCode": "CCE-04"
  },
  {
    "code": "CCE-05-0001",
    "name": "POS",
    "groupCode": "CCE-05"
  },
  {
    "code": "COS-01-0001",
    "name": "Purchase",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-01-0002",
    "name": "Purchase Return",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-01-0003",
    "name": "Inventory Adjustment Account",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-01-0004",
    "name": "Direct Purchase Expenses",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-01-0005",
    "name": "Custom Duty",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-01-0006",
    "name": "Freight Till Border",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-01-0007",
    "name": "Freight Post Border",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-01-0008",
    "name": "Insurance Till Border",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-01-0009",
    "name": "Insurance Post Border",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-01-0010",
    "name": "AID Charge",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-01-0011",
    "name": "AID Value",
    "groupCode": "COS-01"
  },
  {
    "code": "COS-02-0001",
    "name": "Insurance",
    "groupCode": "COS-02"
  },
  {
    "code": "COS-02-0002",
    "name": "CSF",
    "groupCode": "COS-02"
  },
  {
    "code": "COS-02-0003",
    "name": "Loading Unloading",
    "groupCode": "COS-02"
  },
  {
    "code": "COS-02-0004",
    "name": "Salary & Wages",
    "groupCode": "COS-02"
  },
  {
    "code": "CWIP-01-0001",
    "name": "Capital Work In Progress",
    "groupCode": "CWIP-01"
  },
  {
    "code": "DTA-01-0001",
    "name": "Deferred Tax Asset",
    "groupCode": "DTA-01"
  },
  {
    "code": "DTE-01-0001",
    "name": "Deferred Tax Expenses",
    "groupCode": "DTE-01"
  },
  {
    "code": "DTL-01-0001",
    "name": "Deferred Tax Liability",
    "groupCode": "DTL-01"
  },
  {
    "code": "DTOCI-01-0001",
    "name": "Deferred Tax On Other Compressive Income",
    "groupCode": "DTOCI-01"
  },
  {
    "code": "FNE-01-0001",
    "name": "Interest On Term Loan",
    "groupCode": "FNE-01"
  },
  {
    "code": "FNE-01-0002",
    "name": "Interest On Vehicle",
    "groupCode": "FNE-01"
  },
  {
    "code": "FNE-01-0003",
    "name": "Interest On Working Capital Loan",
    "groupCode": "FNE-01"
  },
  {
    "code": "FNI-01-0001",
    "name": "Interest Income",
    "groupCode": "FNI-01"
  },
  {
    "code": "IAS-01-0001",
    "name": "Intangible Assets",
    "groupCode": "IAS-01"
  },
  {
    "code": "IAS-01-0002",
    "name": "Accumulated Amortisation-Intangible Assets",
    "groupCode": "IAS-01"
  },
  {
    "code": "INV-01-0001",
    "name": "Finished Inventory",
    "groupCode": "INV-01"
  },
  {
    "code": "INV-02-0001",
    "name": "Raw Material Inventory",
    "groupCode": "INV-02"
  },
  {
    "code": "INV-03-0001",
    "name": "WIP Inventory",
    "groupCode": "INV-03"
  },
  {
    "code": "ITE-01-0001",
    "name": "Income Tax Expenses",
    "groupCode": "ITE-01"
  },
  {
    "code": "ITP-01-0001",
    "name": "Provision For Income Tax Expense",
    "groupCode": "ITP-01"
  },
  {
    "code": "ITR-01-0001",
    "name": "Advance Income Tax(Previous Year)",
    "groupCode": "ITR-01"
  },
  {
    "code": "ITR-01-0002",
    "name": "Advance Tax-FY 2078-79",
    "groupCode": "ITR-01"
  },
  {
    "code": "ITR-01-0003",
    "name": "Advance Tax-FY 2079-80",
    "groupCode": "ITR-01"
  },
  {
    "code": "ITR-01-0004",
    "name": "Income Tax Appeal Deposit",
    "groupCode": "ITR-01"
  },
  {
    "code": "LTB-01-0001",
    "name": "Term Loan",
    "groupCode": "LTB-01"
  },
  {
    "code": "LTB-02-0001",
    "name": "Vehicle Loan",
    "groupCode": "LTB-02"
  },
  {
    "code": "OCI-01-0001",
    "name": "Other Comprehensive Income",
    "groupCode": "OCI-01"
  },
  {
    "code": "OFA-01-0001",
    "name": "Investments In Shares",
    "groupCode": "OFA-01"
  },
  {
    "code": "OFA-02-0001",
    "name": "Long Term Deposits",
    "groupCode": "OFA-02"
  },
  {
    "code": "OFAC-01-0001",
    "name": "Fixed Deposits",
    "groupCode": "OFAC-01"
  },
  {
    "code": "OFAC-02-0001",
    "name": "Interest Income Receivables",
    "groupCode": "OFAC-02"
  },
  {
    "code": "OFAC-03-0001",
    "name": "Letter Of Credit (LC)Margin",
    "groupCode": "OFAC-03"
  },
  {
    "code": "OFAC-04-0001",
    "name": "Other Deposits",
    "groupCode": "OFAC-04"
  },
  {
    "code": "OFAC-05-0001",
    "name": "Security Deposits",
    "groupCode": "OFAC-05"
  },
  {
    "code": "OFAC-06-0001",
    "name": "Staff Advance -Salary",
    "groupCode": "OFAC-06"
  },
  {
    "code": "OFAC-07-0001",
    "name": "Telegraphic Transfer(TT)Margin",
    "groupCode": "OFAC-07"
  },
  {
    "code": "OFL-01-0001",
    "name": "Corporate Social Responsibility(CSR) Payables",
    "groupCode": "OFL-01"
  },
  {
    "code": "OFL-02-0001",
    "name": "Dividend Payable",
    "groupCode": "OFL-02"
  },
  {
    "code": "OFL-03-0001",
    "name": "Employee Bonus Payable",
    "groupCode": "OFL-03"
  },
  {
    "code": "OFL-04-0001",
    "name": "Interest Payable",
    "groupCode": "OFL-04"
  },
  {
    "code": "OFL-05-0001",
    "name": "Other Advances",
    "groupCode": "OFL-05"
  },
  {
    "code": "OFL-06-0001",
    "name": "Other Payable",
    "groupCode": "OFL-06"
  },
  {
    "code": "OFL-07-0001",
    "name": "Provision For Expenses",
    "groupCode": "OFL-07"
  },
  {
    "code": "OIC-01-0001",
    "name": "Dividend Income",
    "groupCode": "OIC-01"
  },
  {
    "code": "OIC-01-0002",
    "name": "Profit On Sale Of Assets",
    "groupCode": "OIC-01"
  },
  {
    "code": "OIC-01-0003",
    "name": "Other Misc Incomes",
    "groupCode": "OIC-01"
  },
  {
    "code": "ONFA-01-0001",
    "name": "Bank Guarantee Margin",
    "groupCode": "ONFA-01"
  },
  {
    "code": "ONFA-01-0002",
    "name": "Government Deposits",
    "groupCode": "ONFA-01"
  },
  {
    "code": "ONFA-C-01-0001",
    "name": "Advance To Suppliers",
    "groupCode": "ONFA-C-01"
  },
  {
    "code": "ONFA-C-02-0001",
    "name": "Customs Deposits",
    "groupCode": "ONFA-C-02"
  },
  {
    "code": "ONFA-C-03-0001",
    "name": "Prepaid Expenses",
    "groupCode": "ONFA-C-03"
  },
  {
    "code": "ONFA-C-04-0001",
    "name": "Staff Advance -Salary",
    "groupCode": "ONFA-C-04"
  },
  {
    "code": "ONFA-C-05-0001",
    "name": "Staff Advances -Travel & Others",
    "groupCode": "ONFA-C-05"
  },
  {
    "code": "ONFA-C-06-0001",
    "name": "Vat Receivable",
    "groupCode": "ONFA-C-06"
  },
  {
    "code": "ONFA-C-06-0002",
    "name": "Vat Reverse Receivable",
    "groupCode": "ONFA-C-06"
  },
  {
    "code": "ONFC-01-0001",
    "name": "Long Term Deposit Received",
    "groupCode": "ONFC-01"
  },
  {
    "code": "ONFC-02-0001",
    "name": "Long Term Deposits",
    "groupCode": "ONFC-02"
  },
  {
    "code": "ONFC-C-01-0001",
    "name": "Advance Received From Customers",
    "groupCode": "ONFC-C-01"
  },
  {
    "code": "ONFC-C-02-0001",
    "name": "Short Term Deposit Received",
    "groupCode": "ONFC-C-02"
  },
  {
    "code": "ONFC-C-03-0001",
    "name": "Salary Payable",
    "groupCode": "ONFC-C-03"
  },
  {
    "code": "ONFC-C-04-0001",
    "name": "Luxury Tax",
    "groupCode": "ONFC-C-04"
  },
  {
    "code": "ONFC-C-05-0001",
    "name": "CIT -Payable",
    "groupCode": "ONFC-C-05"
  },
  {
    "code": "ONFC-C-05-0002",
    "name": "Gratuity Payable",
    "groupCode": "ONFC-C-05"
  },
  {
    "code": "ONFC-C-05-0003",
    "name": "Social Security Fund(30%)",
    "groupCode": "ONFC-C-05"
  },
  {
    "code": "ONFC-C-05-0004",
    "name": "S.S.T 1%-Salary",
    "groupCode": "ONFC-C-05"
  },
  {
    "code": "ONFC-C-06-0001",
    "name": "Tds Payable(Foreign Party",
    "groupCode": "ONFC-C-06"
  },
  {
    "code": "ONFC-C-06-0002",
    "name": "Tds Payable(Rent)",
    "groupCode": "ONFC-C-06"
  },
  {
    "code": "ONFC-C-06-0003",
    "name": "Tds Payable(Salary)",
    "groupCode": "ONFC-C-06"
  },
  {
    "code": "ONFC-C-06-0004",
    "name": "Tds Payable(Freight)",
    "groupCode": "ONFC-C-06"
  },
  {
    "code": "ONFC-C-06-0005",
    "name": "Tds Payable- Dividend",
    "groupCode": "ONFC-C-06"
  },
  {
    "code": "ONFC-C-06-0006",
    "name": "Tds Payable- Professional Fee",
    "groupCode": "ONFC-C-06"
  },
  {
    "code": "ONFC-C-06-0007",
    "name": "Tds Payable-Sales Commission",
    "groupCode": "ONFC-C-06"
  },
  {
    "code": "ONFC-C-06-0008",
    "name": "Tds Payable -Others",
    "groupCode": "ONFC-C-06"
  },
  {
    "code": "ONFC-C-07-0001",
    "name": "Vat Payable",
    "groupCode": "ONFC-C-07"
  },
  {
    "code": "ONFC-C-07-0002",
    "name": "Vat Reverse Payable",
    "groupCode": "ONFC-C-07"
  },
  {
    "code": "ONFC-C-07-0003",
    "name": "Tds Payable(Non Vat)",
    "groupCode": "ONFC-C-07"
  },
  {
    "code": "ONFC-C-07-0004",
    "name": "Tds Payable(Vat)",
    "groupCode": "ONFC-C-07"
  },
  {
    "code": "PPE-01-0001",
    "name": "Building",
    "groupCode": "PPE-01"
  },
  {
    "code": "PPE-01-0002",
    "name": "Accumulated Depreciation -Building",
    "groupCode": "PPE-01"
  },
  {
    "code": "PPE-02-0001",
    "name": "Computer",
    "groupCode": "PPE-02"
  },
  {
    "code": "PPE-02-0002",
    "name": "Accumulated Depreciation -Computer",
    "groupCode": "PPE-02"
  },
  {
    "code": "PPE-03-0001",
    "name": "Furniture & Fixture",
    "groupCode": "PPE-03"
  },
  {
    "code": "PPE-03-0002",
    "name": "Accumulated Depreciation -Furniture & Fixture",
    "groupCode": "PPE-03"
  },
  {
    "code": "PPE-04-0001",
    "name": "Land",
    "groupCode": "PPE-04"
  },
  {
    "code": "PPE-05-0001",
    "name": "Leasehold Development",
    "groupCode": "PPE-05"
  },
  {
    "code": "PPE-05-0002",
    "name": "Accumulated Depreciation -Leasehold Development",
    "groupCode": "PPE-05"
  },
  {
    "code": "PPE-06-0001",
    "name": "Office Equipment",
    "groupCode": "PPE-06"
  },
  {
    "code": "PPE-06-0002",
    "name": "Accumulated Depreciation -Office Equipment",
    "groupCode": "PPE-06"
  },
  {
    "code": "PPE-07-0001",
    "name": "Other Assets",
    "groupCode": "PPE-07"
  },
  {
    "code": "PPE-07-0002",
    "name": "Accumulated Depreciation -Other Assets",
    "groupCode": "PPE-07"
  },
  {
    "code": "PPE-08-0001",
    "name": "Plant & Machinery",
    "groupCode": "PPE-08"
  },
  {
    "code": "PPE-08-0002",
    "name": "Accumulated Depreciation -Plant & Machinery",
    "groupCode": "PPE-08"
  },
  {
    "code": "PPE-09-0001",
    "name": "Vehicles",
    "groupCode": "PPE-09"
  },
  {
    "code": "PPE-09-0002",
    "name": "Accumulated Depreciation -Vehicles",
    "groupCode": "PPE-09"
  },
  {
    "code": "PRE-01-0001",
    "name": "Fixed Deposits",
    "groupCode": "PRE-01"
  },
  {
    "code": "PRE-01-0002",
    "name": "Prepayments And Advances",
    "groupCode": "PRE-01"
  },
  {
    "code": "R&S-01-0001",
    "name": "Acturial Reverse",
    "groupCode": "R&S-01"
  },
  {
    "code": "R&S-02-0001",
    "name": "Profit And Loss Account",
    "groupCode": "R&S-02"
  },
  {
    "code": "R&S-03-0001",
    "name": "Revaluation Reserve",
    "groupCode": "R&S-03"
  },
  {
    "code": "R&S-04-0001",
    "name": "Security Premium",
    "groupCode": "R&S-04"
  },
  {
    "code": "RBO-01-0001",
    "name": "Retirement Benefit Obligations",
    "groupCode": "RBO-01"
  },
  {
    "code": "RBO-C-01-0001",
    "name": "Retirement Benefit Obligations",
    "groupCode": "RBO-C-01"
  },
  {
    "code": "RFO-01-0001",
    "name": "Other Sales",
    "groupCode": "RFO-01"
  },
  {
    "code": "RFO-02-0001",
    "name": "Sales Discount",
    "groupCode": "RFO-02"
  },
  {
    "code": "RFO-02-0002",
    "name": "Sales Return",
    "groupCode": "RFO-02"
  },
  {
    "code": "RFO-02-0003",
    "name": "Sales",
    "groupCode": "RFO-02"
  },
  {
    "code": "SDE-01-0001",
    "name": "Advertisement & Publicity",
    "groupCode": "SDE-01"
  },
  {
    "code": "SDE-01-0002",
    "name": "Business Promotion Expenses",
    "groupCode": "SDE-01"
  },
  {
    "code": "SDE-01-0003",
    "name": "Freight Outward",
    "groupCode": "SDE-01"
  },
  {
    "code": "SDE-01-0004",
    "name": "Sales Commission",
    "groupCode": "SDE-01"
  },
  {
    "code": "SDE-01-0005",
    "name": "Scheme Incentives",
    "groupCode": "SDE-01"
  },
  {
    "code": "SDE-01-0006",
    "name": "Target Bonus And Incentives",
    "groupCode": "SDE-01"
  },
  {
    "code": "SHC-01-0001",
    "name": "Equity Share Capital",
    "groupCode": "SHC-01"
  },
  {
    "code": "STB-01-0001",
    "name": "Working Capital Loan",
    "groupCode": "STB-01"
  },
  {
    "code": "STB-01-0002",
    "name": "TR Loan",
    "groupCode": "STB-01"
  },
  {
    "code": "TRP-01-0001",
    "name": "Trade Payable (Local)",
    "groupCode": "TRP-01"
  },
  {
    "code": "TRP-01-0002",
    "name": "Trade Payble (Foreign)",
    "groupCode": "TRP-01"
  },
  {
    "code": "TRR-01-0001",
    "name": "Trade Receivable (Local)",
    "groupCode": "TRR-01"
  },
  {
    "code": "TRR-01-0002",
    "name": "Trade Receivable (Foreign)",
    "groupCode": "TRR-01"
  }
];
