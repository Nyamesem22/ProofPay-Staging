export const mobileProviderOptions = [
  "MTN MoMo",
  "Telecel Cash",
  "AT Money",
  "AirtelTigo Money",
  "Mixx by Yas",
  "Moov Flooz",
  "Orange Money",
  "Yoomee Mobile Money",
  "MoMo PSB",
  "SmartCash PSB",
];

export const bankOptions = [
  "Absa Bank Ghana Limited",
  "Access Bank (Ghana) Plc",
  "ADEHYEMAN Savings and Loans Limited",
  "AFFINITY Savings and Loans Limited",
  "Agricultural Development Bank Plc",
  "AHOMKA Personal Loans",
  "CalBank Plc",
  "Consolidated Bank Ghana",
  "Ecobank Ghana Plc",
  "Fidelity Bank Ghana Limited",
  "First Atlantic Bank Limited",
  "GCB Bank Plc",
  "Republic Bank (Ghana) Plc",
  "Stanbic Bank Ghana Limited",
  "Standard Chartered Bank Ghana Plc",
  "United Bank for Africa (Ghana) Limited",
  "Zenith Bank (Ghana) Limited",
  "Other bank",
];

export const paymentCountries = [
  { code: "GH", label: "Ghana (+233)" },
  { code: "TG", label: "Togo (+228)" },
  { code: "CM", label: "Cameroon (+237)" },
  { code: "NG", label: "Nigeria (+234)" },
];

const providerRules = {
  GH: [
    { provider: "MTN MoMo", prefixes: ["024", "025", "053", "054", "055", "059"] },
    { provider: "Telecel Cash", prefixes: ["020", "050"] },
    { provider: "AT Money", prefixes: ["026", "027", "056", "057"] },
  ],
  TG: [
    { provider: "Mixx by Yas", prefixes: ["070", "071", "090", "091", "092", "093"] },
    { provider: "Moov Flooz", prefixes: ["096", "097", "098", "099"] },
  ],
  CM: [
    { provider: "Orange Money", prefixes: ["655", "656", "657", "658", "659", "69"] },
    { provider: "Yoomee Mobile Money", prefixes: ["242", "243"] },
  ],
  NG: [
    { provider: "SmartCash PSB", prefixes: ["0701", "0802", "0808", "0812", "0902", "0904", "0907", "0912"] },
  ],
};

const countryCallingCodes = { GH: "233", TG: "228", CM: "237", NG: "234" };

export function normalizeLocalPhone(country, value) {
  let digits = String(value || "").replace(/\D/g, "");
  const callingCode = countryCallingCodes[country];
  if (callingCode && digits.startsWith(callingCode)) digits = digits.slice(callingCode.length);
  if (digits && !digits.startsWith("0")) digits = `0${digits}`;
  return digits;
}

export function detectMobileProvider(country, value) {
  const localPhone = normalizeLocalPhone(country, value);
  const rules = providerRules[country] || [];
  return rules.find(rule => rule.prefixes.some(prefix => localPhone.startsWith(prefix)))?.provider || "";
}

export function maskPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 7) return value || "Not provided";
  return `${digits.slice(0, 3)} *** ${digits.slice(-4)}`;
}
