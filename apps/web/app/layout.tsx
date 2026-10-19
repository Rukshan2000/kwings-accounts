import type { Metadata } from 'next';
import { FeedbackProvider } from '@/components/feedback';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Kwings Accounts', template: '%s · Kwings Accounts' },
  description: 'Income, expenses, accounts and ROI for Kwings Media',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
