export default function Home() {
  return (
    <iframe
      src="/index.html"
      sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms allow-downloads"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        border: "none",
      }}
    />
  );
}
