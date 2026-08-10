import { userCol } from "@/lib/firestore";
import { MonthPlan } from "@/types/monthPlan.types";
import { getDocs, query, where } from "firebase/firestore";
import { monthPlanService } from "./monthPlan.service";
import { transactionService } from "./transaction.service";
import { envelopeService } from "./envelope.service";
import { accountService } from "./account.service";
import { cardService } from "./card.service";
import { Envelope } from "@/types/envelope.types";

export interface EnvelopeCell {
  envelopeId: string;
  limit: number;       // From monthPlan (if materialized) or defaultAmount
  consumed: number;    // Sum of expense + card_purchase for this envelope in this month
  isVirtual: boolean;  // true = month has no monthPlan document
}

export interface MonthSummaryData {
  monthYear: string;
  month: number;
  year: number;
  label: string;       // e.g. "Jul/25"
  totalIncome: number; // income + month_transfer_in
  totalPlanned: number;// Sum of all envelope limits for this month
  totalExpenses: number; // expense + bill_payment + month_transfer_out + card_purchase(pending)
  saldo: number;       // totalIncome - totalExpenses
  envelopes: EnvelopeCell[];
  isVirtual: boolean;
}

export interface DashboardData {
  totalBalance: number;        // Saldo Geral = sum of account.balance (active accounts)
  totalPendingBills: number;   // Faturas pendentes = sum of card.pendingBills (active cards)
  months: MonthSummaryData[];
  envelopes: Envelope[];       // Ordered list of active envelopes
}

function buildMonthLabel(month: number, year: number): string {
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${monthNames[month - 1]}/${String(year).slice(2)}`;
}

function toMonthYear(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export const dashboardService = {
  /**
   * Fetches all data needed for the dashboard.
   * @param userId The user ID.
   * @param monthsToShow Array of {month, year} to display.
   */
  async getDashboardData(
    userId: string,
    monthsToShow: { month: number; year: number }[]
  ): Promise<DashboardData> {
    const monthYears = monthsToShow.map((m) => toMonthYear(m.month, m.year));

    // Fetch accounts, envelopes, cards and month transactions in parallel.
    // No more getAllTransactions full scan — balance comes from account.balance
    // and pendingBills from card.pendingBills.
    const [allAccounts, allEnvelopes, allCards, dashboardTransactions] = await Promise.all([
      accountService.getAccounts(userId),
      envelopeService.getEnvelopes(userId),
      cardService.getCards(userId),
      transactionService.getTransactionsByMonths(userId, monthYears),
    ]);

    // Filter to only active items for dashboard indicators
    const accounts = allAccounts.filter(a => a.active);
    const envelopes = allEnvelopes.filter(e => e.active);
    const activeCards = allCards.filter(c => c.active);

    // Fetch monthPlans for only the months we need
    const monthPlansCol = userCol<MonthPlan>(userId, "monthPlans");
    const monthPlansQuery = query(
      monthPlansCol,
      where("monthYear", "in", monthYears.length > 0 ? monthYears : ["__none__"])
    );
    const monthPlansSnap = await getDocs(monthPlansQuery);
    const monthPlansMap: Record<string, MonthPlan> = {};
    monthPlansSnap.forEach((doc) => {
      monthPlansMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    // Saldo Geral: sum of account.balance (active accounts)
    // Falls back to initialBalance for accounts created before the migration
    const totalBalance = accounts.reduce(
      (sum, a) => sum + (a.balance ?? a.initialBalance ?? 0),
      0
    );

    // Faturas Pendentes: sum of card.pendingBills (active cards)
    const totalPendingBills = activeCards.reduce(
      (sum, c) => sum + (c.pendingBills ?? 0),
      0
    );

    // Build month summaries using only the already-fetched dashboardTransactions
    const months: MonthSummaryData[] = monthsToShow.map(({ month, year }) => {
      const monthYear = toMonthYear(month, year);
      const plan = monthPlansMap[monthYear];
      const isVirtual = !plan;
      const monthTxs = dashboardTransactions.filter((t) => t.referenceMonthYear === monthYear);

      // Build envelope cells for this month
      const envelopeCells: EnvelopeCell[] = envelopes
        .filter((env) => {
          if (env.type === "default") return true;
          if (env.type === "temporary" && env.targetMonths) {
            return env.targetMonths.some((t) => t.month === month && t.year === year);
          }
          return false;
        })
        .map((env) => {
          const envelopeId = env.id!;
          let limit: number;

          if (isVirtual) {
            limit = env.defaultAmount;
          } else {
            limit = plan.envelopeLimits[envelopeId] ?? env.defaultAmount;
          }

          const consumed = monthTxs
            .filter(
              (t) =>
                (t.envelopeId === envelopeId &&
                  (t.type === "expense" || t.type === "card_purchase") &&
                  t.status !== "reversed" &&
                  t.status !== "cancelled") ||
                // goal_transfer com envelope conta como consumo do envelope
                (t.type === "goal_transfer" &&
                  t.envelopeId === envelopeId)
            )
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

          return { envelopeId, limit, consumed, isVirtual };
        });

      // Month income (income + transfer_in + goal_withdraw)
      const totalIncome = monthTxs
        .filter((t) => t.type === "income" || t.type === "month_transfer_in" || t.type === "goal_withdraw")
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Month expenses (expense, bill_payment, month_transfer_out, goal_transfer, card_purchase if pending)
      const totalExpenses = monthTxs
        .filter((t) => {
          if (t.status === "reversed" || t.status === "cancelled") return false;
          if (t.type === "expense" || t.type === "bill_payment" || t.type === "month_transfer_out" || t.type === "goal_transfer") return true;
          if (t.type === "card_purchase" && t.status === "pending") return true;
          return false;
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const totalPlanned = envelopeCells.reduce((sum, e) => sum + e.limit, 0);
      const saldo = totalIncome - totalExpenses;

      return {
        monthYear,
        month,
        year,
        label: buildMonthLabel(month, year),
        totalIncome,
        totalPlanned,
        totalExpenses,
        saldo,
        envelopes: envelopeCells,
        isVirtual,
      };
    });

    return {
      totalBalance,
      totalPendingBills,
      months,
      envelopes,
    };
  },
};
