import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <span className="text-2xl">🛡️</span>
            </div>
            <h1 className="text-3xl font-bold gradient-text">Sentinel</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Create your account to get started
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'glass-strong shadow-2xl',
            },
          }}
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
