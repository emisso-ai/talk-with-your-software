import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Talk with your Software — Demo",
  description: "Ask questions about your codebase powered by Claude Code",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
