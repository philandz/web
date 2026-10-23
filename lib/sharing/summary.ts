export type SummaryTransfer = { from: string; to: string; amount: number };

export type SummaryLabels = {
  header: string;
  total: string;
  nobody: string;
  /** Formats one transfer line. */
  line: (from: string, to: string, amount: string) => string;
};

/** Plain-text settlement summary to paste into chat apps (Zalo, Messenger...). */
export function buildSettlementSummary(
  transfers: SummaryTransfer[],
  labels: SummaryLabels,
  formatAmount: (n: number) => string,
): string {
  const lines = [labels.header, labels.total];
  if (transfers.length === 0) {
    lines.push(labels.nobody);
  } else {
    for (const tr of transfers) {
      lines.push(`• ${labels.line(tr.from, tr.to, formatAmount(tr.amount))}`);
    }
  }
  return lines.join("\n");
}
