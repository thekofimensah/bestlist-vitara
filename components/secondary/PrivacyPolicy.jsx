import React from 'react';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-stone-50 z-20 pt-8 pb-4" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="px-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Privacy Policy</h2>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-20 px-4 pb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-gray-600 mb-6">Last Updated: August 2, 2025</p>
            
            <p className="text-sm text-gray-700 mb-4">
              Welcome to curate ("we," "our," "us"). We respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application, related websites, and any associated services (collectively, the "Services"). By accessing or using the Services, you agree to the practices described below.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Information We Collect</h3>
            
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left">Category</th>
                    <th className="border border-gray-200 p-2 text-left">Examples</th>
                    <th className="border border-gray-200 p-2 text-left">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 p-2">Account Information</td>
                    <td className="border border-gray-200 p-2">Name, email address, password, avatar</td>
                    <td className="border border-gray-200 p-2">Create and manage your account</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 p-2">Content You Provide</td>
                    <td className="border border-gray-200 p-2">Photos of food/products, captions, comments, likes, tags</td>
                    <td className="border border-gray-200 p-2">Enable core features (save, share, and organize items)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 p-2">Device & Usage Data</td>
                    <td className="border border-gray-200 p-2">IP address, device identifiers, OS version, crash logs</td>
                    <td className="border border-gray-200 p-2">App functionality, security, diagnostics, and analytics</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 p-2">Location Data</td>
                    <td className="border border-gray-200 p-2">GPS, Wi-Fi, cell-tower signals (with permission)</td>
                    <td className="border border-gray-200 p-2">Show nearby items, tailor content, prevent fraud</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 p-2">Transactional Data</td>
                    <td className="border border-gray-200 p-2">In-app purchases, subscription status (if any)</td>
                    <td className="border border-gray-200 p-2">Process payments, provide customer support</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 p-2">Cookies & Similar Tech</td>
                    <td className="border border-gray-200 p-2">SDK cookies, local storage, pixels</td>
                    <td className="border border-gray-200 p-2">Remember preferences, measure engagement</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              <strong>Children:</strong> We do not knowingly collect data from children under 13 (or the minimum digital-consent age in your region). If we discover we have done so, we will delete it.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">2. How We Use Your Information</h3>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 mb-4">
              <li>Provide, operate, and maintain the Services</li>
              <li>Personalize and improve your experience</li>
              <li>Send updates, security alerts, and support messages</li>
              <li>Process transactions and verify payment information</li>
              <li>Monitor and analyze trends and usage</li>
              <li>Detect, prevent, and address fraud or security incidents</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
            </ol>

            <p className="text-sm text-gray-700 mb-4">
              <strong>Legal Bases (GDPR):</strong> We process personal data only when we have a lawful basis: consent, contract performance, legal obligation, legitimate interests, vital interests, or public-interest tasks.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Sharing & Disclosure</h3>
            <p className="text-sm text-gray-700 mb-3">
              We never sell your personal information. We may share it with:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
              <li><strong>Service Providers</strong> — hosting, analytics, payment processors</li>
              <li><strong>Legal & Safety</strong> — to comply with law or protect rights, property, or safety</li>
              <li><strong>Business Transfers</strong> — in mergers, acquisitions, or asset sales</li>
              <li><strong>With Your Consent</strong> — when you choose to share content publicly</li>
            </ul>
            <p className="text-sm text-gray-700 mb-4">
              We may also share aggregated or de-identified data that cannot reasonably identify you.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">4. International Transfers</h3>
            <p className="text-sm text-gray-700 mb-4">
              Your data may be processed in countries other than your own. When transferring personal data outside the EEA, UK, or similar regions, we rely on Standard Contractual Clauses or equivalent safeguards.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Your Rights & Choices</h3>
            <p className="text-sm text-gray-700 mb-3">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
              <li>Access, correct, or delete personal data</li>
              <li>Withdraw consent at any time</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p className="text-sm text-gray-700 mb-4">
              Exercise these rights via in-app settings or by contacting us (Section 11).
            </p>

            <p className="text-sm text-gray-700 mb-4">
              <strong>Marketing Emails:</strong> You can unsubscribe at any time via the link in each marketing email. Transactional or legal notices are still sent as needed.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Data Retention</h3>
            <p className="text-sm text-gray-700 mb-4">
              We retain personal data only as long as necessary for the purposes stated or as required by law, then delete or anonymize it.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">7. Security</h3>
            <p className="text-sm text-gray-700 mb-4">
              We employ administrative, technical, and physical safeguards—encryption in transit and at rest, access controls, periodic security audits—to protect your data. No method is 100% secure, but we strive for industry-standard protection.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">8. Third-Party Services</h3>
            <p className="text-sm text-gray-700 mb-4">
              Our Services may link to or integrate third-party platforms (e.g., social media, mapping). Their privacy practices are governed by their own policies, not ours.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">9. Children's Privacy</h3>
            <p className="text-sm text-gray-700 mb-4">
              The Services are not directed to children under 13. If you believe a child has provided personal data without parental consent, contact us immediately.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to This Policy</h3>
            <p className="text-sm text-gray-700 mb-4">
              We may update this Privacy Policy periodically. Material changes will be announced via the app or email, and the "Last Updated" date will change accordingly.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">11. Contact Us</h3>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Attn:</strong> Privacy Team curate
              </p>
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> privacy@curate.com
              </p>
            </div>

            <hr className="my-6 border-gray-200" />

            <p className="text-sm text-gray-600 text-center">End of Privacy Policy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 