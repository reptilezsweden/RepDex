import { getDict } from "@/lib/session";
import { updatePassword } from "../auth-actions";
import { AuthForm } from "../auth-form";

export default async function ResetPage() {
  const { t } = await getDict();
  return <AuthForm mode="reset" t={t} action={updatePassword} />;
}
