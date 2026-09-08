import AuthButton from "@/components/auth-button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-6 text-center sm:items-start sm:text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Crypto Blick
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Sign in with Privy to continue.
        </p>
        <AuthButton />
      </main>
    </div>
  );
}
