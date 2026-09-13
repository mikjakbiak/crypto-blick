"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import GiftCard from "@/components/gift-card";

type LandingPageProps = {
  initialCode?: string;
};

const STEPS = [
  {
    n: "01",
    title: "Get a link",
    body: "Someone sends you a gift link, a username, or (soon) a phone number. You do not need to know what a wallet address is.",
  },
  {
    n: "02",
    title: "Sign in with email",
    body: "Sign in with email. We set up a wallet you control. No seed phrase to write down to get started.",
  },
  {
    n: "03",
    title: "Pick a free username",
    body: "You pick a free username. Friends send to john, not a long address.",
  },
  {
    n: "04",
    title: "Claim, add cash, spend",
    body: "The gift lands in your account. Add more cash, spend with a card, send the next gift by name.",
  },
] as const;

const IDENTITY = [
  {
    label: "You type",
    value: "john",
    note: "Your username. Friends can send money straight to it.",
  },
  {
    label: "Or",
    value: "john.eth",
    note: "A full name works too, if that is how you already go by.",
  },
  {
    label: "Or a phone",
    value: "+1 …",
    note: "Soon you will pay friends by phone number, the way you already do in other money apps.",
    comingSoon: true,
  },
] as const;

export default function LandingPage({ initialCode }: LandingPageProps) {
  const { login } = usePrivy();

  useEffect(() => {
    if (!initialCode) return;
    document.getElementById("claim")?.scrollIntoView({ block: "center" });
  }, [initialCode]);

  return (
    <div className="landing relative flex flex-1 flex-col overflow-x-hidden">
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
          </nav>
          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </header>

      <main id="top" className="relative">
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-20">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-800 dark:text-teal-300">
              A simpler crypto wallet
            </p>
            <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.12] tracking-tight text-teal-950 sm:text-5xl lg:text-[3.35rem] dark:text-teal-50">
              Send money the way you already send messages.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8 dark:text-zinc-400">
              Share a gift link. Sign in with email. Pick a free username. You
              can add money and spend it in the same app.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
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
              <a
                href="#claim"
                className="inline-flex min-h-12 items-center px-2 text-sm font-medium text-teal-800 underline-offset-4 hover:underline dark:text-teal-300"
              >
                I have a gift code
              </a>
            </div>
          </div>

          <div id="claim">
            <div className="rounded-[1.75rem] border border-teal-950/10 bg-white/90 p-5 shadow-[0_28px_70px_-32px_rgba(15,118,110,0.5)] backdrop-blur-sm sm:p-7 dark:border-teal-400/15 dark:bg-zinc-950/85 dark:shadow-[0_28px_70px_-32px_rgba(0,0,0,0.8)]">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
                Claim in minutes
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Have a gift? Open it here.
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Paste the code or the gift link. Sign in if you are new. You
                choose your username next, during signup, not on this form.
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
              Built for someone new to crypto: sign in first, pick a username,
              then add and spend money without leaving the app.
            </p>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-2">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="flex h-full flex-col rounded-3xl border border-teal-950/8 bg-white/70 p-6 dark:border-white/8 dark:bg-white/4"
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

        <section id="gifts" className="relative py-16 sm:py-24">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-stretch">
            <div className="flex flex-col justify-center">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-800 dark:text-teal-300">
                Gifts
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-teal-950 sm:text-4xl dark:text-teal-50">
                Send money as a link anyone can open.
              </h2>
              <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">
                You pick an amount and get a link. Send it in a chat, like any
                other message. Your friend opens it, signs in, and the money is
                theirs. Next time you can send straight to their username.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-4">
              <article className="rounded-3xl border border-teal-950/10 bg-white p-6 shadow-[0_20px_50px_-28px_rgba(15,118,110,0.45)] dark:border-white/10 dark:bg-zinc-950">
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Sender</p>
                <p className="mt-3 font-display text-xl text-zinc-900 dark:text-zinc-50">
                  Pick an amount. Get a link. Send it in a message.
                </p>
              </article>
              <article className="rounded-3xl border border-teal-900/15 bg-teal-950 p-6 text-teal-50 shadow-[0_20px_50px_-28px_rgba(15,118,110,0.55)]">
                <p className="text-xs uppercase tracking-[0.16em] text-teal-300/80">You</p>
                <p className="mt-3 font-display text-xl">
                  Open the link, sign in, and the money is in your account.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="hidden mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-teal-800 dark:text-teal-300">
              Identity
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-teal-950 sm:text-4xl dark:text-teal-50">
              People have names. So do you.
            </h2>
            <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Everyone gets a free username at signup. Friends can send to john,
              or to a name like john.eth.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {IDENTITY.map((row) => (
              <div
                key={row.label}
                className="relative flex h-full flex-col rounded-3xl border border-teal-950/8 bg-white/70 p-5 dark:border-white/8 dark:bg-white/4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">
                    {row.label}
                  </p>
                  {"comingSoon" in row && row.comingSoon ? (
                    <span className="shrink-0 rounded-full bg-teal-900/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-teal-800 dark:bg-teal-300/15 dark:text-teal-200">
                      Coming Soon
                    </span>
                  ) : null}
                </div>
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
                Add cash. Spend it. Same place as your balance.
              </h2>
              <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">
                After the first gift, you are not stuck. Add money the way you
                already pay for things. A spending card sits next to your
                balance, so what you receive is easy to use.
              </p>
            </div>
            <div className="grid gap-4">
              <article className="rounded-3xl border border-teal-950/8 bg-white/80 p-6 dark:border-white/8 dark:bg-white/4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Onramp
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  Add money from your bank or card without leaving the app.
                </p>
              </article>
              <article className="rounded-3xl border border-teal-950/8 bg-white/80 p-6 dark:border-white/8 dark:bg-white/4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Spending card
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  A card lives next to your balance, so you can spend what you
                  received.
                </p>
              </article>
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
                Sign in with email, pick a username, and you are ready.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
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
          <p>Crypto Blick. Send by name, link, or phone.</p>
          <p>Value moves on Ethereum. You never have to say that first.</p>
        </div>
      </footer>
    </div>
  );
}
