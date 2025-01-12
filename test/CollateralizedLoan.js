// Importing necessary modules and functions from Hardhat and Chai for testing
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Describing a test suite for the CollateralizedLoan contract
describe("CollateralizedLoan", function () {
  // A fixture to deploy the contract before each test. This helps in reducing code repetition.
  async function deployCollateralizedLoanFixture() {
    // Deploying the CollateralizedLoan contract
    const CollateralizedLoanFactory = await ethers.getContractFactory("CollateralizedLoan");
    const collateralizedLoan = await CollateralizedLoanFactory.deploy();

    // Getting the signers
    const [borrower, lender] = await ethers.getSigners();

    // Returning necessary variables
    return { collateralizedLoan, borrower, lender };
  }

  // Test suite for the loan request functionality
  describe("Loan Request", function () {
    it("Should let a borrower deposit collateral and request a loan", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower } = await loadFixture(deployCollateralizedLoanFixture);

      // 1 ETH collateral
      const collateralAmount = ethers.parseEther("1.0");

      // Deposit collateral and request a loan
      const tx = await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(10, 1000, { value: collateralAmount });

      // Wait for the transaction to be mined
      await tx.wait();

      // Verify the LoanRequested event is emitted
      expect(tx).to.emit(collateralizedLoan, "LoanRequested");
    });
  });

  // Test suite for funding a loan
  describe("Funding a Loan", function () {
    it("Allows a lender to fund a requested loan", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      // 1 ETH collateral
      const collateralAmount = ethers.parseEther("1.0");

      // Deposit collateral and request a loan
      const txRequest = await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(10, 1000, { value: collateralAmount });
      await txRequest.wait();

      // Get the loan ID
      const loanId = 0;

      // Fund the loan
      const txFund = await collateralizedLoan.connect(lender).fundLoan(loanId, { value: ethers.parseEther("0.5") });

      // Wait for the transaction to be mined
      await txFund.wait();

      // Verify the LoanFunded event is emitted
      expect(txFund).to.emit(collateralizedLoan, "LoanFunded");
    });
  });

  // Test suite for repaying a loan
  describe("Repaying a Loan", function () {
    it("Enables the borrower to repay the loan fully", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      // 1 ETH collateral
      const collateralAmount = ethers.parseEther("1.0");

      // Deposit collateral and request a loan
      const txRequest = await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(10, 1000, { value: collateralAmount });
      await txRequest.wait();

      // Get the loan ID
      const loanId = 0;

      // Fund the loan
      const txFund = await collateralizedLoan.connect(lender).fundLoan(loanId, { value: ethers.parseEther("0.5") });
      await txFund.wait();

      // Repay the loan
      const loan = await collateralizedLoan.loans(loanId);
      const interest = BigInt(loan.interestRate) * BigInt(loan.loanAmount) / 100n;
      const repaymentAmount = BigInt(loan.loanAmount) + interest;
      const txRepay = await collateralizedLoan.connect(borrower).repayLoan(loanId, { value: repaymentAmount.toString() });

      // Wait for the transaction to be mined
      await txRepay.wait();

      // Verify the LoanRepaid event is emitted
      expect(txRepay).to.emit(collateralizedLoan, "LoanRepaid");
    });
  });

  // Test suite for claiming collateral
  describe("Claiming Collateral", function () {
    it("Permits the lender to claim collateral if the loan isn't repaid on time", async function () {
      // Loading the fixture
      const { collateralizedLoan, borrower, lender } = await loadFixture(deployCollateralizedLoanFixture);

      // Deposit collateral and request a loan
      const txRequest = await collateralizedLoan.connect(borrower).depositCollateralAndRequestLoan(10, 1, { value: ethers.parseEther("1.0") });
      await txRequest.wait();

      // Get the loan ID
      const loanId = 0;

      // Fund the loan
      const txFund = await collateralizedLoan.connect(lender).fundLoan(loanId, { value: ethers.parseEther("0.5") });
      await txFund.wait();

      // Move forward in time to simulate loan default
      await ethers.provider.send("evm_increaseTime", [1000]);
      await ethers.provider.send("evm_mine");

      // Claim collateral
      const txClaim = await collateralizedLoan.connect(lender).claimCollateral(loanId);

      // Wait for the transaction to be mined
      await txClaim.wait();

      // Verify the CollateralClaimed event is emitted
      expect(txClaim).to.emit(collateralizedLoan, "CollateralClaimed");
    });
  });
});