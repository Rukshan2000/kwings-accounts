import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { FeedbackProvider } from '@/components/feedback';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: { default: 'Kwings Accounts', template: '%s · Kwings Accounts' },
  description: 'Income, expenses, accounts and ROI for Kwings Media',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
