let coinTarget = 10;

export function setCoinTarget(n: number) {
  coinTarget = Math.max(1, Math.floor(n));
}

export function getCoinTarget() {
  return coinTarget;
}


