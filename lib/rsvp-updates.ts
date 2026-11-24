/**
 * Opting out of wedding-update emails.
 *
 * The RSVP form has a "no updates, please" checkbox, stored in the RSVP
 * Notion database as a checkbox column named below. It records an opt-OUT,
 * so rows saved before the column existed (blank) still mean "send updates".
 * When emailing an update, filter the database on this column being
 * unchecked. RSVP confirmation and edit-link emails are always sent.
 */
export const UPDATES_OPT_OUT = "Updates Opt-Out";

/**
 * Run a Notion write, and if Notion rejects it only because the opt-out
 * column hasn't been added to the database yet, retry without that field.
 * A missing column must never cost a guest their RSVP. `optOutSaved` says
 * whether the opt-out made it into Notion.
 */
export async function withOptionalOptOut<T>(
  properties: Record<string, any>,
  write: (properties: Record<string, any>) => Promise<T>,
): Promise<{ value: T; optOutSaved: boolean }> {
  try {
    return { value: await write(properties), optOutSaved: UPDATES_OPT_OUT in properties };
  } catch (err: any) {
    const message = String(err?.message ?? "");
    if (!(UPDATES_OPT_OUT in properties) || !message.includes(UPDATES_OPT_OUT)) throw err;
    console.warn(
      `[RSVP] Notion has no "${UPDATES_OPT_OUT}" checkbox column; saved without it. Add the column to record opt-outs.`,
    );
    const { [UPDATES_OPT_OUT]: _omit, ...rest } = properties;
    return { value: await write(rest), optOutSaved: false };
  }
}
