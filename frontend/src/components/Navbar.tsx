import {
  Link,
  useLocation,
} from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    {
      label: "Overview",
      path: "/dashboard",
    },
    {
      label: "Challenges",
      path: "/challenges",
    },
    {
      label: "Journey",
      path: "/my-challenges",
    },
    {
      label: "Insights",
      path: "/wallet",
    },
    {
      label: "Community",
      path: "/leaderboard",
    },
  ];

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
        backdropFilter: "blur(24px)",
        background:
          "rgba(5,8,22,0.82)",
        borderBottom:
          "1px solid rgba(255,255,255,0.04)",
        padding: "20px 48px",
      }}
    >
      <div
        style={{
          maxWidth: "1700px",
          margin: "0 auto",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
        }}
      >
        {/* LEFT */}
        <div
          style={{
            minWidth: "340px",
          }}
        >
          <h1
            style={{
              fontSize: "58px",
              fontWeight: 900,
              letterSpacing: "-3px",
              lineHeight: 1,
              margin: 0,

              background:
                "linear-gradient(135deg,#72F1B8,#4ADE80,#5EEAD4)",

              WebkitBackgroundClip:
                "text",

              WebkitTextFillColor:
                "transparent",

              textShadow:
                "0 0 25px rgba(114,241,184,0.15)",
            }}
          >
            uCommit
          </h1>

          <p
            style={{
              color: "#64748B",
              marginTop: "6px",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            The ultimate accountability partner.
          </p>
        </div>

        {/* CENTER */}
        <div
          style={{
            display: "flex",
            gap: "28px",
          }}
        >
          {navItems.map(
            (item) => {
              const active =
                location.pathname ===
                item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    textDecoration:
                      "none",

                    color: active
                      ? "#F8FAFC"
                      : "#94A3B8",

                    fontWeight:
                      active
                        ? 600
                        : 500,

                    fontSize: "15px",

                    padding:
                      "10px 16px",

                    borderRadius:
                      "12px",

                    background:
                      active
                        ? "rgba(255,255,255,0.05)"
                        : "transparent",

                    border: active
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "1px solid transparent",

                    transition:
                      "all 0.25s ease",
                  }}
                >
                  {item.label}
                </Link>
              );
            }
          )}
        </div>

        {/* RIGHT */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              padding:
                "10px 16px",
              borderRadius:
                "999px",

              background:
                "rgba(255,255,255,0.03)",

              border:
                "1px solid rgba(255,255,255,0.05)",

              color: "#CBD5E1",

              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            18 day streak
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",

              padding:
                "10px 14px",

              borderRadius:
                "16px",

              background:
                "rgba(255,255,255,0.03)",

              border:
                "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",

                borderRadius:
                  "50%",

                background:
                  "linear-gradient(135deg,#72F1B8,#5EEAD4)",

                display: "flex",

                justifyContent:
                  "center",

                alignItems:
                  "center",

                color: "#081018",

                fontWeight: 800,
              }}
            >
              K
            </div>

            <div>
              <div
                style={{
                  color:
                    "#F8FAFC",
                  fontWeight:
                    600,
                  fontSize:
                    "14px",
                }}
              >
                Keerthi
              </div>

              <div
                style={{
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                }}
              >
                Building consistency
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}