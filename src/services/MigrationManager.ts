import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { SolanaManager } from "./solana/SolanaManager";
import { newConnection } from "../lib/solana";
import { PublicKey } from "@solana/web3.js";
import { MetaplexManager } from "./solana/MetaplexManager";

export class MigrationManager {

    static async migrate() {
        console.log('MigrationManager', 'migrate', 'start');

        const mainWalletAddress = 'C4hxuuU2pmZ2wHQLmh5brWXeW7XZNdrYVKY37n88oXKP';
        const mainWalletKeypair = SolanaManager.getMainWalletKeypair();
        const collectionAddress = process.env.COLLECTION_ADDRESS!;
        const uri = 'https://bafkreif6qzx2qxbpyvjjzx3yqenq42n3tsyiae47xhkfb5jqmq7xx6szpa.ipfs.nftstorage.link/';

        // const web3Conn = newConnection();
        // const signature = await web3Conn.requestAirdrop(
        //     new PublicKey(mainWalletAddress),
        //     1000000000
        // );
        // console.log('MigrationManager', 'migrate', 'signature', signature);

        const web3Conn = newConnection();
        // const collection = await MetaplexManager.mintCollectionNft(web3Conn, uri);
        // console.log('MigrationManager', 'migrate', 'collection', collection);


        // const assets = await MetaplexManager.fetchAssetsByOwner(mainWalletAddress);
        // console.log('MigrationManager', 'migrate', 'assets', assets);

        console.log('MigrationManager', 'migrate', 'done');
    }

}