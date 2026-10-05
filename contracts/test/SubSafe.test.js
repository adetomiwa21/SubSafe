const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const USDT = (n) => ethers.parseUnits(String(n), 6);
const MONTH = 30 * 24 * 60 * 60;

describe("SubSafe", () => {
  let usdt, safe, owner, treasury, merchant, alice, bob, keeper;

  beforeEach(async () => {
    [owner, treasury, merchant, alice, bob, keeper] = await ethers.getSigners();
    usdt = await (await ethers.getContractFactory("MockUSDT")).deploy();
    safe = await (await ethers.getContractFactory("SubSafe")).deploy(usdt.target, treasury.address, 100); // 1%
    for (const u of [alice, bob]) {
      await usdt.connect(u).faucet(USDT(1000));
      await usdt.connect(u).approve(safe.target, USDT(1000));
    }
    await safe.connect(merchant).createPlan("StreamNG Premium", "Movies + series", USDT(10), MONTH);
  });

  it("creates a plan with locked price & period", async () => {
    const p = await safe.getPlan(0);
    expect(p.merchant).to.equal(merchant.address);
    expect(p.price).to.equal(USDT(10));
    expect(p.period).to.equal(MONTH);
    expect(p.active).to.equal(true);
  });

  it("rejects invalid plans", async () => {
    await expect(safe.createPlan("x", "", 0, MONTH)).to.be.revertedWithCustomError(safe, "BadParams");
    await expect(safe.createPlan("x", "", USDT(1), 10)).to.be.revertedWithCustomError(safe, "BadParams");
    await expect(safe.createPlan("", "", USDT(1), MONTH)).to.be.revertedWithCustomError(safe, "BadParams");
  });

  it("charges first month on subscribe and splits fee", async () => {
    await expect(safe.connect(alice).subscribe(0)).to.emit(safe, "Charged");
    expect(await usdt.balanceOf(merchant.address)).to.equal(USDT(9.9));
    expect(await usdt.balanceOf(treasury.address)).to.equal(USDT(0.1));
    expect(await safe.hasAccess(alice.address, 0)).to.equal(true);
    expect((await safe.getPlan(0)).subscriberCount).to.equal(1);
  });

  it("blocks double subscription", async () => {
    await safe.connect(alice).subscribe(0);
    await expect(safe.connect(alice).subscribe(0)).to.be.revertedWithCustomError(safe, "AlreadySubscribed");
  });

  it("cannot charge before due, can charge after", async () => {
    await safe.connect(alice).subscribe(0);
    await expect(safe.connect(keeper).charge(0)).to.be.revertedWithCustomError(safe, "NotDue");
    await time.increase(MONTH);
    await safe.connect(keeper).charge(0);
    expect(await usdt.balanceOf(merchant.address)).to.equal(USDT(19.8));
    expect((await safe.getSubscription(0)).chargeCount).to.equal(2);
  });

  it("chargeMany skips failures, marks PastDue, and never reverts", async () => {
    await safe.connect(alice).subscribe(0);
    await safe.connect(bob).subscribe(0);
    await usdt.connect(bob).approve(safe.target, 0); // bob revokes
    await time.increase(MONTH);
    expect(await safe.dueSubsOfPlan(0)).to.deep.equal([0n, 1n]);

    await expect(safe.connect(keeper).chargeMany([0, 1, 99]))
      .to.emit(safe, "ChargeFailed")
      .withArgs(1, bob.address, "insufficient allowance");

    expect((await safe.getSubscription(0)).status).to.equal(1); // Active
    expect((await safe.getSubscription(1)).status).to.equal(2); // PastDue
    expect(await safe.hasAccess(bob.address, 0)).to.equal(false);
  });

  it("PastDue subscriber can manually renew", async () => {
    await safe.connect(bob).subscribe(0);
    await usdt.connect(bob).approve(safe.target, 0);
    await time.increase(MONTH);
    await safe.chargeMany([0]);
    await usdt.connect(bob).approve(safe.target, USDT(100));
    await safe.connect(bob).charge(0);
    expect((await safe.getSubscription(0)).status).to.equal(1);
    expect(await safe.hasAccess(bob.address, 0)).to.equal(true);
  });

  it("does not back-charge missed months after a long lapse", async () => {
    await safe.connect(alice).subscribe(0);
    await time.increase(MONTH * 3);
    await safe.charge(0);
    const s = await safe.getSubscription(0);
    const now = await time.latest();
    expect(s.paidUntil).to.equal(BigInt(now + MONTH));
    expect(s.chargeCount).to.equal(2);
  });

  it("cancel stops charges but keeps access until paidUntil", async () => {
    await safe.connect(alice).subscribe(0);
    await safe.connect(alice).cancel(0);
    expect(await safe.hasAccess(alice.address, 0)).to.equal(true);
    await time.increase(MONTH);
    await expect(safe.charge(0)).to.be.revertedWithCustomError(safe, "NotChargeable");
    expect(await safe.hasAccess(alice.address, 0)).to.equal(false);
    // can resubscribe after cancelling
    await safe.connect(alice).subscribe(0);
    expect(await safe.hasAccess(alice.address, 0)).to.equal(true);
  });

  it("only subscriber or merchant can cancel", async () => {
    await safe.connect(alice).subscribe(0);
    await expect(safe.connect(bob).cancel(0)).to.be.revertedWithCustomError(safe, "NotSubscriber");
    await safe.connect(merchant).cancel(0);
  });

  it("paused plans reject new subscribers; only merchant can update", async () => {
    await expect(safe.connect(alice).updatePlan(0, false, "")).to.be.revertedWithCustomError(safe, "InvalidPlan");
    await safe.connect(merchant).updatePlan(0, false, "paused");
    await expect(safe.connect(alice).subscribe(0)).to.be.revertedWithCustomError(safe, "PlanInactive");
  });

  it("fee is capped and owner-only", async () => {
    await expect(safe.setFee(501, treasury.address)).to.be.revertedWithCustomError(safe, "BadParams");
    await expect(safe.connect(alice).setFee(0, alice.address)).to.be.revertedWithCustomError(safe, "OwnableUnauthorizedAccount");
    await safe.setFee(0, treasury.address);
    await safe.connect(alice).subscribe(0);
    expect(await usdt.balanceOf(merchant.address)).to.equal(USDT(10));
  });

  it("subscribe reverts if first payment cannot be made", async () => {
    await usdt.connect(alice).approve(safe.target, 0);
    await expect(safe.connect(alice).subscribe(0)).to.be.reverted;
  });
});
