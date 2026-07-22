// Zone-based shipping from origin 39401 (server-side ONLY).
//
// PRIVACY: never import this file from a client component. The zone chart is
// derived from the bakery's origin ZIP prefix — shipping it in the client
// bundle would reveal the shop's location. Clients get prices only, via
// GET /api/shipping-quote.
//
// Rates quoted from Pirate Ship's public calculator on 2026-07-21/22
// (11.25x8.75x6 box, sampled at 3, 5 and 8 lb in every zone — the real packed
// weights of 1, 2 and 3 loaves; customer price = quoted label cost rounded up
// + $2 buffer/margin). Every option arrives no later than Wednesday when
// shipped Monday:
//   - zones 1-3: UPS Ground (1-day scheduled transit; a slip still lands Wed)
//   - zones 4-8 two-day: UPS 2nd Day Air (guaranteed Wednesday)
//   - zones 4-8 one-day: UPS Next Day Air Saver (guaranteed Tuesday)
//   - AK/HI: UPS 2nd Day Air only — overnight to AK/HI costs $100+, not offered
// Pirate Ship picks the actual cheapest qualifying label at purchase time.

import { orderWeightOz } from "./constants";

export { orderWeightOz };

export type ShippingSpeed = "oneday" | "twoday";

// USPS zone chart for origin prefix 394, effective July 1, 2026
// (postcalc.usps.com). Entries: [zip3 start, zip3 end, zone].
const ZONE_RANGES: [number, number, number][] = [
  [5, 5, 6], [10, 43, 6], [44, 44, 7], [45, 45, 6], [46, 49, 7],
  [50, 79, 6], [80, 83, 5], [84, 89, 6], [100, 140, 6], [141, 143, 5],
  [144, 146, 6], [147, 147, 5], [148, 149, 6], [150, 179, 5], [180, 181, 6],
  [182, 182, 5], [183, 189, 6], [190, 212, 5], [214, 241, 5], [242, 242, 4],
  [243, 245, 5], [246, 246, 4], [247, 268, 5], [270, 279, 5], [280, 282, 4],
  [283, 285, 5], [286, 297, 4], [298, 299, 4], [300, 312, 4], [313, 317, 4],
  [318, 319, 3], [320, 323, 4], [324, 324, 3], [325, 325, 2], [326, 329, 4],
  [330, 333, 5], [334, 339, 4], [341, 342, 4], [344, 344, 4], [346, 347, 4],
  [349, 349, 4], [350, 352, 3], [354, 354, 2], [355, 363, 3], [364, 367, 2],
  [368, 368, 3], [369, 369, 2], [370, 372, 4], [373, 374, 4], [375, 375, 3],
  [376, 376, 4], [377, 379, 4], [380, 381, 3], [382, 385, 4], [386, 389, 3],
  [390, 393, 2], [394, 395, 1], [396, 396, 2], [397, 398, 3], [399, 399, 4],
  [400, 406, 4], [407, 409, 4], [410, 410, 4], [411, 411, 5], [412, 416, 4],
  [417, 418, 4], [420, 424, 4], [425, 426, 4], [427, 427, 4], [430, 469, 5],
  [470, 472, 4], [473, 473, 5], [474, 478, 4], [479, 497, 5], [498, 499, 6],
  [500, 516, 5], [520, 528, 5], [530, 532, 5], [534, 535, 5], [537, 544, 5],
  [545, 545, 6], [546, 547, 5], [548, 548, 6], [549, 551, 5], [553, 555, 5],
  [556, 558, 6], [559, 561, 5], [562, 567, 6], [570, 571, 5], [572, 577, 6],
  [580, 588, 6], [590, 592, 7], [593, 593, 6], [594, 599, 7], [600, 618, 5],
  [619, 620, 4], [622, 622, 4], [623, 623, 5], [624, 631, 4], [633, 633, 4],
  [634, 635, 5], [636, 639, 4], [640, 641, 5], [644, 646, 5], [647, 648, 4],
  [649, 649, 5], [650, 658, 4], [660, 660, 4], [661, 662, 5], [664, 666, 5],
  [667, 667, 4], [668, 672, 5], [673, 673, 4], [674, 681, 5], [683, 691, 5],
  [692, 693, 6], [700, 701, 2], [703, 704, 2], [705, 706, 3], [707, 708, 2],
  [710, 714, 3], [716, 717, 3], [718, 719, 4], [720, 720, 3], [721, 722, 4],
  [723, 723, 3], [724, 731, 4], [733, 735, 4], [736, 739, 5], [740, 741, 4],
  [743, 758, 4], [759, 759, 3], [760, 768, 4], [769, 769, 5], [770, 770, 4],
  [772, 775, 4], [776, 776, 3], [777, 779, 4], [780, 780, 5], [781, 784, 4],
  [785, 785, 5], [786, 787, 4], [788, 788, 5], [789, 789, 4], [790, 798, 5],
  [799, 806, 6], [807, 808, 5], [809, 809, 6], [810, 810, 5], [811, 816, 6],
  [820, 820, 6], [821, 821, 7], [822, 823, 6], [824, 824, 7], [825, 829, 6],
  [830, 838, 7], [840, 840, 6], [841, 844, 7], [845, 846, 6], [847, 847, 7],
  [850, 852, 6], [853, 853, 7], [855, 857, 6], [859, 860, 6], [863, 863, 6],
  [864, 864, 7], [865, 865, 6], [870, 871, 6], [873, 876, 6], [877, 877, 5],
  [878, 880, 6], [881, 884, 5], [885, 885, 6], [889, 891, 7], [893, 894, 7],
  [895, 895, 8], [897, 898, 7], [900, 908, 7], [910, 928, 7], [930, 933, 7],
  [934, 934, 8], [935, 938, 7], [939, 961, 8], [967, 968, 8], [970, 978, 8],
  [979, 979, 7], [980, 986, 8], [988, 999, 8],
];

