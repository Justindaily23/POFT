import { Logo } from "../../components/utility/Logo";

export function Header() {
  return (
    <header className="flex items-center px-6 py-4 shadow bg-white">
      {/* Logo aligned left, slightly away from edge */}
      <Logo size="md" className="ml-2" />
    </header>
  );
}
