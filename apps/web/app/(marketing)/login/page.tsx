import { AuthLayout } from "../../../components/AuthLayout";
import { StudentAuthForm } from "../../../features/live/AuthForms";
export default function LoginPage() { return <AuthLayout mode="login"><StudentAuthForm mode="login" /></AuthLayout>; }
