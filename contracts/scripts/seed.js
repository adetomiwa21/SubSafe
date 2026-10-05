// Publishes demo plans so the live app isn't empty.
// npx hardhat run scripts/seed.js --network botchain
const { ethers } = require("hardhat");

const USDT = (n) => ethers.parseUnits(String(n), 6);
const img = (id) => `https://images.unsplash.com/${id}?w=800&q=70&auto=format&fit=crop`;
const MONTH = 2_592_000;
const WEEK = 604_800;

const PLANS = [
  { name: "NaijaFlix Premium", category: "Entertainment", price: 5, period: MONTH, image: img("photo-1489599849927-2ee91cede3ba"), desc: "HD Nollywood films and series. New releases every Friday, no ads." },
  { name: "AfroWave Unlimited", category: "Music", price: 2, period: MONTH, image: img("photo-1511379938547-c1f69419868d"), desc: "Ad-free Afrobeats, Amapiano and Highlife with offline downloads." },
  { name: "CodeLagos Pro", category: "Education", price: 3, period: WEEK, image: img("photo-1517694712202-14dd9538aa97"), desc: "Weekly live coding classes, project reviews and mentor office hours." },
  { name: "Ikoyi Fit Club", category: "Fitness", price: 12, period: MONTH, image: img("photo-1534438327276-14e5300c3a48"), desc: "Gym access plus two guided sessions a week. Show your pass at the door." },
  { name: "The Naira Brief", category: "News", price: 1.5, period: MONTH, image: img("photo-1504711434969-e33886168f5c"), desc: "A five-minute daily read on markets, fintech and crypto in Nigeria." },
  { name: "Lagos Tech Pod+", category: "Entertainment", price: 1, period: MONTH, image: img("photo-1478737270239-2f02b77fc618"), desc: "Bonus episodes, early access and the members-only Discord." },
  { name: "Live Demo · 1-minute billing", category: "Other", price: 0.1, period: 60, image: "", desc: "Billed every minute so you can watch a renewal happen in real time." },
];

async function main() {
  const { SUBSAFE_ADDRESS } = process.env;
  if (!SUBSAFE_ADDRESS) throw new Error("Set SUBSAFE_ADDRESS in .env");
  const safe = await ethers.getContractAt("SubSafe", SUBSAFE_ADDRESS);
  for (const p of PLANS) {
    const meta = JSON.stringify({ desc: p.desc, image: p.image, category: p.category });
    const tx = await safe.createPlan(p.name, meta, USDT(p.price), p.period);
    await tx.wait();
    console.log(`✓ ${p.name} (${tx.hash})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
