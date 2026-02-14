import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Bot,
  Clock,
  Shield,
  BarChart3,
  Mail,
  FileText,
  Users,
  CheckCircle,
  Star,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Workflows",
    description:
      "Set up smart automations that learn and adapt to your business processes. No coding required.",
  },
  {
    icon: Clock,
    title: "Save 10+ Hours Weekly",
    description:
      "Automate repetitive tasks like invoicing, follow-ups, and data entry so you can focus on growth.",
  },
  {
    icon: Shield,
    title: "Australian Data Security",
    description:
      "Your data stays secure with enterprise-grade encryption. Built with Australian privacy standards in mind.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Track every workflow run. See what's working, what's saving time, and where to optimise next.",
  },
];

const templates = [
  {
    icon: Mail,
    name: "Email Auto-Responder",
    category: "Communication",
    description: "Automatically respond to customer enquiries with AI-crafted replies",
  },
  {
    icon: FileText,
    name: "Invoice Generator",
    category: "Finance",
    description: "Generate and send invoices when jobs are marked complete",
  },
  {
    icon: Users,
    name: "Lead Follow-Up",
    category: "Sales",
    description: "Nurture new leads with timed, personalised follow-up sequences",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try AutoFlow with basic automations",
    features: [
      "3 active workflows",
      "100 runs per month",
      "Email support",
      "Basic templates",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "per month",
    description: "For growing businesses ready to scale",
    features: [
      "15 active workflows",
      "2,000 runs per month",
      "Priority support",
      "All templates",
      "Custom triggers",
      "Zapier integration",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$79",
    period: "per month",
    description: "Full power for serious automation",
    features: [
      "Unlimited workflows",
      "Unlimited runs",
      "Dedicated support",
      "Custom AI models",
      "API access",
      "Team collaboration",
      "White-label options",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 border-b border-surface-800/60 bg-surface-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              AutoFlow
              <span className="text-brand-400"> AI</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-surface-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#templates" className="text-sm text-surface-400 hover:text-white transition-colors">
              Templates
            </a>
            <a href="#pricing" className="text-sm text-surface-400 hover:text-white transition-colors">
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-ghost text-sm">
              Log In
            </Link>
            <Link href="/auth/signup" className="btn-primary text-sm">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(51,139,252,0.12),transparent)]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
            </span>
            <span className="text-sm text-brand-300 font-medium">
              Now in Early Access — Built for Australian SMBs
            </span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Automate Your Business{" "}
            <span className="bg-gradient-to-r from-brand-400 via-brand-300 to-cyan-400 bg-clip-text text-transparent">
              Without the Tech Headache
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-surface-400 max-w-2xl mx-auto leading-relaxed">
            AutoFlow AI turns your repetitive business tasks into hands-free workflows.
            Built specifically for small businesses. No coding. No complexity. Just results.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="btn-primary text-base px-8 py-3.5 rounded-2xl"
            >
              Start Automating Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#features" className="btn-secondary text-base px-8 py-3.5 rounded-2xl">
              See How It Works
            </a>
          </div>

          <p className="mt-4 text-sm text-surface-500">
            Free plan available · No credit card required · Cancel anytime
          </p>

          {/* Dashboard preview */}
          <div className="mt-16 relative mx-auto max-w-5xl">
            <div className="glass-card p-2 shadow-2xl shadow-brand-500/5">
              <div className="rounded-xl bg-surface-900 border border-surface-800 p-8 min-h-[320px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 border border-brand-500/30 flex items-center justify-center mx-auto">
                    <Zap className="w-8 h-8 text-brand-400" />
                  </div>
                  <p className="text-surface-400 text-sm">
                    Your automation dashboard awaits
                  </p>
                </div>
              </div>
            </div>
            {/* Glow effect under card */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-brand-500/10 blur-3xl rounded-full" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-brand-400 font-medium text-sm tracking-wide uppercase mb-3">
              Features
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
              Everything You Need to Automate
            </h2>
            <p className="mt-4 text-surface-400 max-w-xl mx-auto">
              Powerful automation tools designed for business owners, not engineers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="glass-card-hover p-8">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-brand-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-surface-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section id="templates" className="py-24 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(51,139,252,0.06),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-brand-400 font-medium text-sm tracking-wide uppercase mb-3">
              Templates
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
              Start in Minutes, Not Months
            </h2>
            <p className="mt-4 text-surface-400 max-w-xl mx-auto">
              Pre-built automation templates for common small business tasks. Customise to fit your needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {templates.map((template, i) => (
              <div key={i} className="glass-card-hover p-6 group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center group-hover:bg-brand-500/10 group-hover:border-brand-500/20 transition-all">
                    <template.icon className="w-5 h-5 text-surface-400 group-hover:text-brand-400 transition-colors" />
                  </div>
                  <span className="badge-blue">{template.category}</span>
                </div>
                <h3 className="text-white font-semibold mb-2">{template.name}</h3>
                <p className="text-sm text-surface-400 leading-relaxed">
                  {template.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <p className="text-brand-400 font-medium text-sm tracking-wide uppercase mb-3">
              Pricing
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
              Simple, Honest Pricing
            </h2>
            <p className="mt-4 text-surface-400 max-w-xl mx-auto">
              Start free. Scale when you&apos;re ready. All prices in AUD.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? "bg-gradient-to-b from-brand-600/20 to-surface-900/80 border-2 border-brand-500/40 shadow-xl shadow-brand-500/10"
                    : "glass-card"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-brand-600 rounded-full">
                      <Star className="w-3 h-3" />
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="text-sm text-surface-400 mt-1">{plan.description}</p>
                <div className="mt-6 mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-surface-400 text-sm ml-1">/{plan.period}</span>
                </div>
                <Link
                  href="/auth/signup"
                  className={`w-full ${plan.highlighted ? "btn-primary" : "btn-secondary"} justify-center`}
                >
                  {plan.cta}
                </Link>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-surface-300">
                      <CheckCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-transparent" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Automate?
              </h2>
              <p className="text-surface-400 mb-8 max-w-md mx-auto">
                Join Australian small businesses already saving hours every week with AutoFlow AI.
              </p>
              <Link href="/auth/signup" className="btn-primary text-base px-8 py-3.5 rounded-2xl">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800/60 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display text-sm font-bold text-surface-300">
                AutoFlow AI
              </span>
            </div>
            <p className="text-sm text-surface-500">
              © 2025 AutoFlow AI. Built in Adelaide, Australia.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
