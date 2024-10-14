import { http, createConfig } from "wagmi";
import { mainnet, foundry, sepolia } from "wagmi/chains";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

import TornadoCashUI from "./VoteUI";

const projectId = "4265189f60ad0e1a606df6152e4e2ca0";

const config = createConfig(
  getDefaultConfig({
    // Your dApps chains
    // chains: [foundry],
    chains: [sepolia],
    transports: {
      // RPC URL for each chain
      [foundry.id]: http("http://127.0.0.1:8545"),
    },

    // Required API Keys
    walletConnectProjectId: projectId,

    // Required App Info
    appName: "zkVoting Demo",

    // Optional App Info
    appDescription: "zkVoting Demo",
    appUrl: "https://family.co", // your app's url
    appIcon: "https://family.co/logo.png", // your app's icon, no bigger than 1024x1024px (max. 1MB)
  })
);

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <TornadoCashUI />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
