'use client';

import { use } from 'react';
import { AccountDetail } from './account-detail';

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AccountDetail id={use(params).id} />;
}
