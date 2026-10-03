export async function enableMocking() {
  const isEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW !== "false";
  if (!isEnabled) return;

  const { worker } = await import("./browser");
  await worker.start({
    onUnhandledRequest: "bypass",
  });
}
