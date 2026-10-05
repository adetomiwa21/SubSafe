// SubSafe keeper: finds every due subscription and charges them in batches.
// Run once:   npx hardhat run scripts/keeper.js --network botchain
// Run forever: KEEPER_LOOP=60 npx hardhat run scripts/keeper.js --network botchain
const { ethers } = require("hardhat");

const ADDRESS = process.env.SUBSAFE_ADDRESS;
const BATCH = 25;

async function tick(safe) {
  const total = Number(await safe.subscriptionCount());
  const due = [];
  for (let i = 0; i < total; i++) if (await safe.isDue(i)) due.push(i);
  console.log(`[${new Date().toISOString()}] ${due.length}/${total} subscriptions due`);
  for (let i = 0; i < due.length; i += BATCH) {
    const ids = due.slice(i, i + BATCH);
    const tx = await safe.chargeMany(ids);
    const rcpt = await tx.wait();
    const charged = rcpt.logs.filter((l) => l.fragment?.name === "Charged").length;
    const failed = rcpt.logs.filter((l) => l.fragment?.name === "ChargeFailed").length;
    console.log(`  tx ${tx.hash}: charged ${charged}, failed ${failed}`);
  }
}

async function main() {
  if (!ADDRESS) throw new Error("Set SUBSAFE_ADDRESS in .env");
  const safe = await ethers.getContractAt("SubSafe", ADDRESS);
  const loop = Number(process.env.KEEPER_LOOP || 0);
  do {
    try {
      await tick(safe);
    } catch (e) {
      console.error("keeper error:", e.shortMessage || e.message);
    }
    if (loop) await new Promise((r) => setTimeout(r, loop * 1000));
  } while (loop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
