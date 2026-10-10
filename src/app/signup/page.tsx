import { getDict } from "@/lib/session";
import { signUp } from "../auth-actions";
import { AuthForm } from "../auth-form";

export default async function SignupPage() {
  const { t } = await getDict();
  return <AuthForm mode="signup" t={t} action={signUp} />;
}
