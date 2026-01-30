export default function Footer() {
  return (
    <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500">
      <p>© 2026 POFT Platform. All rights reserved.</p>
      <div className="mt-2 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
        <button className="hover:text-gray-700 transition-colors">
          Privacy Policy
        </button>
        <span className="hidden sm:inline">•</span>
        <button className="hover:text-gray-700 transition-colors">
          Terms of Service
        </button>
      </div>
    </div>
  );
}
