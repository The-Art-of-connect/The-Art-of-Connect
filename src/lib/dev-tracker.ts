/** Status vocabulary for the Owner Portal development tracker. */
export const STATUS: Record<string, { label: string; tone: string; hint: string }> = {
  functional: { label: "Fully functional", tone: "chip-live", hint: "Built, tested, deployed and working with live services." },
  deployed: { label: "Deployed", tone: "chip-live", hint: "On the website now." },
  tested: { label: "Tested", tone: "", hint: "Passes automated checks; not yet deployed." },
  built: { label: "Built", tone: "", hint: "Code complete; awaiting tests or deployment." },
  designed: { label: "Designed only", tone: "", hint: "The page exists; the feature behind it is not built." },
  awaiting_database: { label: "Awaiting database updates", tone: "chip-locked", hint: "Deployed; works once the database migrations are applied." },
  awaiting_openai: { label: "Awaiting OpenAI integration", tone: "chip-locked", hint: "Needs the OpenAI key, model rates and your authorization." },
  awaiting_payments: { label: "Awaiting live payments", tone: "chip-locked", hint: "Needs Stripe and your launch authorization." },
  awaiting_owner_approval: { label: "Awaiting your approval", tone: "chip-locked", hint: "Needs your content, prices or sign-off." },
  awaiting_legal: { label: "Awaiting legal or professional review", tone: "chip-danger", hint: "Needs attorney or professional approval." },
  coming_soon: { label: "Coming soon", tone: "", hint: "Shown to members as Coming soon." },
};

