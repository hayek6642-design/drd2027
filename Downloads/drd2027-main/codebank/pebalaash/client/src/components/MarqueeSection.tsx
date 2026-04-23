import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, Gift, Zap, Award } from "lucide-react";

export function MarqueeSection() {
  const announcements = [
    { icon: ShoppingBag, text: "Premium Products Available" },
    { icon: Gift, text: "Exclusive Rewards Program" },
    { icon: Zap, text: "Fast Checkout Process" },
    { icon: Award, text: "Premium Quality Guaranteed" },
    { icon: ShoppingBag, text: "Wide Selection of Items" },
    { icon: Gift, text: "Best Prices on Codes" },
  ];

  return (
    <div className="w-full bg-gradient-to-r from-orange-900 via-pink-900 to-black py-3 overflow-hidden">
      <div className="flex gap-6 animate-marquee">
        {[...announcements, ...announcements].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full whitespace-nowrap hover:bg-white/20 transition-colors cursor-pointer"
            >
              <Icon className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-white">{item.text}</span>
              <ArrowRight className="w-3 h-3 text-pink-400" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
