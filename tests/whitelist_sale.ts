import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { WhitelistSale } from "../target/types/whitelist_sale";
import { getMint, createAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";

/* If testing with a local cluster, deploy Metaplex Metadata program with:
$ solana-test-validator -r --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metadata.so
And skip local validator setup when running the tests:
$ anchor test --skip-local-validator
*/

const MINT_SEED = "mint";
const WHITELIST_SEED = "whitelist";
const METADATA_SEED = "metadata";
const MPL_TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const DECIMALS = 9;


describe("whitelist_sale", () => {
    const program = anchor.workspace.WhitelistSale as Program<WhitelistSale>;
    const provider = anchor.AnchorProvider.env();
    const payer = provider.wallet.publicKey;
    anchor.setProvider(provider);

    const otherAcc = anchor.web3.Keypair.generate();

    const [mintInfoAddress] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(MINT_SEED)],
        program.programId
    );

    const [whitelistAddress] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(WHITELIST_SEED)],
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
            mplTokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        };

        // call initToken()
        const txHash = await program.methods.initToken(metadata).accounts(context).rpc();

        await provider.connection.confirmTransaction(txHash, 'finalized');
        console.log(`initToken() TX:  https://explorer.solana.com/tx/${txHash}?cluster=custom`);

        const newInfo = await provider.connection.getAccountInfo(mintInfoAddress);
        assert(newInfo, "Mint should be initialized.");
    });

    it("transfer tokens", async () => {
        const context = {
            from: payer,
            to: otherAcc.publicKey,
        };

        const otherInitialBalance = await provider.connection.getBalance(otherAcc.publicKey);

        const amount = 10 ** 9
        // purchaseTokens()
        const txHash = await program.methods
            .transferLamports(new BN(amount))
            .accounts(context)
            .rpc();

        await provider.connection.confirmTransaction(txHash);
        console.log(`transferLamports() TX: https://explorer.solana.com/tx/${txHash}?cluster=custom`);

        const otherPostBalance = await provider.connection.getBalance(otherAcc.publicKey);
        assert(otherPostBalance == otherInitialBalance + amount, "Unexpected postBalance");
    });

    it("mint tokens", async () => {
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

        const otherInitialBalance = await provider.connection.getBalance(otherAcc.publicKey);


        const context = {
            payer,
            destination,
            mint: mintInfoAddress,
            receiver: otherAcc.publicKey,
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

        const otherPostBalance = await provider.connection.getBalance(otherAcc.publicKey);
        assert(otherInitialBalance < otherPostBalance, "Did not receive the payment");
    });

    it("mint tokens without whitelist", async () => {
        await airdrop(otherAcc.publicKey, provider);

        const mintAmount = 10;
        const receiverAddress = await anchor.utils.token.associatedAddress({
            mint: mintInfoAddress,
            owner: otherAcc.publicKey,
        });

        let initialBalance: number;
        try {
            const balance = (await provider.connection.getTokenAccountBalance(receiverAddress))
            initialBalance = balance.value.uiAmount;
        } catch {
            initialBalance = 0; // Token account not yet initiated has 0 balance
        }

        const otherInitialBalance = await provider.connection.getBalance(otherAcc.publicKey);

        const context = {
            payer: otherAcc.publicKey,
            mint: mintInfoAddress,
            receiver: payer,
            whitelist: whitelistAddress,
            destination: receiverAddress,
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
            assert(false, "Minting should fail");
        } catch (e) {
            if (!String(e).includes("Signature verification failed")) {
                console.error(e);
                assert(false, "Minting from SPL failed unexpectedly");
            }
        }
    });

    it("reinitiation attack", async () => {
        const context = {
            payer,
            mint: mintInfoAddress,
            whitelist: whitelistAddress,
            metadata: metadataAddress,
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

    it("reinitiation with different mint seed", async () => {
        const [otherMintInfoAddress] = anchor.web3.PublicKey.findProgramAddressSync(
            [Buffer.from("other_mint")],
            program.programId
        );
        const context = {
            payer,
            mint: otherMintInfoAddress,
            whitelist: whitelistAddress,
            metadata: metadataAddress,
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