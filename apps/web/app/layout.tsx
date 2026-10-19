import type { Metadata } from 'next';
import { Fraunces, Instrument_Sans } from 'next/font/google';
import { FeedbackProvider } from '@/components/feedback';
import './globals.css';

const serif = Fraunces({ subsets: ['latin'], variable: '--font-serif', axes: ['opsz'] });
const body = Instrument_Sans({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: { default: 'Kwings Accounts', template: '%s · Kwings Accounts' },
  description: 'Income, expenses, accounts and ROI for Kwings Media',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${body.variable}`}>
      <body>
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
