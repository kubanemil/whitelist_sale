import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { WhitelistSale } from "../target/types/whitelist_sale";
import { mintTo } from "@solana/spl-token";
import { assert, expect } from "chai";


const MINT_SEED = "mint";
const WHITELIST_SEED = "whitelist";
const METADATA_SEED = "metadata";
const CONFIG_SEED = "config";
const MPL_TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const DECIMALS = 9;


describe("whitelist_sale", () => {
    const program = anchor.workspace.WhitelistSale as Program<WhitelistSale>;
    const provider = anchor.AnchorProvider.env();
    const payer = provider.wallet.publicKey;
    anchor.setProvider(provider);

    const otherAcc = anchor.web3.Keypair.generate();
    const nonWhitelistAcc = anchor.web3.Keypair.generate();

    const [mintInfoAddress] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(MINT_SEED)],
        program.programId
    );

    const [whitelistAddress] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(WHITELIST_SEED)],
        program.programId
    );

    const [configAddress] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(CONFIG_SEED)],
        program.programId
    );

    const metadata = {
        name: "My Emil Token",
        symbol: "EMIL",
        uri: "https://turquoise-used-shark-708.mypinata.cloud/ipfs/QmbW8HunnGGccHBCfWvchb7GMWwwPqmAtxnu4Hw7JAvJpc",
        decimals: DECIMALS,
    };

    const [metadataAddress] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from(METADATA_SEED),
            MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintInfoAddress.toBuffer(),
        ],
        MPL_TOKEN_METADATA_PROGRAM_ID
    );

    describe("Initialization", () => {
        it("Is initialized!", async () => {
            const info = await provider.connection.getAccountInfo(mintInfoAddress);
            if (info) {
                console.log("Already initialized. Skipping initialization.");
                return;
            }

            const context = {
                payer,
                mint: mintInfoAddress,
                whitelist: whitelistAddress,
                metadata: metadataAddress,
                config: configAddress,
                mplTokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
            };

            // call initToken()
            const txHash = await program.methods.initToken(metadata).accounts(context).rpc();

            await provider.connection.confirmTransaction(txHash, 'finalized');
            console.log(`initToken() TX:  https://explorer.solana.com/tx/${txHash}?cluster=custom`);

            const newInfo = await provider.connection.getAccountInfo(mintInfoAddress);
            assert(newInfo, "Mint should be initialized.");
        });

        it("reinitiation attack", async () => {
            const context = {
                payer,
                mint: mintInfoAddress,
                whitelist: whitelistAddress,
                metadata: metadataAddress,
                config: configAddress,
                mplTokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
            };

            // call initToken() again
            try {
                await program.methods.initToken(metadata).accounts(context).rpc();
                assert(false, "Reinitiation attack should fail");
            } catch (e) {
                if (!String(e).includes("already in use")) {
                    console.error(e);
                    assert(false, "Reinitiation attack failed unexpectedly");
                }
            }
        });

        it("Initiation with different mint seed", async () => {
            const [otherMintInfoAddress] = anchor.web3.PublicKey.findProgramAddressSync(
                [Buffer.from("other_mint")],
                program.programId
            );
            const context = {
                payer,
                mint: otherMintInfoAddress,
                whitelist: whitelistAddress,
                metadata: metadataAddress,
                config: configAddress,
                mplTokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
            };

            // call initToken() again
            try {
                await program.methods.initToken(metadata).accounts(context).rpc();
                assert(false, "Reinitiation attack should fail");
            } catch (e) {
                if (!String(e).includes("A seeds constraint was violated")) {
                    console.error(e);
                    assert(false, "Reinitiation attack with different seed failed unexpectedly");
                }
            }
        });
    });


    describe("Tokens", () => {
        it("purchase tokens", async () => {
            const mintAmount = 10;
            const destination = await anchor.utils.token.associatedAddress({
                mint: mintInfoAddress,
                owner: payer,
            });

            let initialBalance: number;
            try {
                const balance = (await provider.connection.getTokenAccountBalance(destination))
                initialBalance = Number(balance.value.amount);
            } catch {
                initialBalance = 0; // Token account not yet initiated has 0 balance
            }
            console.log(`Initial balance: ${initialBalance}`);

            const configInitialBalance = await provider.connection.getBalance(configAddress);

            const context = {
                payer,
                destination,
                mint: mintInfoAddress,
                config: configAddress,
                whitelist: whitelistAddress,
            };

            // purchaseTokens()
            const txHash = await program.methods
                .purchaseTokens(new BN(mintAmount))
                .accounts(context)
                .rpc();

            await provider.connection.confirmTransaction(txHash);
            console.log(`purchaseTokens() TX: https://explorer.solana.com/tx/${txHash}?cluster=custom`);

            const postTokenBalance = await provider.connection.getTokenAccountBalance(destination)
            assert.equal(initialBalance + mintAmount, Number(postTokenBalance.value.amount), "Unexpected postTokenBalance");

            const configPostBalance = await provider.connection.getBalance(configAddress);
            assert(configInitialBalance < configPostBalance, "Did not receive the payment");
        });

        it("purchase tokens without whitelist", async () => {
            await airdrop(otherAcc.publicKey, provider);

            const mintAmount = 10;
            const destination = await anchor.utils.token.associatedAddress({
                mint: mintInfoAddress,
                owner: otherAcc.publicKey,
            });

            const context = {
                payer: otherAcc.publicKey,
                mint: mintInfoAddress,
                config: configAddress,
                whitelist: whitelistAddress,
                destination,
            };

            // purchaseTokens()
            try {
                await program.methods
                    .purchaseTokens(new BN(mintAmount))
                    .accounts(context)
                    .signers([otherAcc])
                    .rpc();
                assert(false, "Minting without whitelist should fail");
            } catch (e) {
                if (!String(e).includes("You are not whitelisted")) {
                    console.error(e);
                    assert(false, "Minting without whitelist failed unexpectedly");
                }
            }
        });

        it("mint tokens directly using SPL Token program", async () => {
            let otherPayer = anchor.web3.Keypair.generate();
            await airdrop(otherPayer.publicKey, provider);

            const receiverAddress = await anchor.utils.token.associatedAddress({
                mint: mintInfoAddress,
                owner: payer,
            });


            try {
                await mintTo(
                    provider.connection,
                    otherPayer,
                    mintInfoAddress,
                    receiverAddress,
                    mintInfoAddress,
                    7 * 10 ** metadata.decimals,
                );
                expect.fail("Minting should fail");
            } catch (e) {
                if (!String(e).includes("Signature verification failed")) {
                    console.error(e);
                    assert(false, "Minting from SPL failed unexpectedly");
                }
            }
        });
    });

    describe("Withdraw", () => {
        it("withdraw funds", async () => {
            await airdrop(configAddress, provider);
            const context = {
                owner: payer,
                config: configAddress,
            };

            const payerInitialBalance = await provider.connection.getBalance(payer);
            const configInitialBalance = await provider.connection.getBalance(configAddress);

            // call withdrawFunds()
            const txHash = await program.methods.withdrawLamports().accounts(context).rpc();

            await provider.connection.confirmTransaction(txHash);
            console.log(`withdrawFunds() TX: https://explorer.solana.com/tx/${txHash}?cluster=custom`);

            const payerPostBalance = await provider.connection.getBalance(payer);
            assert.approximately(
                payerPostBalance,
                payerInitialBalance + configInitialBalance,
                10 ** 7,
                "Did not withdraw full funds"
            )
        });

        it("withdraw funds from non-owner account", async () => {
            await airdrop(configAddress, provider);
            const context = {
                owner: otherAcc.publicKey,
                config: configAddress,
            };

            try {
                await program.methods.withdrawLamports().accounts(context).signers([otherAcc]).rpc();
                assert.fail("Withdraw from non-owner should fail");
            } catch (e) {
                if (!String(e).includes("InvalidOwner")) {
                    console.error(e);
                    assert(false, "Withdraw from non-owner failed unexpectedly");
                }
            }
        });
    });

    describe("Whitelist", () => {
        it("add to whitelist", async () => {
            const context = {
                authority: payer,
                whitelist: whitelistAddress,
            };

            // call addToWhitelist()
            const txHash = await program
                .methods
                .addToWhitelist(nonWhitelistAcc.publicKey)
                .accounts(context)
                .rpc();

            await provider.connection.confirmTransaction(txHash);

            const whitelist = await program.account.whitelist.fetch(whitelistAddress);
            const isWhitelisted = whitelist.users.some(
                (user: anchor.web3.PublicKey) => user.equals(nonWhitelistAcc.publicKey)
            );
            assert(isWhitelisted, "Address not added to whitelist");
        });
        it("remove from whitelist", async () => {
            const context = {
                authority: payer,
                whitelist: whitelistAddress,
            };

            // call addToWhitelist()
            const txHash = await program
                .methods
                .removeFromWhitelist(nonWhitelistAcc.publicKey)
                .accounts(context)
                .rpc();

            await provider.connection.confirmTransaction(txHash);

            const whitelist = await program.account.whitelist.fetch(whitelistAddress);
            const isWhitelisted = whitelist.users.some(
                (user: anchor.web3.PublicKey) => user.equals(nonWhitelistAcc.publicKey)
            );
            assert(!isWhitelisted, "Address still in whitelist");
        });
    });


});


async function airdrop(airdropAddress: anchor.web3.PublicKey, provider: anchor.Provider) {
    const airdropAmount = 10;

    await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(airdropAddress, airdropAmount * 10 ** DECIMALS),
        "confirmed"
    );

    const AirBalance = await provider.connection.getBalance(airdropAddress);
    console.log(`  Airdrop successful. Balance: ${AirBalance / 10 ** DECIMALS} SOL`);
}

async function getBalance() {

}