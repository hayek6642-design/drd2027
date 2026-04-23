"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wouter_1 = require("wouter");
const queryClient_1 = require("./lib/queryClient");
const react_query_1 = require("@tanstack/react-query");
const toaster_1 = require("@/components/ui/toaster");
const tooltip_1 = require("@/components/ui/tooltip");
const theme_provider_1 = require("@/components/theme-provider");
const useAuth_1 = require("@/hooks/useAuth");
const home_1 = require("@/pages/home");
const landing_1 = require("@/pages/landing");
const not_found_1 = require("@/pages/not-found");
function Router() {
    const { isAuthenticated, isLoading } = (0, useAuth_1.useAuth)();
    return (<wouter_1.Switch>
      {isLoading || !isAuthenticated ? (<wouter_1.Route path="/" component={landing_1.default}/>) : (<wouter_1.Route path="/" component={home_1.default}/>)}
      <wouter_1.Route component={not_found_1.default}/>
    </wouter_1.Switch>);
}
function App() {
    return (<react_query_1.QueryClientProvider client={queryClient_1.queryClient}>
      <theme_provider_1.ThemeProvider>
        <tooltip_1.TooltipProvider>
          <toaster_1.Toaster />
          <Router />
        </tooltip_1.TooltipProvider>
      </theme_provider_1.ThemeProvider>
    </react_query_1.QueryClientProvider>);
}
exports.default = App;
