import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import api from "../services/api";
import { browserTimezone } from "../services/auth";
import Logo from "./Logo";
import {
  colour,
  space,
  radius,
  font,
  weight,
  money,
} from "../theme";

interface CurrentUser {
  name: string;
  email: string;
  role: string;
  timezone?: string;
  wallet: {
    balance: number;
  } | null;
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] =
    useState<CurrentUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me")
      .then((res) => {
        if (cancelled) return;

        setUser(res.data.user);

        // Keep the stored zone in step with where they actually are,
        // so day boundaries follow the user rather than their signup.
        const here = browserTimezone();

        if (
          here &&
          res.data.user?.timezone !== here
        ) {
          api
            .put("/auth/timezone", {
              timezone: here,
            })
            .catch(() => {
              // Not worth interrupting anyone over.
            });
        }
      })
      .catch(() => {
        // The page itself surfaces any real error.
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const initial = user?.name
    ? user.name
        .charAt(0)
        .toUpperCase()
    : "·";

  const navItems = [
    { label: "Overview", path: "/dashboard" },
    { label: "Challenges", path: "/challenges" },
    { label: "Journey", path: "/my-challenges" },
    { label: "Wallet", path: "/wallet" },
    { label: "Community", path: "/leaderboard" },

    ...(user?.role === "ADMIN"
      ? [
          {
            label: "Review",
            path: "/admin/review",
          },
        ]
      : []),
  ];

  const signOut = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(10,14,22,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${colour.border}`,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: `0 ${space["2xl"]}`,
          height: "56px",
          display: "flex",
          alignItems: "center",
          gap: space.xl,
        }}
      >
        {/* Mark plus wordmark. One weight, one colour. */}
        <Link
          to="/dashboard"
          style={{
            textDecoration: "none",
            whiteSpace: "nowrap",
            display: "inline-flex",
          }}
        >
          <Logo size={20} markSize={20} />
        </Link>

        <div
          className="nav-links"
          style={{
            display: "flex",
            gap: space.xs,
            flex: 1,
          }}
        >
          {navItems.map((item) => {
            const active =
              location.pathname ===
              item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: `6px ${space.md}`,
                  borderRadius: radius.sm,
                  fontSize: font.small,
                  fontWeight: active
                    ? weight.medium
                    : weight.regular,
                  color: active
                    ? colour.text
                    : colour.textMuted,
                  background: active
                    ? colour.surfaceRaised
                    : "transparent",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space.md,
          }}
        >
          {user?.wallet && (
            <span
              style={{
                fontSize: font.small,
                color: colour.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {money(
                user.wallet.balance
              )}
            </span>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: space.sm,
            }}
          >
            <span
              style={{
                width: "26px",
                height: "26px",
                borderRadius: radius.pill,
                background:
                  colour.surfaceRaised,
                border: `1px solid ${colour.border}`,
                color: colour.textMuted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: font.tiny,
                fontWeight: weight.semibold,
              }}
            >
              {initial}
            </span>

            <span
              className="nav-identity-text"
              style={{
                fontSize: font.small,
                color: colour.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {user?.name ?? ""}
            </span>
          </div>

          <button
            onClick={signOut}
            style={{
              background: "transparent",
              border: "none",
              color: colour.textFaint,
              fontSize: font.small,
              cursor: "pointer",
              padding: `4px ${space.sm}`,
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
