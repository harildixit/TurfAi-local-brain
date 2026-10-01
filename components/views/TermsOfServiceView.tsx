import type { FC } from 'react';

const TermsOfServiceView: FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Terms of Service</h1>
        
        <div className="space-y-6 text-slate-600 dark:text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using TurfAI ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
              If you do not agree to abide by these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. Description of Service</h2>
            <p>
              TurfAI provides AI-powered horse racing predictions and analytics for informational purposes only. 
              We do not guarantee the accuracy of any predictions, and past performance is not indicative of future results.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. No Gambling Advice</h2>
            <p>
              The Service is strictly for informational and entertainment purposes. We are not a gambling operator and do not accept bets. 
              Any betting activity you engage in is at your own risk. Please gamble responsibly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the Service, including but not limited to our AI models, data analysis, 
              and design, are the exclusive property of TurfAI and are protected by copyright and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5. Disclaimer of Warranties</h2>
            <p>
              The Service is provided on an "as is" and "as available" basis. We expressly disclaim all warranties of any kind, 
              whether express or implied, including but not limited to the implied warranties of merchantability and fitness for a particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6. Limitation of Liability</h2>
            <p>
              TurfAI shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, 
              including but not limited to damages for loss of profits, goodwill, use, data, or other intangible losses resulting from the use of the Service.
            </p>
          </section>
          
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 mt-8">
            <p className="text-sm">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServiceView;
