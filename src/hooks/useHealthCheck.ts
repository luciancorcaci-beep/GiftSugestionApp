import { useEffect, useState } from 'react';

import { checkHealth, type HealthStatus } from '@/lib/healthClient';

/** Polls the health endpoint once on mount and reports the resulting connection state. */
export function useHealthCheck(): HealthStatus {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({ state: 'checking' });

  useEffect(() => {
    let isMounted = true;

    checkHealth().then((status) => {
      if (isMounted) {
        setHealthStatus(status);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return healthStatus;
}
