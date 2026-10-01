import { type FC, type ReactNode, useState, useEffect } from 'react';
import { cx } from '../ui/cx';

type LayoutProps = {
  children: ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
};

const Layout: FC<LayoutProps> = ({ children, activeView, onNavigate }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check local storage or system preference on mount
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-200 font-sans selection:bg-primary/30 selection:text-primary">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-card-dark/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <button 
                onClick={() => onNavigate('home')}
                className="flex items-center gap-2 transition hover:opacity-80"
              >
                <img
                  src="/brand/turfai-mark-v5.png"
                  alt=""
                  className="h-9 w-9 object-contain drop-shadow-[0_4px_8px_rgba(17,82,212,0.25)]"
                />
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">TurfAI</span>
              </button>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-1">
                {[
                  { id: 'home', label: 'Home' },
                  { id: 'fixtures', label: 'Race Card' },
                  { id: 'results', label: 'Results' },
                ].map((link) => (
                  <button
                    key={link.id}
                    onClick={() => onNavigate(link.id)}
                    className={cx(
                      'rounded-lg px-3 py-2 text-sm font-bold transition',
                      activeView === link.id
                        ? 'bg-slate-100 dark:bg-slate-800 text-primary dark:text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-primary dark:hover:text-white'
                    )}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsDark(!isDark)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <span className="material-symbols-outlined">light_mode</span>
                ) : (
                  <span className="material-symbols-outlined">dark_mode</span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((open) => !open)}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={isMenuOpen}
                  aria-controls="mobile-navigation"
                >
                  <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div id="mobile-navigation" className="md:hidden border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-card-dark">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-1">
                {[
                  { id: 'home', label: 'Home' },
                  { id: 'fixtures', label: 'Race Card' },
                  { id: 'results', label: 'Results' },
                ].map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => {
                      onNavigate(link.id);
                      setIsMenuOpen(false);
                    }}
                    className={cx(
                      'w-full rounded-lg px-3 py-3 text-left text-sm font-bold transition',
                      activeView === link.id
                        ? 'bg-slate-100 text-primary dark:bg-slate-800 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                    )}
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="/brand/turfai-mark-v5.png"
                  alt=""
                  className="h-9 w-9 object-contain"
                />
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">TurfAI</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
                Advanced AI-powered horse racing predictions for UK and Irish racing. 
                Leveraging historical data and machine learning to provide accurate insights.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Platform</h3>
              <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <li><button onClick={() => onNavigate('fixtures')} className="hover:text-primary transition">Race Card</button></li>
                <li><button onClick={() => onNavigate('results')} className="hover:text-primary transition">Results</button></li>
                <li>
                  <button 
                    onClick={() => {
                      onNavigate('home');
                      setTimeout(() => {
                        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="hover:text-primary transition"
                  >
                    How It Works
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Legal & Support</h3>
              <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <li><button onClick={() => onNavigate('terms')} className="hover:text-primary transition">Terms of Service</button></li>
                <li><button onClick={() => onNavigate('privacy')} className="hover:text-primary transition">Privacy Policy</button></li>
                <li><a href="#" className="hover:text-primary transition">Contact Us</a></li>
                <li><a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">Gamble Aware</a></li>
              </ul>
            </div>
          </div>
          
          {/* Compliance & Responsible Gambling */}
          <div className="border-t border-slate-200 dark:border-slate-800 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                <div className="h-10 w-10 flex items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-black text-sm" title="Over 18s only">
                  18+
                </div>
                <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="group flex flex-col">
                  <span className="text-slate-700 dark:text-slate-300 font-black text-lg leading-none group-hover:text-primary transition">BeGambleAware</span>
                  <span className="text-slate-400 text-[10px] tracking-widest uppercase">.org</span>
                </a>
                <a href="https://www.gamstop.co.uk" target="_blank" rel="noopener noreferrer" className="group flex flex-col">
                  <span className="text-slate-700 dark:text-slate-300 font-black text-lg leading-none group-hover:text-primary transition">GAMSTOP</span>
                  <span className="text-slate-400 text-[10px] tracking-widest uppercase">Self Exclusion</span>
                </a>
              </div>
              <div className="text-center md:text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Play Responsibly</p>
                <p className="text-xs text-slate-400 max-w-md">
                  Gambling involves risk. Please gamble responsibly and only bet what you can afford to lose.
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-500">
              &copy; 2026 TurfAI Ltd. All rights reserved.
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">* Accuracy metric:</span> Strike Rate Today and 7-Day Accuracy count a race as successful when at least one tracked outcome is matched, such as Each Way, Forecast, Tricast, or Win Single. They do not mean the predicted winner finished first in every race. “1st Place Winners” counts only exact predicted-winner/actual-winner matches.
            </p>
          </div>
          
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-3">
            <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">warning</span>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Disclaimer: Information provided by TurfAI (including analysis, predictions, market data, and content) is for informational and educational purposes only and may be delayed, cached, or inaccurate. It does not constitute financial advice, betting advice, or an endorsement to place wagers. All decisions and actions you take are solely your responsibility. Verify details independently with official sources and bookmakers. Betting involves risk; only wager what you can afford to lose and use this platform at your own risk.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
