'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { cn } from '@/lib/utils';

type PaymentState = 'idle' | 'processing' | 'success' | 'error';

export default function CheckoutPage() {
  const [checkoutBug, setCheckoutBug] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [txnId, setTxnId] = useState('');

  useEffect(() => {
    fetch('/api/chaos')
      .then((r) => r.json())
      .then((d) => setCheckoutBug(d.state?.scenarios?.checkout_bug ?? false))
      .catch(() => {});
  }, []);

  async function processPayment() {
    if (checkoutBug) {
      // Intentionally trigger the seeded Sentry incident:
      // ReferenceError: checkoutToken is not defined at checkout-flow.js:145
      try {
        // Dynamic eval reproduces an undeclared variable ReferenceError
        // eslint-disable-next-line no-eval
        eval('checkoutToken');
      } catch (err) {
        setPaymentState('error');
        setErrorMsg(err instanceof Error ? err.message : 'checkoutToken is not defined');
        if (typeof window !== 'undefined') {
          import('@sentry/nextjs')
            .then((Sentry) => Sentry.captureException(err))
            .catch(() => {});
        }
      }
      return;
    }

    setPaymentState('processing');
    setErrorMsg('');

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 129.99, currency: 'USD', method: 'card' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? `Payment failed (${res.status})`);
      }

      const data = await res.json();
      setTxnId(data.transaction_id);
      setPaymentState('success');
    } catch (err) {
      setPaymentState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Payment failed');
    }
  }

  return (
    <div className="min-h-screen">
      <Header active="checkout" />

      <main className="mx-auto max-w-lg px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">Wireless Earbuds Pro × 1</p>

          {checkoutBug && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Checkout bug scenario active</strong>
                <p className="mt-0.5 text-xs opacity-80">
                  Clicking Pay will throw ReferenceError: checkoutToken is not defined — reported to Sentry
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Subtotal</span>
              <span>$129.99</span>
            </div>
            <div className="flex justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">Shipping</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">$129.99</span>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-secondary/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Card ending in 4242
            </div>
            <p className="text-xs text-muted-foreground">demo@shopflow.io</p>
          </div>

          <button
            onClick={processPayment}
            disabled={paymentState === 'processing' || paymentState === 'success'}
            className={cn(
              'mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all',
              paymentState === 'success'
                ? 'bg-success/20 text-success'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60'
            )}
          >
            {paymentState === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
            {paymentState === 'success' && <CheckCircle2 className="h-4 w-4" />}
            {paymentState === 'idle' && 'Pay $129.99'}
            {paymentState === 'processing' && 'Processing payment...'}
            {paymentState === 'success' && `Paid — ${txnId}`}
            {paymentState === 'error' && 'Retry Payment'}
          </button>

          {paymentState === 'error' && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Payment failed</strong>
                <p className="mt-0.5 text-xs">{errorMsg}</p>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
