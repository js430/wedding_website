/**
 * Where guests should send registry gifts.
 *
 * Shown on the registry page once a guest confirms their picks, and repeated
 * in the confirmation email. Kept here so the two can never drift apart.
 */

export const SHIPPING_ADDRESS = {
  name:      "Jeffrey Shi",
  street:    "10842 Cedar Ave",
  cityState: "Fairfax, VA",
  zip:       "22030",
} as const;

/** Address as display lines, in envelope order. */
export const SHIPPING_LINES: string[] = [
  SHIPPING_ADDRESS.name,
  SHIPPING_ADDRESS.street,
  `${SHIPPING_ADDRESS.cityState} ${SHIPPING_ADDRESS.zip}`,
];

/** Plain-text form, for clipboard copy and text email bodies. */
export const SHIPPING_TEXT = SHIPPING_LINES.join("\n");
