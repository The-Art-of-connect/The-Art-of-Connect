/** The six membership experiences the QA test account can switch between (fictional, complimentary, no payment). */
export const QA_PERSONAS = [
  { key: "free", label: "Free Member", note: "The Art of Becoming, complimentary" },
  { key: "singles", label: "Paid Singles Member", note: "The Personal Society, singles" },
  { key: "couples", label: "Couples Member", note: "The Personal Society, couples" },
  { key: "professional", label: "Professional Member", note: "The Professional Society" },
  { key: "executive", label: "Executive Member", note: "Executive Private" },
  { key: "elite", label: "Elite Member", note: "Elite Concierge" },
] as const;
