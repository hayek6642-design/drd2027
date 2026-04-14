import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ZagelMain from "@/pages/ZagelMain";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ZagelMain />
    </QueryClientProvider>
  );
}

export default App;
