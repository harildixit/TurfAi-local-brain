import type { FC } from 'react';

const PrivacyPolicyView: FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-card-dark rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-slate-600 dark:text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Information Collection</h2>
            <p>
              We collect information you provide directly to us when using TurfAI, as well as data automatically collected 
              through your interaction with our service, such as usage data and device information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. Use of Information</h2>
            <p>
              We use the collected information to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide, maintain, and improve our services</li>
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Communicate with you about updates and relevant information</li>
              <li>Detect and prevent fraudulent or unauthorized activity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. Data Storage and Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data against unauthorized 
              access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">4. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our service and hold certain information. 
              You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">5. Third-Party Services</h2>
            <p>
              We may employ third-party companies and individuals to facilitate our service ("Service Providers"), to provide the Service on our behalf, 
              or to assist us in analyzing how our Service is used. These third parties have access to your personal data only to perform these tasks.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">6. Changes to This Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
              You are advised to review this Privacy Policy periodically for any changes.
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

export default PrivacyPolicyView;
