import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Play, Heart, Flame, Crown, Shield, Upload } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold" data-testid="text-logo">Farragna</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild data-testid="button-login">
            <a href="/api/login">Sign In with Replit</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-background" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" data-testid="text-hero-title">
            Share Your Videos with the World
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
            Farragna is a video sharing platform where you can upload, discover, and engage with amazing content. 
            Express yourself with Likes, Super Likes, and Mega Likes.
          </p>
          <Button size="lg" asChild data-testid="button-get-started">
            <a href="/api/login">Get Started</a>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12" data-testid="text-features-title">
          Why Choose Farragna?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2" data-testid="text-feature-upload">Easy Upload</h3>
            <p className="text-muted-foreground">
              Upload your videos directly or share YouTube links. Simple consent process ensures you own your content.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <div className="flex gap-1">
                <Heart className="w-5 h-5 text-primary" />
                <Flame className="w-5 h-5 text-accent" />
                <Crown className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2" data-testid="text-feature-engage">Triple Engagement</h3>
            <p className="text-muted-foreground">
              Express yourself with Likes, Super Likes, and Mega Likes. Show creators how much you love their content.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2" data-testid="text-feature-protected">Content Protection</h3>
            <p className="text-muted-foreground">
              All videos are protected with watermarks and moderation to ensure a safe, quality experience.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-muted py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-cta-title">
            Ready to Share Your Story?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join Farragna today and start sharing your videos with a growing community.
          </p>
          <Button size="lg" asChild data-testid="button-join-now">
            <a href="/api/login">Join Now</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-muted-foreground">
          <p data-testid="text-copyright">Farragna - Share Your World</p>
        </div>
      </footer>
    </div>
  );
}
