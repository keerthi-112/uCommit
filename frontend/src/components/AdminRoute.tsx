import {
  useEffect,
  useState,
} from "react";
import { Navigate } from "react-router-dom";

import api from "../services/api";

interface Props {
  children: React.ReactNode;
}

/**
 * Only lets admins through. The check is a convenience for the UI -
 * the backend enforces the same rule on every admin endpoint, so a
 * user who edits their way past this still cannot read anything.
 */
export default function AdminRoute({
  children,
}: Props) {
  const [state, setState] = useState<
    "checking" | "allowed" | "denied"
  >("checking");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me")
      .then((res) => {
        if (cancelled) return;

        setState(
          res.data.user?.role === "ADMIN"
            ? "allowed"
            : "denied"
        );
      })
      .catch(() => {
        if (!cancelled)
          setState("denied");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          color: "#94A3B8",
          fontSize: "18px",
        }}
      >
        Checking access...
      </div>
    );
  }

  if (state === "denied") {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <>{children}</>;
}
