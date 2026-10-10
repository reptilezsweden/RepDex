import { getDict } from "@/lib/session";
import { sendReset } from "../auth-actions";
import { AuthForm } from "../auth-form";

export default async function ForgotPage() {
  const { t } = await getDict();
  return <AuthForm mode="forgot" t={t} action={sendReset} />;
}
