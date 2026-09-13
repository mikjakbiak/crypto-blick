"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import GiftCard from "@/components/gift-card";
import { dashboardPath } from "@/lib/paths";

type LandingPageProps = {
  initialCode?: string;
};

const STEPS = [
  {
    n: "01",
    title: "Get a link",
    body: "Someone sends you money the way they send a message — a gift code, a username, or a phone number. No wallet lecture.",
  },
  {
    n: "02",
    title: "Sign in with email",
    body: "Privy creates a self-custodial wallet for you. No seed phrase on the default path. You stay in control.",
  },
  {
    n: "03",
    title: "Pick a free username",
    body: "Every account gets a name on our ENS namespace. You become beeinger — not a string of hex.",
  },
  {
    n: "04",
    title: "Claim, add cash, spend",
    body: "Funds arrive to you. Add more with onramp. Spend with a card. Send the next gift by name.",
  },
] as const;

export default function LandingPage({ initialCode }: LandingPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        root.style.setProperty("--land-y", `${y}`);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    document.getElementById("claim")?.scrollIntoView({ block: "center" });
  }, [initialCode]);

  return (
    <div
      ref={rootRef}
      className="landing relative flex flex-1 flex-col overflow-x-hidden"
    >
      <div aria-hidden className="landing-wash pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="landing-orb landing-orb-a pointer-events-none"
      />
      <div
        aria-hidden
        className="landing-orb landing-orb-b pointer-events-none"
      />
      <div
        aria-hidden
        className="landing-orb landing-orb-c pointer-events-none"
      />

      <header className="sticky top-0 z-30 border-b border-teal-950/8 bg-[#f6f8f7]/80 backdrop-blur-md dark:border-white/8 dark:bg-[#0a0c0b]/80">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a
            href="#top"
            className="font-display text-lg font-semibold tracking-tight text-teal-950 dark:text-teal-100"
          >
            Crypto Blick
          </a>
          <nav className="hidden items-center gap-7 text-sm text-zinc-600 md:flex dark:text-zinc-400">
            <a href="#how" className="transition-colors hover:text-teal-900 dark:hover:text-teal-200">
              How it works
            </a>
            <a href="#gifts" className="transition-colors hover:text-teal-900 dark:hover:text-teal-200">
              Gifts
            </a>
            <a href="#money" className="transition-colors hover:text-teal-900 dark:hover:text-teal-200">
              Money
            </a>
            <a href="#send" className="transition-colors hover:text-teal-900 dark:hover:text-teal-200">
              Send
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LandingAuthButtons variant="header" />
          </div>
        </div>
      </header>

      <main id="top" className="relative">
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-20">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-800 dark:text-teal-300">
              Social crypto wallet
            </p>
            <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.12] tracking-tight text-teal-950 sm:text-5xl lg:text-[3.35rem] dark:text-teal-50">
              Send money the way you already send messages.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8 dark:text-zinc-400">
              Crypto Blick is for people who should not have to learn addresses
              to get paid. Share a gift link. Sign in with email. Choose a free
              username. Funds move on Ethereum — the app feels like a calm
              fintech.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <LandingAuthButtons variant="hero" />
              <a
                href="#claim"
                className="inline-flex min-h-12 items-center px-2 text-sm font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
              >
                I have a gift code
              </a>
            </div>
            <ul className="mt-10 grid gap-3 text-sm text-zinc-600 sm:grid-cols-3 dark:text-zinc-400">
              <li className="rounded-2xl border border-teal-950/8 bg-white/60 px-4 py-3 dark:border-white/8 dark:bg-white/4">
                No hex addresses on the default path
              </li>
              <li className="rounded-2xl border border-teal-950/8 bg-white/60 px-4 py-3 dark:border-white/8 dark:bg-white/4">
                Free username at signup
              </li>
              <li className="rounded-2xl border border-teal-950/8 bg-white/60 px-4 py-3 dark:border-white/8 dark:bg-white/4">
                Onramp and spending card, same home
              </li>
            </ul>
          </div>

          <div id="claim" className="landing-float">
            <div className="rounded-[1.75rem] border border-teal-950/10 bg-white/90 p-5 shadow-[0_28px_70px_-32px_rgba(15,118,110,0.5)] backdrop-blur-sm sm:p-7 dark:border-teal-400/15 dark:bg-zinc-950/85 dark:shadow-[0_28px_70px_-32px_rgba(0,0,0,0.8)]">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
                Claim in minutes
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Have a gift? Open it here.
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Paste the code or the gift link. Sign in if you are new. Your
                username comes next, at registration — not on this form.
              </p>
              <div className="mt-5">
                <GiftCard initialCode={initialCode} />
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-800 dark:text-teal-300">
              Simple on purpose
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-teal-950 sm:text-4xl dark:text-teal-50">
              Four steps. Then you are in.
            </h2>
            <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Built for someone new to crypto: login before jargon, a real
              username before the dashboard, money that can be added and spent
              without leaving the app.
            </p>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-2">
            {STEPS.map((step, index) => (
              <li
                key={step.n}
                className="landing-step rounded-3xl border border-teal-950/8 bg-white/70 p-6 dark:border-white/8 dark:bg-white/4"
                style={{ ["--step-i"]: String(index) } as CSSProperties}
              >
                <span className="font-display text-3xl font-semibold text-teal-800/70 dark:text-teal-300/70">
                  {step.n}
                </span>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section id="gifts" className="relative overflow-hidden py-16 sm:py-24">
          <div className="landing-panel mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div className="landing-shift">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-800 dark:text-teal-300">
                Gift mechanism
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-teal-950 sm:text-4xl dark:text-teal-50">
                A gift is money behind a shareable code.
              </h2>
              <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">
                The sender locks an amount and shares a link. You open it, prove
                you know the code, and the contract pays you. Amounts are not
                trusted to an app spreadsheet. ENS is your account name — it is
                not attached to the gift.
              </p>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                <li>On-chain commitment. Claim with a proof you know the code.</li>
                <li>When you claim, the sender is notified and you become a contact — by username.</li>
                <li>Growth loop: gift → claim → contact → send again.</li>
              </ul>
            </div>
            <div className="landing-card-stack">
              <article className="rounded-3xl border border-teal-950/10 bg-white p-6 shadow-[0_20px_50px_-28px_rgba(15,118,110,0.45)] dark:border-white/10 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Sender</p>
                <p className="mt-3 font-display text-xl text-zinc-900 dark:text-zinc-50">
                  Lock the gift. Share the link.
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Choose an amount. Get a code. Send it in chat like any other
                  message.
                </p>
              </article>
              <article className="mt-4 rounded-3xl border border-teal-900/15 bg-teal-950 p-6 text-teal-50 shadow-[0_20px_50px_-28px_rgba(15,118,110,0.55)]">
                <p className="text-xs uppercase tracking-[0.16em] text-teal-300/80">You</p>
                <p className="mt-3 font-display text-xl">
                  Open, name yourself, receive.
                </p>
                <p className="mt-2 text-sm leading-6 text-teal-100/80">
                  First payment in about two minutes — email, username, claim.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-800 dark:text-teal-300">
              Identity
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-teal-950 sm:text-4xl dark:text-teal-50">
              People have names. So do you.
            </h2>
            <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Signup always includes a free username on our ENS parent. Type
              beeinger and we resolve our namespace. Type a full ENS name and
              standard ENS still works. Hex still works for the people who want
              it — it is not the default story.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "You type",
                value: "beeinger",
                note: "Our username. Resolves to your subname.",
              },
              {
                label: "Or",
                value: "beeinger.eth",
                note: "Any dotted ENS name, resolved the usual way.",
              },
              {
                label: "Or a phone",
                value: "+48 …",
                note: "Pay contacts the way top fintechs already do.",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-3xl border border-teal-950/8 bg-white/70 p-5 dark:border-white/8 dark:bg-white/4"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                  {row.label}
                </p>
                <p className="mt-3 font-display text-2xl text-teal-950 dark:text-teal-100">
                  {row.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  {row.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="money" className="relative py-16 sm:py-24">
          <div className="mx-auto grid w-full max-w-6xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-800 dark:text-teal-300">
                Money in one place
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-teal-950 sm:text-4xl dark:text-teal-50">
                Add cash. Spend it. Same surface as your balance.
              </h2>
              <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">
                New to crypto does not mean stuck after the first gift. Onramp
                is right there — add funds with familiar rails. A spending card
                lives in the same money home, so value is not trapped behind a
                tutorial.
              </p>
            </div>
            <div className="grid gap-4">
              <article className="rounded-3xl border border-teal-950/8 bg-white/80 p-6 dark:border-white/8 dark:bg-white/4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Onramp
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  Immediate path from fiat into your wallet after signup. No
                  extra app. No “buy crypto first, then figure out the rest.”
                </p>
              </article>
              <article className="rounded-3xl border border-teal-950/8 bg-white/80 p-6 dark:border-white/8 dark:bg-white/4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Spending card
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  Card UI sits next to onramp and balances — one money area,
                  not three products.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="send" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="rounded-[2rem] border border-teal-950/8 bg-white/75 px-6 py-10 sm:px-12 sm:py-14 dark:border-white/8 dark:bg-white/4">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-800 dark:text-teal-300">
              Send like fintech
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-teal-950 sm:text-4xl dark:text-teal-50">
              Usernames, phone numbers, and gift links — not a clipboard of hex.
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Contacts search the way you already think: a name, a number, or
              an ENS. After a gift is claimed, both sides can send again without
              teaching anyone what a wallet is.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">For senders</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  Pay a friend without a lecture. Share a gift or send to their
                  username.
                </p>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">For first-timers</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  First payment arrives as a link. Username comes with signup.
                </p>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">For returning users</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  Balance, onramp, card, and pay-by-name in one dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-8 rounded-[2rem] bg-teal-950 px-6 py-10 text-teal-50 sm:flex-row sm:items-center sm:px-12 sm:py-14">
            <div className="max-w-lg">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Open an account. Or open a gift.
              </h2>
              <p className="mt-3 text-sm leading-7 text-teal-100/80 sm:text-base">
                Email in. Username chosen. Wallet ready. Ethereum underneath —
                calm on top.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <LandingAuthButtons variant="footer" />
              <a
                href="#claim"
                className="inline-flex min-h-12 items-center px-2 text-sm font-medium text-teal-200 underline-offset-4 hover:underline"
              >
                Claim a gift
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-teal-950/8 py-8 dark:border-white/8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Crypto Blick — send by name, link, or phone.</p>
          <p>Value moves on Ethereum. You never have to say that first.</p>
        </div>
      </footer>
    </div>
  );
}

const dashboardLinkClass = {
  header:
    "rounded-full bg-teal-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-400 dark:text-teal-950 dark:hover:bg-teal-300",
  hero: "inline-flex min-h-12 items-center rounded-full bg-teal-900 px-6 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-400 dark:text-teal-950 dark:hover:bg-teal-300",
  footer:
    "inline-flex min-h-12 items-center rounded-full bg-white px-6 text-sm font-medium text-teal-950 transition-colors hover:bg-teal-50",
} as const;

function LandingAuthButtons({ variant }: { variant: keyof typeof dashboardLinkClass }) {
  const { authenticated, login } = usePrivy();

  if (authenticated) {
    return (
      <Link href={dashboardPath()} className={dashboardLinkClass[variant]}>
        Go to dashboard
      </Link>
    );
  }

  if (variant === "header") {
    return (
      <>
        <button
          type="button"
          onClick={() => login({ disableSignup: true })}
          className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-teal-950/5 dark:text-zinc-200 dark:hover:bg-white/8"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => login()}
          className="rounded-full bg-teal-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-400 dark:text-teal-950 dark:hover:bg-teal-300"
        >
          Create account
        </button>
      </>
    );
  }

  if (variant === "hero") {
    return (
      <>
        <button
          type="button"
          onClick={() => login()}
          className="inline-flex min-h-12 items-center rounded-full bg-teal-900 px-6 text-sm font-medium text-white transition-colors hover:bg-teal-800 dark:bg-teal-400 dark:text-teal-950 dark:hover:bg-teal-300"
        >
          Create your free account
        </button>
        <button
          type="button"
          onClick={() => login({ disableSignup: true })}
          className="inline-flex min-h-12 items-center rounded-full border border-teal-950/12 px-6 text-sm font-medium text-teal-950 transition-colors hover:bg-white/70 dark:border-white/15 dark:text-teal-50 dark:hover:bg-white/5"
        >
          Log in
        </button>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => login()}
        className="inline-flex min-h-12 items-center rounded-full bg-white px-6 text-sm font-medium text-teal-950 transition-colors hover:bg-teal-50"
      >
        Create account
      </button>
      <button
        type="button"
        onClick={() => login({ disableSignup: true })}
        className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
      >
        Log in
      </button>
    </>
  );
}