// Military APO/FPO/DPO and territories UPS air can't serve on our schedule
const UNSUPPORTED_RANGES: [number, number][] = [
  [6, 9], // Puerto Rico / USVI — not rate-sampled, surcharges apply
  [90, 99], // APO/FPO Europe
  [340, 340], // APO/FPO Americas
  [962, 966], // APO/FPO Pacific
  [969, 969], // Guam / American Samoa
];

// Alaska + Hawaii: USPS zone 8 but UPS prices them far higher than CONUS z8
const AKHI_RANGES: [number, number][] = [
  [967, 968], // HI
  [995, 999], // AK
];

// Customer prices [twoday, oneday] per zone, by real packed weight:
// tier1 ≤ 48 oz (1 loaf, 3 lb) · tier2 ≤ 80 oz (2 loaves, 5 lb) ·
// tier3 ≤ 128 oz (3 loaves, 8 lb)
const CONUS_PRICES: Record<
  number,
  { tier1: [number, number]; tier2: [number, number]; tier3: [number, number] }
> = {
  1: { tier1: [11, 11], tier2: [11, 11], tier3: [11, 11] },
  2: { tier1: [11, 11], tier2: [11, 11], tier3: [11, 11] },
  3: { tier1: [11, 11], tier2: [12, 12], tier3: [12, 12] },
  4: { tier1: [17, 46], tier2: [18, 49], tier3: [23, 58] },
  5: { tier1: [20, 51], tier2: [20, 54], tier3: [29, 65] },
  6: { tier1: [22, 54], tier2: [22, 58], tier3: [42, 70] },
  7: { tier1: [24, 58], tier2: [27, 62], tier3: [44, 74] },
  8: { tier1: [26, 62], tier2: [30, 66], tier3: [46, 79] },
};

const AKHI_PRICES = { tier1: 50, tier2: 54, tier3: 67 };

const TIER1_MAX_OZ = 48;
const TIER2_MAX_OZ = 80;
const TIER3_MAX_OZ = 128;
// Above tier 3, UPS air climbs ~$3-4/lb; charge $5/lb started to stay covered
const OVERWEIGHT_PER_LB = 5;

function inRanges(zip3: number, ranges: [number, number][]): boolean {
  return ranges.some(([lo, hi]) => zip3 >= lo && zip3 <= hi);
}

function zoneForZip3(zip3: number): number | null {
  const hit = ZONE_RANGES.find(([lo, hi]) => zip3 >= lo && zip3 <= hi);
  return hit ? hit[2] : null;
}

export interface ShippingQuote {
  supported: boolean;
  reason?: string;
  /** Price in USD; oneday is null where next-day delivery isn't offered (AK/HI) */
  prices?: { twoday: number; oneday: number | null };
}

export function quoteShipping(zip: string, weightOz: number): ShippingQuote {
  const zipStr = String(zip).trim();
  if (!/^\d{5}$/.test(zipStr)) {
    return { supported: false, reason: "Enter a 5-digit US ZIP code." };
  }
  const zip3 = parseInt(zipStr.slice(0, 3), 10);

  if (inRanges(zip3, UNSUPPORTED_RANGES)) {
    return {
      supported: false,
      reason:
        "We can't guarantee fresh delivery to this address (military/territory ZIP). Sorry!",
    };
  }

  const overweightFee =
    weightOz > TIER3_MAX_OZ
      ? Math.ceil((weightOz - TIER3_MAX_OZ) / 16) * OVERWEIGHT_PER_LB
      : 0;
  const tier: "tier1" | "tier2" | "tier3" =
    weightOz <= TIER1_MAX_OZ
      ? "tier1"
      : weightOz <= TIER2_MAX_OZ
        ? "tier2"
        : "tier3";

  if (inRanges(zip3, AKHI_RANGES)) {
    return {
      supported: true,
      prices: { twoday: AKHI_PRICES[tier] + overweightFee, oneday: null },
    };
  }

  const zone = zoneForZip3(zip3);
  if (zone === null || !CONUS_PRICES[zone]) {
    return {
      supported: false,
      reason: "We couldn't match this ZIP code — double-check it, or contact us.",
    };
  }

  const [twoday, oneday] = CONUS_PRICES[zone][tier];
  return {
    supported: true,
    prices: {
      twoday: twoday + overweightFee,
      // zones 1-3 use the same next-day Ground service for both speeds
      oneday: oneday + overweightFee,
    },
  };
}

/** Customer-facing labels — no carrier or origin info. */
export const SPEED_LABELS: Record<ShippingSpeed, string> = {
  oneday: "1-day (arrives Tuesday)",
  twoday: "2-day (arrives Wednesday)",
};

/**
 * Cheapest qualifying service to buy in Pirate Ship for this order — used in
 * the CSV export only (never shown to customers). Handles legacy options
 * from orders placed before zone pricing ("ground"/"air").
 */
export function serviceForExport(zip: string, option: string): string {
  if (option === "ground") return "UPS 3 Day Select (legacy)";
  if (option === "air") return "UPS 2nd Day Air (legacy)";

  const zip3 = parseInt(String(zip).trim().slice(0, 3), 10);
  if (Number.isNaN(zip3)) return option;
  if (inRanges(zip3, AKHI_RANGES)) return "UPS 2nd Day Air";
  const zone = zoneForZip3(zip3) ?? 8;
  if (zone <= 3) return "UPS Ground (arrives next day)";
  return option === "oneday" ? "UPS Next Day Air Saver" : "UPS 2nd Day Air";
}
