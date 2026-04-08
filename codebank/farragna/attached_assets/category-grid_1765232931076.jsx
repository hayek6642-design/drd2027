"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryGrid = CategoryGrid;
const lucide_react_1 = require("lucide-react");
const card_1 = require("@/components/ui/card");
const badge_1 = require("@/components/ui/badge");
const utils_1 = require("@/lib/utils");
const schema_1 = require("@shared/schema");
function CategoryGrid({ videos, onCategoryClick, className }) {
    const categoryData = schema_1.CATEGORIES.map((category) => {
        const categoryVideos = videos.filter((v) => v.category === category);
        const featuredVideo = categoryVideos[0];
        return {
            name: category,
            count: categoryVideos.length,
            featuredVideo,
        };
    }).filter((c) => c.count > 0);
    if (categoryData.length === 0) {
        return (<div className="flex-1 flex items-center justify-center">
        <div className="text-center p-8 animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <lucide_react_1.Grid className="w-12 h-12 text-muted-foreground"/>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">No categories yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Upload videos to see them organized by category
          </p>
        </div>
      </div>);
    }
    return (<div className={(0, utils_1.cn)("p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <lucide_react_1.Grid className="w-6 h-6 text-primary"/>
        <h2 className="text-xl font-bold text-foreground">Browse Categories</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categoryData.map((category) => {
            var _a, _b;
            return (<card_1.Card key={category.name} className="overflow-hidden cursor-pointer group hover-elevate active-elevate-2" onClick={() => onCategoryClick(category.name)} data-testid={`category-card-${category.name}`}>
            <card_1.CardContent className="p-0">
              <div className="relative aspect-video bg-black overflow-hidden">
                {((_a = category.featuredVideo) === null || _a === void 0 ? void 0 : _a.thumbnailUrl) ? (<img src={category.featuredVideo.thumbnailUrl} alt={category.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>) : ((_b = category.featuredVideo) === null || _b === void 0 ? void 0 : _b.videoUrl) ? (<video src={category.featuredVideo.videoUrl} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" muted loop onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                    }}/>) : (<div className="w-full h-full flex items-center justify-center">
                    <lucide_react_1.Film className="w-12 h-12 text-white/40"/>
                  </div>)}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>

                <badge_1.Badge className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm" size="sm">
                  {category.count} video{category.count !== 1 ? "s" : ""}
                </badge_1.Badge>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                    <lucide_react_1.Play className="w-7 h-7 text-primary-foreground ml-1"/>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg font-semibold text-white capitalize">
                    {category.name}
                  </h3>
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>);
        })}
      </div>
    </div>);
}
