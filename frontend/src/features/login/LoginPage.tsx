import { Header } from "@/components/login/Header";
import { Footer } from "@/components/login/Footer";
import { Logo } from "@/components/utility/Logo";
import { LoginForm } from "@/components/login/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-200">
      <Header />

      <main className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h2 className="text-center text-2xl font-bold text-gray-800 mb-6">
            Corporate Login
          </h2>
          <LoginForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
