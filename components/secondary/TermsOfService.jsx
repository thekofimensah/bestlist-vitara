import React from 'react';
import { ArrowLeft } from 'lucide-react';

const TermsOfService = ({ onBack }) => {
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
          <h2 className="text-xl font-semibold text-gray-900">Terms of Service</h2>
          <div className="w-10" />
        </div>
      </div>

      <div className="pt-20 px-4 pb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-gray-600 mb-6">Effective Date: August 2, 2025</p>
            
            <p className="text-sm text-gray-700 mb-4">
              Welcome to curate ("we," "our," "us"). These Terms of Service ("Terms") govern your access to and use of the bestlist mobile application, website, and related services (collectively, the "Services"). PLEASE READ THESE TERMS CAREFULLY, AS THEY CONTAIN A BINDING ARBITRATION CLAUSE AND CLASS-ACTION WAIVER THAT AFFECT YOUR LEGAL RIGHTS.
            </p>

            <hr className="my-6 border-gray-200" />

            <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h3>
            <p className="text-sm text-gray-700 mb-4">
              By accessing or using the Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, do not use the Services.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Eligibility</h3>
            <p className="text-sm text-gray-700 mb-4">
              You must be at least 13 years of age (or older if required by your jurisdiction) and legally capable of forming a binding contract. If you are under 18, you may use the Services only with the consent of a parent or guardian.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Account Registration & Security</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-4">
              <li>You agree to provide accurate, current information and keep it updated.</li>
              <li>You are responsible for safeguarding your password and for all activities that occur under your account.</li>
              <li>Notify us immediately of any unauthorized use or security breach.</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">4. User Content</h3>
            <h4 className="text-base font-semibold text-gray-900 mb-2">4.1 Ownership & License</h4>
            <p className="text-sm text-gray-700 mb-3">
              You retain ownership of content (photos, comments, etc.) you post ("User Content"). By posting, you grant us a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, modify, adapt, publish, translate, distribute, display, and perform your User Content in connection with operating and improving the Services.
            </p>
            <h4 className="text-base font-semibold text-gray-900 mb-2">4.2 Your Responsibilities</h4>
            <p className="text-sm text-gray-700 mb-4">
              You represent and warrant that you have all rights necessary to grant the above license and that your User Content does not infringe any third-party rights or violate any law.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Prohibited Conduct</h3>
            <p className="text-sm text-gray-700 mb-3">You agree not to:</p>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 mb-4">
              <li>Post unlawful, harmful, or defamatory content</li>
              <li>Violate a third party's intellectual-property or privacy rights</li>
              <li>Upload viruses or malicious code</li>
              <li>Attempt to reverse-engineer or interfere with the Services</li>
              <li>Engage in automated data harvesting except through our documented APIs</li>
              <li>Use the Services for commercial purposes without authorization</li>
            </ol>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">6. Intellectual Property</h3>
            <p className="text-sm text-gray-700 mb-4">
              The Services, including all software, text, graphics, and trademarks (excluding User Content), are our intellectual property and licensed, not sold, to you.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">7. In-App Purchases & Subscriptions (If Applicable)</h3>
            <p className="text-sm text-gray-700 mb-4">
              All purchases are final and non-refundable except as required by law or described otherwise. Additional terms may apply.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">8. Third-Party Services</h3>
            <p className="text-sm text-gray-700 mb-4">
              The Services may integrate third-party content or features. We do not control and are not responsible for third-party services.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">9. Privacy</h3>
            <p className="text-sm text-gray-700 mb-4">
              Your use of the Services is also governed by our Privacy Policy.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">10. Disclaimer of Warranties</h3>
            <p className="text-sm text-gray-700 mb-4">
              THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">11. Limitation of Liability</h3>
            <p className="text-sm text-gray-700 mb-4">
              TO THE FULLEST EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY CLAIMS RELATING TO THE SERVICES SHALL NOT EXCEED THE GREATER OF (A) US$100 OR (B) THE AMOUNTS YOU PAID US, IF ANY, IN THE 12 MONTHS PRECEDING THE CLAIM. WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">12. Indemnification</h3>
            <p className="text-sm text-gray-700 mb-4">
              You agree to indemnify and hold us harmless from any claims, damages, or expenses arising out of your use of the Services or violation of these Terms.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">13. Governing Law</h3>
            <p className="text-sm text-gray-700 mb-4">
              These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-laws principles. If you reside in the EEA, mandatory consumer protection provisions of your local law remain unaffected.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">14. Dispute Resolution</h3>
            <p className="text-sm text-gray-700 mb-3">
              <strong>Arbitration:</strong> Any dispute shall be resolved by binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules.
            </p>
            <p className="text-sm text-gray-700 mb-4">
              <strong>Class-Action Waiver:</strong> Disputes will be conducted only on an individual basis; class actions are not permitted.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">15. Termination</h3>
            <p className="text-sm text-gray-700 mb-4">
              We may suspend or terminate your access to the Services at any time, with or without notice, for conduct that we believe violates these Terms or is harmful to other users or us.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">16. Modifications to the Services or Terms</h3>
            <p className="text-sm text-gray-700 mb-4">
              We may modify the Services or these Terms at any time. We will provide notice of material changes, and your continued use after changes take effect constitutes acceptance.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">17. Severability</h3>
            <p className="text-sm text-gray-700 mb-4">
              If any provision is held invalid, the remaining provisions remain in full force and effect.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">18. Entire Agreement</h3>
            <p className="text-sm text-gray-700 mb-4">
              These Terms, plus any policies referenced herein, constitute the entire agreement between you and us and supersede all prior agreements.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mb-3">19. Contact</h3>
            <p className="text-sm text-gray-700 mb-3">Questions? Contact us at:</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Attn:</strong> Legal curate
              </p>
              <p className="text-sm text-gray-700">
                <strong>Email:</strong> legal@bestlist.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService; 