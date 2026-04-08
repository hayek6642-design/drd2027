import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, ShieldCheck, Zap } from "lucide-react";
 

export default function Home() {
  const user = null;

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-100/20">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <div className="mt-24 sm:mt-32 lg:mt-16">
              <a href="#" className="inline-flex space-x-6">
                <span className="rounded-full bg-indigo-600/10 px-3 py-1 text-sm font-semibold leading-6 text-indigo-600 ring-1 ring-inset ring-indigo-600/10">
                  New Arrivals
                </span>
                <span className="inline-flex items-center space-x-2 text-sm font-medium leading-6 text-gray-600">
                  <span>Just shipped v1.0</span>
                </span>
              </a>
            </div>
            <h1 className="mt-10 text-4xl font-display font-bold tracking-tight text-gray-900 sm:text-6xl">
              Pebalaash<span className="text-primary">.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              The exclusive marketplace where your codes are your currency. 
              No cash, no cards. Just pure value exchange.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Link href={user ? "/pebalaash" : "/login"}>
                <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                  Start Shopping <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="lg" className="rounded-full">
                  Log in <span aria-hidden="true">→</span>
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Hero Visual */}
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mt-0 lg:mr-0 lg:max-w-none lg:flex-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                {/* Unsplash image for lifestyle/shopping context */}
                {/* Shopping bags and luxury items */}
                <img
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop"
                  alt="App screenshot"
                  width={2432}
                  height={1442}
                  className="w-[76rem] rounded-md shadow-2xl ring-1 ring-gray-900/10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Exclusive Access</h2>
          <p className="mt-2 text-3xl font-display font-bold tracking-tight text-gray-900 sm:text-4xl">
            Commerce Reimagined
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Forget traditional banking. Your engagement and activity earns you codes, 
            which you can redeem directly for real-world items.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <ShoppingBag className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                Premium Products
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600">
                Curated selection of high-quality items available exclusively on our platform.
              </dd>
            </div>
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <ShieldCheck className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                Secure Transactions
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600">
                Safe and instant code redemption. Your balance is updated in real-time.
              </dd>
            </div>
            <div className="relative pl-16">
              <dt className="text-base font-semibold leading-7 text-gray-900">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                Instant Delivery
              </dt>
              <dd className="mt-2 text-base leading-7 text-gray-600">
                Automated order processing ensures your items are on their way as soon as you click buy.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
