import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "Sign in — A-Group" };

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-header px-4 py-10 text-header-ink">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="text-center">
          <Logo className="mx-auto h-14 w-auto" />
          <h1 className="mt-5 font-head text-2xl font-bold">A-Group</h1>
          <p className="mt-1 text-sm text-header-ink/70">Subscription &amp; Financial Dashboard</p>
          <div className="mx-auto mt-3 h-[3px] w-12 bg-accent" aria-hidden="true" />
        </div>
        <SignIn
          appearance={{
            variables: { colorPrimary: "#f05e49", borderRadius: "4px", fontFamily: "var(--font-hanken), system-ui, sans-serif" },
          }}
        />
        <p className="text-center text-sm text-header-ink/80">
          New here?{" "}
          <Link href="/sign-up" className="font-semibold text-accent underline underline-offset-4 hover:text-white">
            Create an account
          </Link>
        </p>
        <p className="text-center text-xs text-header-ink/50">Demo environment · fictional data</p>
      </div>
    </main>
  );
}
