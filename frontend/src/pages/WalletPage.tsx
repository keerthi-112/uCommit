import Layout from "../components/Layout";

export default function WalletPage() {
  const transactions = [
    {
      type: "Reward",
      amount: "+₹50",
      challenge: "Walking Challenge",
      date: "Yesterday",
    },
    {
      type: "Stake",
      amount: "-₹100",
      challenge: "Coding Challenge",
      date: "2 Days Ago",
    },
    {
      type: "Reward",
      amount: "+₹75",
      challenge: "Workout Challenge",
      date: "Last Week",
    },
  ];

  return (
    <Layout>
      {/* Hero */}
      <div
        style={{
          marginBottom: "36px",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            marginBottom: "10px",
          }}
        >
          Wallet 💳
        </h1>

        <p
          style={{
            color: "#9CA3AF",
            fontSize: "18px",
          }}
        >
          Your progress tells a story.

Keep writing it.
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            background: "#111827",
            border:
              "1px solid #1F2937",
            borderRadius: "20px",
            padding: "24px",
          }}
        >
          <p
            style={{
              color: "#9CA3AF",
            }}
          >
            Available Balance
          </p>

          <h2
            style={{
              marginTop: "10px",
            }}
          >
            ₹500
          </h2>
        </div>

        <div
          style={{
            background: "#111827",
            border:
              "1px solid #1F2937",
            borderRadius: "20px",
            padding: "24px",
          }}
        >
          <p
            style={{
              color: "#9CA3AF",
            }}
          >
            Total Rewards
          </p>

          <h2
            style={{
              marginTop: "10px",
            }}
          >
            ₹125
          </h2>
        </div>

        <div
          style={{
            background: "#111827",
            border:
              "1px solid #1F2937",
            borderRadius: "20px",
            padding: "24px",
          }}
        >
          <p
            style={{
              color: "#9CA3AF",
            }}
          >
            Active Stakes
          </p>

          <h2
            style={{
              marginTop: "10px",
            }}
          >
            ₹300
          </h2>
        </div>
      </div>

      {/* Transaction History */}
      <div
        style={{
          background: "#111827",
          border:
            "1px solid #1F2937",
          borderRadius: "20px",
          padding: "24px",
        }}
      >
        <h2
          style={{
            marginBottom: "20px",
          }}
        >
          Transaction History
        </h2>

        {transactions.map(
          (transaction, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                padding:
                  "16px 0",
                borderBottom:
                  index !==
                  transactions.length -
                    1
                    ? "1px solid #1F2937"
                    : "none",
              }}
            >
              <div>
                <h4>
                  {
                    transaction.challenge
                  }
                </h4>

                <p
                  style={{
                    color:
                      "#9CA3AF",
                  }}
                >
                  {
                    transaction.date
                  }
                </p>
              </div>

              <div
                style={{
                  color:
                    transaction.type ===
                    "Reward"
                      ? "#22C55E"
                      : "#EF4444",
                  fontWeight:
                    700,
                }}
              >
                {
                  transaction.amount
                }
              </div>
            </div>
          )
        )}
      </div>
    </Layout>
  );
}