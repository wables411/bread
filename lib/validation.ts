import { z } from "zod";

// US 5-digit zip
const US_ZIP_REGEX = /^\d{5}$/;

// US state abbreviations (50 states + DC)
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

export const checkoutSchema = z.object({
  customer_name: z.string().min(1, "Name required").max(100),
  email: z.string().email("Invalid email"),
  address: z.string().min(5, "Address required").max(200),
  city: z.string().min(1, "City required").max(100),
  state: z.string().length(2, "2-letter state code").refine(
    (s) => US_STATES.includes(s.toUpperCase()),
    "Invalid US state"
  ),
  zip: z.string().regex(US_ZIP_REGEX, "5-digit US zip required"),
  phone: z.string().min(10, "Phone required").max(20),
  shipping_option: z.enum(["overnight", "2day"]),
  payment_amount: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
