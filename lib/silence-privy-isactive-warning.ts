function isPrivyIsActiveNoise(args: unknown[]) {
  const strings = args.filter((arg): arg is string => typeof arg === "string");
  const text = strings.join(" ");
  if (strings.includes("isActive") && text.includes("does not recognize the")) {
    return true;
  }
  return (
    text.includes("React does not recognize the `isActive` prop") ||
    /unknown prop ["'`]isActive["'`]/.test(text)
  );
}

let patched = false;

export function silencePrivyIsActiveWarning() {
  if (patched || typeof globalThis.console === "undefined") return;
  patched = true;

  const error = console.error.bind(console);
  const warn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    if (isPrivyIsActiveNoise(args)) return;
    error(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (isPrivyIsActiveNoise(args)) return;
    warn(...args);
  };
}

silencePrivyIsActiveWarning();
