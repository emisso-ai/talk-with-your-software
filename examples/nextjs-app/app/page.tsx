import { TalkWidget } from "@emisso/talk-react";

export default function Home() {
  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>
        My App
      </h1>
      <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
        This is a demo application with the Talk with your Software widget.
        Click the chat bubble in the bottom-right corner to ask questions about
        the codebase.
      </p>

      <div style={{ marginTop: "2rem", padding: "1.5rem", background: "#f9fafb", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Try asking:
        </h2>
        <ul style={{ color: "#374151", lineHeight: 2 }}>
          <li>&quot;How does the code navigation work?&quot;</li>
          <li>&quot;What does the query classifier do?&quot;</li>
          <li>&quot;Show me the main orchestrator function&quot;</li>
          <li>&quot;How are skills written to the sandbox?&quot;</li>
        </ul>
      </div>

      <TalkWidget
        endpoint="/api/talk"
        appName="My App"
        position="bottom-right"
        primaryColor="#10b981"
        greeting="Ask me anything about this codebase!"
        placeholder="How does the billing system work?"
      />
    </main>
  );
}
