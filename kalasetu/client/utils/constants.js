export const CRAFT_CATEGORIES = [
  { value: 'handloom_weaving', label: 'Handloom Weaving', icon: 'shirt-outline' },
  { value: 'pottery', label: 'Pottery', icon: 'flask-outline' },
  { value: 'woodcarving', label: 'Wood Carving', icon: 'hammer-outline' },
  { value: 'block_printing', label: 'Block Printing', icon: 'color-palette-outline' },
  { value: 'bamboo_craft', label: 'Bamboo Craft', icon: 'leaf-outline' },
  { value: 'metal_craft', label: 'Metal Craft', icon: 'construct-outline' },
  { value: 'embroidery', label: 'Embroidery', icon: 'cut-outline' },
  { value: 'jewelry', label: 'Jewelry', icon: 'diamond-outline' },
  { value: 'leather_craft', label: 'Leather Craft', icon: 'briefcase-outline' },
  { value: 'other', label: 'Other Craft', icon: 'sparkles-outline' },
];

export const SKILL_LEVELS = [
  { value: 'apprentice', label: 'Apprentice' },
  { value: 'skilled', label: 'Skilled Artisan' },
  { value: 'master', label: 'Master Craftsperson' },
  { value: 'national_awardee', label: 'National Awardee' },
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

export function categoryLabel(value) {
  const found = CRAFT_CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value;
}

export function formatINR(amount) {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
