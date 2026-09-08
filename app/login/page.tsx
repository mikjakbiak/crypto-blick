import LoginPrompt from "@/components/login-prompt";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign in with Privy
        </h1>
        <div className="mt-5">
          <LoginPrompt title="Create an embedded wallet to continue." />
        </div>
      </main>
    </div>
  );
}
