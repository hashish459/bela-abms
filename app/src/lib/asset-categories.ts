export const ASSET_CATEGORIES = [
  { value: "BUILDING", label: "Building" },
  { value: "COMPUTER", label: "Computer" },
  { value: "FURNITURE_FIXTURE", label: "Furniture & Fixture" },
  { value: "LAND", label: "Land" },
  { value: "LEASEHOLD_DEVELOPMENT", label: "Leasehold Development" },
  { value: "OFFICE_EQUIPMENT", label: "Office Equipment" },
  { value: "OTHER_ASSETS", label: "Other Assets" },
  { value: "PLANT_MACHINERY", label: "Plant & Machinery" },
  { value: "VEHICLES", label: "Vehicles" },
] as const;

export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ASSET_CATEGORIES.map((c) => [c.value, c.label]),
);
