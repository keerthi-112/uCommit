import type { ReactNode } from "react";

import Navbar from "./Navbar";
import { colour } from "../theme";

interface LayoutProps {
  children: ReactNode;
}

/**
 * The application shell.
 *
 * Previously this painted three stacked radial gradients plus two fixed
 * blurred light blooms. On a dark ground that mostly added noise behind
 * the content. A flat surface lets the cards and the accent do the
 * separating.
 */
export default function Layout({
  children,
}: LayoutProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: colour.bg,
        color: colour.text,
      }}
    >
      <Navbar />

      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
