export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // #region agent log
  fetch("http://127.0.0.1:7372/ingest/b5d4eb1c-b11c-4de9-b817-328c9c6effff", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "7d9a43",
    },
    body: JSON.stringify({
      sessionId: "7d9a43",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "app/layout.tsx:RootLayout",
      message: "Root layout render",
      data: { hasHtmlBodyTags: false, returnsChildrenOnly: true },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return children;
}
