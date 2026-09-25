import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import Layout from "../components/Layout";
import api from "../services/api";

interface Wallet {
  balance: number;
  totalDeposit: number;
  totalRewards: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
}

const cardStyle = {
  background: "#111827",
  border: "1px solid #1F2937",
  borderRadius: "20px",
  padding: "24px",
};

const formatMoney = (value: number) =>
  "₹" +
  Math.abs(value).toLocaleString(
    "en-IN",
    { maximumFractionDigits: 2 }
  );

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Human labels for the type codes stored in the ledger. */
const TYPE_LABELS: Record<
  string,
  string
> = {
  DEPOSIT: "Added to wallet",
  CHALLENGE_STAKE: "Challenge stake",
  STAKE_REFUND: "Stake returned",
  CHALLENGE_REWARD: "Challenge reward",
};

export default function WalletPage() {
  const [wallet, setWallet] =
    useState<Wallet | null>(null);

  const [atStake, setAtStake] =
    useState(0);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [amount, setAmount] =
    useState("");

  const [depositing, setDepositing] =
    useState(false);

  const [depositError, setDepositError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const load = async () => {
    setError("");

    try {
      const res = await api.get(
        "/wallet"
      );

      setWallet(res.data.wallet);
      setAtStake(res.data.atStake ?? 0);
      setTransactions(
        res.data.transactions ?? []
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Could not load your wallet. Is the server running?"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDeposit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setDepositError("");
    setNotice("");

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setDepositError(
        "Enter an amount greater than zero."
      );
      return;
    }

    setDepositing(true);

    try {
      await api.post("/wallet/deposit", {
        amount: value,
      });

      setNotice(
        `Added ${formatMoney(
          value
        )} to your wallet.`
      );

      setAmount("");

      await load();
    } catch (err: any) {
      setDepositError(
        err?.response?.data?.message ||
          "Could not add money. Please try again."
      );
    } finally {
      setDepositing(false);
    }
  };

  return (
    <Layout>
      <div
        style={{ marginBottom: "36px" }}
      >
        <h1
          style={{
            fontSize: "48px",
            fontWeight: 800,
            marginBottom: "12px",
          }}
        >
          Wallet
        </h1>

        <p
          style={{
            color: "#9CA3AF",
            fontSize: "18px",
          }}
        >
          What you've committed, and what
          it has cost or earned you.
        </p>
      </div>

      {loading && (
        <p style={{ color: "#94A3B8" }}>
          Loading your wallet...
        </p>
      )}

      {!loading && error && (
        <div
          style={{
            padding: "20px 24px",
            borderRadius: "16px",
            background:
              "rgba(239,68,68,0.1)",
            border:
              "1px solid rgba(239,68,68,0.3)",
            color: "#FCA5A5",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && wallet && (
        <>
          {/* Balances */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(220px,1fr))",
              gap: "20px",
              marginBottom: "28px",
            }}
          >
            {[
              {
                label:
                  "Available Balance",
                value: wallet.balance,
                color: "#F8FAFC",
              },
              {
                label: "Currently At Stake",
                value: atStake,
                color: "#FCD34D",
              },
              {
                label: "Total Rewards",
                value:
                  wallet.totalRewards,
                color: "#4ADE80",
              },
              {
                label: "Total Added",
                value:
                  wallet.totalDeposit,
                color: "#94A3B8",
              },
            ].map((item) => (
              <motion.div
                key={item.label}
                whileHover={{ y: -4 }}
                style={cardStyle}
              >
                <p
                  style={{
                    color: "#9CA3AF",
                  }}
                >
                  {item.label}
                </p>

                <h2
                  style={{
                    marginTop: "10px",
                    fontSize: "32px",
                    color: item.color,
                  }}
                >
                  {formatMoney(
                    item.value
                  )}
                </h2>
              </motion.div>
            ))}
          </div>

          {/* Add money */}
          <div
            style={{
              ...cardStyle,
              marginBottom: "32px",
            }}
          >
            <h2
              style={{
                fontSize: "22px",
                marginBottom: "6px",
              }}
            >
              Add money
            </h2>

            <p
              style={{
                color: "#64748B",
                fontSize: "14px",
                marginBottom: "18px",
              }}
            >
              Test balance only. uCommit
              is not connected to any
              payment provider.
            </p>

            <form
              onSubmit={handleDeposit}
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                placeholder="Amount"
                style={{
                  flex: 1,
                  minWidth: "220px",
                  padding: "14px 16px",
                  borderRadius: "14px",
                  background: "#0B1220",
                  border:
                    "1px solid #1F2937",
                  color: "#F8FAFC",
                  fontSize: "16px",
                }}
              />

              <button
                type="submit"
                disabled={depositing}
                style={{
                  background: depositing
                    ? "#1F2937"
                    : "linear-gradient(135deg,#22C55E,#4ADE80)",
                  color: depositing
                    ? "#64748B"
                    : "#081018",
                  border: "none",
                  padding: "14px 28px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  fontSize: "15px",
                  cursor: depositing
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {depositing
                  ? "Adding..."
                  : "Add Money"}
              </button>
            </form>

            {depositError && (
              <p
                style={{
                  color: "#FCA5A5",
                  marginTop: "12px",
                  fontSize: "14px",
                }}
              >
                {depositError}
              </p>
            )}

            {notice && (
              <p
                style={{
                  color: "#4ADE80",
                  marginTop: "12px",
                  fontSize: "14px",
                }}
              >
                {notice}
              </p>
            )}
          </div>

          {/* Ledger */}
          <div style={cardStyle}>
            <h2
              style={{
                marginBottom: "20px",
                fontSize: "22px",
              }}
            >
              Transaction History
            </h2>

            {transactions.length === 0 ? (
              <p
                style={{
                  color: "#9CA3AF",
                }}
              >
                Nothing here yet. Add
                money and join a
                challenge to get started.
              </p>
            ) : (
              transactions.map(
                (transaction, index) => (
                  <div
                    key={transaction.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "16px",
                      padding: "16px 0",
                      borderBottom:
                        index !==
                        transactions.length -
                          1
                          ? "1px solid #1F2937"
                          : "none",
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "16px",
                        }}
                      >
                        {transaction.description ||
                          TYPE_LABELS[
                            transaction
                              .type
                          ] ||
                          transaction.type}
                      </h4>

                      <p
                        style={{
                          color: "#64748B",
                          fontSize: "13px",
                          marginTop: "4px",
                        }}
                      >
                        {formatWhen(
                          transaction.createdAt
                        )}
                      </p>
                    </div>

                    <div
                      style={{
                        color:
                          transaction.amount >=
                          0
                            ? "#22C55E"
                            : "#EF4444",
                        fontWeight: 700,
                        fontSize: "17px",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {transaction.amount >=
                      0
                        ? "+"
                        : "−"}
                      {formatMoney(
                        transaction.amount
                      )}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
