'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Transactions } from './transactions';

export default function TransactionsPage() {
  return (
    <Suspense>
      <FromUrl />
    </Suspense>
  );
}

function FromUrl() {
  return <Transactions params={useSearchParams()} />;
}
