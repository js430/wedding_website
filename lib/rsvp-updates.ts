/**
 * Opting out of wedding-update emails.
 *
 * The RSVP form has a "no updates, please" checkbox, stored in the RSVP
 * Notion database as a checkbox column named below. It records an opt-OUT,
 * so rows saved before the column existed (blank) still mean "send updates".
 * When emailing an update, filter the database on this column being
 * unchecked. RSVP confirmation and edit-link emails are always sent.
 *
 * A missing column never costs a guest their RSVP: writes go through
 * writeTolerant (lib/rsvp-party.ts), which drops it and retries.
 */
export const UPDATES_OPT_OUT = "Updates Opt-Out";
