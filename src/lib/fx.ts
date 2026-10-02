const FX_API = 'https://api.frankfurter.app/latest?from=EUR&to=GBP';

let ratePromise: Promise<number> | null = null;

export function getEurToGbpRate(): Promise<number> {
  if (!ratePromise) {
    ratePromise = fetch(FX_API)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Exchange rate lookup failed: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const rate = data?.rates?.GBP;
        if (typeof rate !== 'number') {
          throw new Error('Exchange rate unavailable');
        }
        return rate;
      })
      .catch((e) => {
        ratePromise = null;
        throw e;
      });
  }
  return ratePromise;
}
