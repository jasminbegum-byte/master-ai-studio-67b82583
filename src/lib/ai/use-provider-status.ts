import { queryOptions, useQuery } from "@tanstack/react-query";

import { getProviderStatus } from "./providers.functions";

export const providerStatusQuery = queryOptions({
  queryKey: ["provider-status"],
  queryFn: () => getProviderStatus(),
  staleTime: 60_000,
});

export function useProviderStatus() {
  return useQuery(providerStatusQuery);
}
