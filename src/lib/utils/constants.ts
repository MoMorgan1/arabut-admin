// === Order Status Labels (Arabic) ===

export const COINS_STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  processing: "جاري البدء",
  shipping: "جاري الشحن",
  on_hold_internal: "متوقف - مشكلة داخلية",
  on_hold_customer: "متوقف - مشكلة من الزبون",
  completed: "تم الشحن",
  cancelled: "ملغي",
  refunded: "استرجاع",
};

export const SERVICE_STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  credentials_sent: "تم إرسال البيانات للمحترف",
  in_progress: "جاري العمل",
  on_hold_customer: "متوقف - مشكلة من الزبون",
  completed: "تم التنفيذ",
  completed_comp: "تم مع تعويض",
  cancelled: "ملغي",
  refunded: "استرجاع",
};

// Unified status labels (works for both coins and service items)
export const STATUS_LABELS: Record<string, string> = {
  ...COINS_STATUS_LABELS,
  ...SERVICE_STATUS_LABELS,
};

// Status options for dropdowns (by type)
export const COINS_STATUSES = Object.keys(COINS_STATUS_LABELS);
export const SERVICE_STATUSES = Object.keys(SERVICE_STATUS_LABELS);

// === Status Badge Colors ===
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface StatusStyle {
  label: string;
  color: string; // Tailwind bg class
  textColor: string;
}

export const STATUS_STYLES: Record<string, StatusStyle> = {
  new: { label: "جديد", color: "bg-yellow-500/20", textColor: "text-yellow-400" },
  processing: { label: "جاري البدء", color: "bg-yellow-500/20", textColor: "text-yellow-400" },
  shipping: { label: "جاري الشحن", color: "bg-blue-500/20", textColor: "text-blue-400" },
  in_progress: { label: "جاري العمل", color: "bg-blue-500/20", textColor: "text-blue-400" },
  credentials_sent: { label: "تم إرسال البيانات", color: "bg-blue-500/20", textColor: "text-blue-400" },
  on_hold_internal: { label: "متوقف - داخلي", color: "bg-orange-500/20", textColor: "text-orange-400" },
  on_hold_customer: { label: "متوقف - الزبون", color: "bg-orange-500/20", textColor: "text-orange-400" },
  completed: { label: "مكتمل", color: "bg-green-500/20", textColor: "text-green-400" },
  completed_comp: { label: "مكتمل + تعويض", color: "bg-green-500/20", textColor: "text-green-400" },
  cancelled: { label: "ملغي", color: "bg-red-500/20", textColor: "text-red-400" },
  refunded: { label: "استرجاع", color: "bg-red-500/20", textColor: "text-red-400" },
};

// === Order Type Labels ===
export const ORDER_TYPE_LABELS: Record<string, string> = {
  coins: "كوينز",
  fut_rank: "فوت رانك",
  challenges: "تحديات",
  raffles: "رايفلز",
  other: "أخرى",
};

// === Account Check Notes (FUT Transfer → Arabic) ===
export const ACCOUNT_CHECK_NOTES: Record<string, string> = {
  wrongBA: "الأكواد الاحتياطية غلط — محتاج أكواد جديدة",
  wrongUserPass: "الإيميل أو الباسورد غلط",
  wrongConsole: "المنصة غلط — تحقق من نوع الطلب",
  noClub: "الحساب مفيهوش نادي",
  tlFull: "قائمة الانتقالات ممتلئة — محتاج 3 أماكن فاضية",
  notEnoughCoins: "محتاج يكون في الحساب أكثر من 1500 كوينز",
  console: "لازم تسجل خروج من الكونسول",
  noTM: "الحساب مفيهوش سوق انتقالات",
  wrongPersona: "محتاج تغيير الـ persona",
  captcha: "محتاج حل الكابتشا",
  unassignedItemsPresent: "في عناصر غير مخصصة — لازم تكون أقل من 50",
  FailWebAppCustomerLocked: "حساب الويب آب مقفول",
  finished: "تم التحقق بنجاح ✅",
};

// === Pricing Tiers (matches N8N) ===
export const PRICING = {
  usdToEurRate: 0.84,
  PS: {
    slow_AnyQty: 14,
    fast_Tier1: 16, // ≤700K
    fast_Tier2: 18, // ≤1500K
    fast_Tier3: 22, // ≤2000K
    fast_Tier4: 24, // ≤5000K
    fast_Tier5: 26, // >5000K
  },
  PC: {
    slow_AnyQty: 25,
    fast_Tier1: 25,
    fast_Tier2: 25,
    fast_Tier3: 25,
    fast_Tier4: 25,
    fast_Tier5: 25,
  },
} as const;
