import { getDict } from "@/lib/session";
import { signIn } from "../auth-actions";
import { AuthForm } from "../auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { t } = await getDict();
  const { error } = await searchParams;
  return <AuthForm mode="login" t={t} action={signIn} initialError={error ? t.errorGeneric : undefined} />;
}
