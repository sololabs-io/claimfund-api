import nacl from "tweetnacl";
import * as web3 from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import { newConnection } from "../../lib/solana";
import axios from "axios";
import { Metaplex } from "@metaplex-foundation/js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createNoopSigner, createSignerFromKeypair, generateSigner, GenericFile, KeypairSigner, publicKey, signerIdentity, sol, TransactionBuilder, Umi, unwrapOption } from "@metaplex-foundation/umi";
import * as mplTokenMetadata from '@metaplex-foundation/mpl-token-metadata';
import * as mplBubblegum from "@metaplex-foundation/mpl-bubblegum";

import { addMemo, setComputeUnitPrice, transferSol } from "@metaplex-foundation/mpl-toolbox";
import { fromWeb3JsPublicKey, toWeb3JsLegacyTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import { WalletModel } from "../../models/types";
import base58 from "bs58";
import { HeliusAsset } from "./HeliusTypes";
import { HeliusManager } from "./HeliusManager";
import { nftStorageUploader } from "@metaplex-foundation/umi-uploader-nft-storage";

import * as mplCore from '@metaplex-foundation/mpl-core';
import { CreateTransactionResponse, SolanaManager } from "./SolanaManager";

export class MetaplexManager {
    
    static async createUmiTransactionBuilder(umi: Umi, addPriorityFee: boolean = true): Promise<TransactionBuilder> {
        let transactionBuilder = new TransactionBuilder();
        if (addPriorityFee) { transactionBuilder = await this.addPriorityFeeToUmiTransaction(umi, transactionBuilder); }
        return transactionBuilder;
    }

    static async addPriorityFeeToUmiTransaction(umi: Umi, transactionBuilder: TransactionBuilder): Promise<TransactionBuilder>{
        const feeEstimate = await HeliusManager.getRecentPrioritizationFees();
        transactionBuilder = transactionBuilder.add(setComputeUnitPrice(umi, { microLamports: feeEstimate }));
        return transactionBuilder;
    }

    static async createMintNftTransaction(web3Conn: web3.Connection, walletAddress: string, collectionAddress: string, uri: string, attributes: {key: string, value: string}[] = [], isFrozen: boolean = false): Promise<CreateTransactionResponse | undefined>{
        console.log('----- createMintNftTransaction -----');

        const metaplex = new Metaplex(web3Conn);
        const umi = createUmi(process.env.SOLANA_RPC!);
        umi.use(mplCore.mplCore());
        const assetAddress = generateSigner(umi);
        console.log('assetAddress', assetAddress);

        const claimfundWallet = SolanaManager.getMainWallet(umi);

        const ownerSigner = createNoopSigner(publicKey(walletAddress));
        umi.use(signerIdentity(ownerSigner));

        let transactionBuilder = await this.createUmiTransactionBuilder(umi);

        const plugins: mplCore.PluginAuthorityPairArgs[] = [];

        if (isFrozen){
            plugins.push({
                plugin: mplCore.createPlugin({
                    type: 'PermanentFreezeDelegate',
                    data: { frozen: true },
                }),
                authority: mplCore.addressPluginAuthority(claimfundWallet.publicKey),
            });
        }

        if (attributes.length > 0){
            plugins.push({
                plugin: mplCore.createPlugin({
                    type: 'Attributes',
                    data: {
                        attributeList: attributes,
                    },
                }),
                authority: mplCore.addressPluginAuthority(claimfundWallet.publicKey),
            });
        }

        console.log('plugins.length', plugins.length);

        transactionBuilder = transactionBuilder.add(
            mplCore.createV1(umi, {
                name: 'Claim Fund',
                uri: uri,
                asset: assetAddress,
                collection: publicKey(collectionAddress),
                authority: claimfundWallet,
                plugins: plugins
            })
        );

        transactionBuilder = transactionBuilder.add(
            transferSol(umi, {
                source: ownerSigner,
                destination: claimfundWallet.publicKey,
                amount: sol(0.01),
            })
        );

        const blockhash = await web3Conn.getLatestBlockhash();
        transactionBuilder = transactionBuilder.setFeePayer(ownerSigner);
        transactionBuilder = transactionBuilder.setBlockhash(blockhash.blockhash);
        const transaction = transactionBuilder.build(umi);
        const web3jsTransaction = toWeb3JsLegacyTransaction(transaction);

        const assetKeypair = web3.Keypair.fromSecretKey(assetAddress.secretKey);
        web3jsTransaction.partialSign(assetKeypair);

        return {tx: web3jsTransaction, blockhash: blockhash};
    }

    static async mintCollectionNft(web3Conn: web3.Connection, uri: string): Promise<string>{
        console.log('----- createMintNftTransaction -----');

        const umi = createUmi(process.env.SOLANA_RPC!);
        umi.use(mplCore.mplCore());
        const collectionAddress = generateSigner(umi);

        const claimfundWallet = SolanaManager.getMainWallet(umi);
        let transactionBuilder = await this.createUmiTransactionBuilder(umi);
        umi.use(signerIdentity(claimfundWallet));

        transactionBuilder = transactionBuilder.add(
            mplCore.createCollectionV1(umi, {
                name: 'Claim Fund',
                uri: uri,
                collection: collectionAddress,
                updateAuthority: claimfundWallet.publicKey,
             })
        );

        const blockhash = await web3Conn.getLatestBlockhash();
        transactionBuilder = transactionBuilder.setFeePayer(claimfundWallet);
        transactionBuilder = transactionBuilder.setBlockhash(blockhash.blockhash);

        const result = await transactionBuilder.sendAndConfirm(umi);
        console.log('mintCollectionNft result:', result);

        return collectionAddress.publicKey;
    }

    static async uploadJson(json: any): Promise<string> {
        const umi = createUmi(process.env.SOLANA_RPC!);
        umi.use(nftStorageUploader());

        const uri = await umi.uploader.uploadJson(json);
        return uri;
    }

    static async uploadFile(umi: Umi, file: GenericFile): Promise<string> {
        const uri = await umi.uploader.upload([file]);
        return uri[0];
    }

    static async fetchAssetsByOwner(walletAddress: string) {
        const umi = createUmi(process.env.SOLANA_RPC!);
        umi.use(mplCore.mplCore());

        const owner = publicKey(walletAddress)

        const assetsByOwner = await mplCore.getAssetV1GpaBuilder(umi)
            .whereField('key', mplCore.Key.AssetV1)
            .whereField('owner', owner)
            .getDeserialized()

        console.log('assetsByOwner', assetsByOwner)
    }



}