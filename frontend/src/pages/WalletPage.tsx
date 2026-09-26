import { useEffect, useState } from "react";

import Layout from "../components/Layout";
import api from "../services/api";

import {
  Card,
  Button,
  Input,
  StatTile,
  TileGrid,
  PageHeader,
  Notice,
  Muted,
} from "../components/ui";

import {
  colour,
  space,
  font,
  weight,
  money,
} from "../theme";

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

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const TYPE_LABELS: Record<string, string> =
  {
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

  const handleDeposit = async () => {
    setDepositError("");
    setNotice("");

    const value = Number(amount);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
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
        `Added ${money(
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
      <PageHeader
        title="Wallet"
        description="What you have committed, and what it has cost or earned you."
      />

      {loading && (
        <Muted>
          Loading your wallet...
        </Muted>
      )}

      {!loading && error && (
        <Notice tone="danger">
          {error}
        </Notice>
      )}

      {!loading && !error && wallet && (
        <>
          <TileGrid>
            <StatTile
              value={money(
                wallet.balance
              )}
              label="Available"
            />
            <StatTile
              value={money(atStake)}
              label="At stake"
              tone={
                atStake > 0
                  ? "warn"
                  : undefined
              }
            />
            <StatTile
              value={money(
                wallet.totalRewards
              )}
              label="Rewards earned"
              tone={
                wallet.totalRewards > 0
                  ? "accent"
                  : undefined
              }
            />
            <StatTile
              value={money(
                wallet.totalDeposit
              )}
              label="Total added"
            />
          </TileGrid>

          <Card
            style={{
              marginTop: space.lg,
              marginBottom: space.lg,
            }}
          >
            <h2
              style={{
                fontSize: font.heading,
                fontWeight:
                  weight.semibold,
                margin: `0 0 ${space.xs}`,
              }}
            >
              Add money
            </h2>

            <p
              style={{
                color: colour.textFaint,
                fontSize: font.tiny,
                margin: `0 0 ${space.md}`,
              }}
            >
              Test balance only. uCommit
              is not connected to a
              payment provider.
            </p>

            <div
              style={{
                display: "flex",
                gap: space.sm,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: "200px",
                }}
              >
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={setAmount}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter"
                    )
                      handleDeposit();
                  }}
                  placeholder="Amount"
                />
              </div>

              <Button
                onClick={handleDeposit}
                disabled={depositing}
              >
                {depositing
                  ? "Adding..."
                  : "Add"}
              </Button>
            </div>

            {depositError && (
              <p
                style={{
                  color: colour.danger,
                  fontSize: font.small,
                  margin: `${space.sm} 0 0`,
                }}
              >
                {depositError}
              </p>
            )}

            {notice && (
              <p
                style={{
                  color:
                    colour.accentText,
                  fontSize: font.small,
                  margin: `${space.sm} 0 0`,
                }}
              >
                {notice}
              </p>
            )}
          </Card>

          <Card>
            <h2
              style={{
                fontSize: font.heading,
                fontWeight:
                  weight.semibold,
                margin: `0 0 ${space.lg}`,
              }}
            >
              Transactions
            </h2>

            {transactions.length === 0 ? (
              <Muted>
                Nothing yet. Add money
                and join a challenge to
                get started.
              </Muted>
            ) : (
              transactions.map(
                (t, index) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: space.lg,
                      padding: `${space.md} 0`,
                      borderBottom:
                        index !==
                        transactions.length -
                          1
                          ? `1px solid ${colour.border}`
                          : "none",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            font.body,
                        }}
                      >
                        {t.description ||
                          TYPE_LABELS[
                            t.type
                          ] ||
                          t.type}
                      </p>

                      <p
                        style={{
                          color:
                            colour.textFaint,
                          fontSize:
                            font.tiny,
                          margin: `2px 0 0`,
                        }}
                      >
                        {formatWhen(
                          t.createdAt
                        )}
                      </p>
                    </div>

                    <span
                      style={{
                        color:
                          t.amount >= 0
                            ? colour.accentText
                            : colour.danger,
                        fontWeight:
                          weight.medium,
                        fontSize:
                          font.body,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {t.amount >= 0
                        ? "+"
                        : "−"}
                      {money(
                        Math.abs(
                          t.amount
                        )
                      )}
                    </span>
                  </div>
                )
              )
            )}
          </Card>
        </>
      )}
    </Layout>
  );
}
