import express, { Request, Response } from "express";
import { HeliusManager } from "../../services/solana/HeliusManager";
import { validateRequest } from "../../middlewares/ValidateRequest";
import { body } from "express-validator";
import { TipLink } from "@tiplink/api";
import { MintApiRequest } from "helius-sdk";
import { BadRequestError } from "../../errors/BadRequestError";
import { kSupportedTokens } from "../../services/Constants";
import { MetaplexManager } from "../../services/solana/MetaplexManager";
import { newConnection } from "../../lib/solana";
import { SolanaManager } from "../../services/solana/SolanaManager";

const router = express.Router();

// https://github.com/metaplex-foundation/mpl-core/tree/main/clients/js

router.post(
    '/api/v1/manage/create',
    [
        body('walletAddress').notEmpty().withMessage('Wallet Address must be valid'),
        body('email').isEmail().withMessage('Email must be valid'),
        body('title').notEmpty().withMessage('Title must be valid'),
        body('description').notEmpty().withMessage('Description must be valid'),
        body('image').optional().notEmpty().withMessage('Image must be valid'),
        body('goal').optional().isNumeric().withMessage('goal must be valid'),

    ],
    validateRequest,
    async (req: Request, res: Response) => {
        const walletAddress = req.body.walletAddress;
        const title = req.body.title;
        const description = req.body.description;
        const imageUrl = req.body.image;
        const goal = req.body.goal;
        const email = req.body.email;
        const tokenAddress = req.body.token;

        const token = kSupportedTokens.find(t => t.mintAddress === tokenAddress);
        if (!token){
            throw new BadRequestError('Token is not supported');
        }

        // create a tiplink
        const tiplink = await TipLink.create();
        const privateKey = tiplink.url.toString().split("/").pop();
        const publicKey = tiplink.keypair.publicKey.toBase58();


        const web3Conn = newConnection();
        const collectionAddress = process.env.COLLECTION_ADDRESS!;
        const uri = 'https://bafkreif6qzx2qxbpyvjjzx3yqenq42n3tsyiae47xhkfb5jqmq7xx6szpa.ipfs.nftstorage.link/';
        const mainWalletKeypair = SolanaManager.getMainWalletKeypair();

        const attributes = [
            {key:"title", value:title},
            {key:"description", value:description},
            {key:"host", value:walletAddress},
            {key:"token", value:token.name},
            {key:"tokenAddress", value:token.mintAddress},
        ];

        if (imageUrl) { attributes.push({key:"image", value:imageUrl}) };
        if (goal) { attributes.push({key:"goal", value:''+goal}) };

        const txData = await MetaplexManager.createMintNftTransaction(web3Conn, walletAddress, publicKey, collectionAddress, uri, attributes, true);
        if (!txData?.tx){
            throw new BadRequestError('Failed to create a Piggy Box. Try again.');
        }
        txData.tx.partialSign(mainWalletKeypair);
        
        let encodedTransction = txData.tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });
        const encodedTransctionString = JSON.stringify(encodedTransction.toJSON());

        const response = {
            "publicKey": publicKey,
            "privateKey": privateKey,
            "assetAddress": txData.assetAddress,
            "transaction": encodedTransctionString,
        };
      
        res.status(200).send(response);
    }
);

// router.post(
//     '/api/v1/manage/create',
//     [
//         body('walletAddress').notEmpty().withMessage('Wallet Address must be valid'),
//         body('email').isEmail().withMessage('Email must be valid'),
//         body('title').notEmpty().withMessage('Title must be valid'),
//         body('description').notEmpty().withMessage('Description must be valid'),
//         body('image').optional().notEmpty().withMessage('Image must be valid'),
//         body('goal').optional().isNumeric().withMessage('goal must be valid'),

//     ],
//     validateRequest,
//     async (req: Request, res: Response) => {
//         const walletAddress = req.body.walletAddress;
//         const title = req.body.title;
//         const description = req.body.description;
//         const imageUrl = req.body.image;
//         const goal = req.body.goal;
//         const email = req.body.email;
//         const tokenAddress = req.body.token;

//         const token = kSupportedTokens.find(t => t.mintAddress === tokenAddress);
//         if (!token){
//             throw new BadRequestError('Token is not supported');
//         }

//         //TODO: in future charge 0.01 SOL for creating a fund,
//         //      so that our Helius account won't be drained because of spam

//         // create a tiplink
//         const tiplink = await TipLink.create();
//         const privateKey = tiplink.url.toString().split("/").pop();
//         const publicKey = tiplink.keypair.publicKey.toBase58();
        
//         //TODO: mint cNFT to this wallet
//         const mintParams: MintApiRequest = {
//             name: title,
//             symbol: 'CLAIMFUND',
//             description: description,
//             owner: publicKey,
//             // delegate?: string;
//             // collection?: string;
//             creators: [{address: walletAddress, share: 100}],
//             // uri?: string;
//             sellerFeeBasisPoints: 0,
//             imageUrl: imageUrl,
//             externalUrl: 'https://claim.fund',
//             attributes: [
//                 {
//                     trait_type: 'token',
//                     value: token.name,
//                 },
//                 {
//                     trait_type: 'tokenAddress',
//                     value: token.mintAddress,
//                 },
//                 {
//                     trait_type: 'goal',
//                     value: '' + goal,
//                 },
//                 // {
//                 //     trait_type: 'email',
//                 //     value: email,
//                 // },
//             ],
//             // imagePath?: string;
//             // walletPrivateKey?: string;
//         };
//         console.log('mintParams', mintParams);
//         const mintResult = await HeliusManager.mintCompressedNFT(mintParams);
//         console.log('mintResult', mintResult);
//         if (!mintResult.minted){
//             throw new BadRequestError('Failed to create a fund. Try again.');
//         }

//         //TODO: cNFT should belong to the collection

//         const response = {
//             "publicKey": publicKey,
//             "privateKey": privateKey
//         };
      
//         res.status(200).send(response);
//     }
// );

export { router as manageRouter };
