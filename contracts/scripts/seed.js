// Publishes a few demo plans so the live demo isn't empty.
// npx hardhat run scripts/seed.js --network botchain
const { ethers } = require("hardhat");

const USDT = (n) => ethers.parseUnits(String(n), 6);
const PLANS = [
  ["NaijaFlix Premium", "Nollywood movies & series in HD. New releases every Friday.", 5, 2_592_000],
  ["AfroBeats Unlimited", "Ad-free Afrobeats, Amapiano & Highlife streaming.", 2, 2_592_000],
  ["CodeLagos Pro", "Weekly live coding classes + mentor office hours.", 3, 604_800],
  ["SubSafe Demo (1-min billing)", "Billed every minute. Watch the keeper auto-charge in real time.", 0.1, 60],
];

async function main() {
  const { SUBSAFE_ADDRESS } = process.env;
  if (!SUBSAFE_ADDRESS) throw new Error("Set SUBSAFE_ADDRESS in .env");
  const safe = await ethers.getContractAt("SubSafe", SUBSAFE_ADDRESS);
  for (const [name, desc, price, period] of PLANS) {
    const tx = await safe.createPlan(name, JSON.stringify({ desc, image: "" }), USDT(price), period);
    await tx.wait();
    console.log(`✓ ${name} (${tx.hash})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
