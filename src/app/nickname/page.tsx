import { getDict } from "@/lib/session";
import { setNickname } from "../auth-actions";
import { AuthForm } from "../auth-form";

/** Required step for accounts without an in-game nickname. */
export default async function NicknamePage() {
  const { t } = await getDict();
  return <AuthForm mode="nickname" t={t} action={setNickname} />;
}
