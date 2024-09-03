import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaMerkleTreeExample } from "../target/types/solana_merkle_tree_example";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

describe("solana-merkle-tree-example", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .SolanaMerkleTreeExample as Program<SolanaMerkleTreeExample>;

  const whitelistedWallets = [...Array(50)].map(() =>
    anchor.web3.Keypair.generate()
  );
  const whitelistedBuffer = whitelistedWallets.map((wallet) =>
    wallet.publicKey.toBuffer()
  );

  const leaves = [
    program.provider.publicKey.toBuffer(),
    ...whitelistedBuffer,
  ].map((wl) => keccak256(wl));

  const tree = new MerkleTree(leaves, keccak256, { sort: true });
  const root = tree.getRoot();

  const [merkleTree] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("merkle-tree"), program.provider.publicKey.toBuffer()],
    program.programId
  );

  it("Initialized!", async () => {
    console.log(program.provider.publicKey.toBase58());

    console.log({
      merkleTree: merkleTree.toBase58(),
    });

    const tx = await program.methods
      .initialize([...root])
      .accounts({
        merkleTree,
        signer: program.provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([])
      .rpc();

    console.log("Your transaction signature", tx);
  });

  it("WhitelistLog", async () => {
    const leaf = keccak256(program.provider.publicKey.toBuffer());
    const proof = tree.getProof(leaf).map((p) => p.data);

    const tx1 = await program.methods
      .whitelistLog(proof)
      .accounts({
        merkleTree,
        signer: program.provider.publicKey,
      })
      .rpc();

    const leaf_2 = keccak256(whitelistedWallets[2].publicKey.toBuffer());
    const proof_2 = tree.getProof(leaf_2).map((p) => p.data);

    const tx2 = await program.methods
      .whitelistLog(proof_2)
      .accounts({
        merkleTree,
        signer: whitelistedWallets[2].publicKey,
      })
      .signers([whitelistedWallets[2]])
      .rpc();

    console.log("transaction signatures", tx1, tx2);
  });

  it("Invalid wallet", async () => {
    const invalidWallet = anchor.web3.Keypair.generate();

    const leaf = keccak256(invalidWallet.publicKey.toBuffer());
    const proof = tree.getProof(leaf).map((p) => p.data);

    try {
      await program.methods
        .whitelistLog(proof)
        .accounts({
          merkleTree,
          signer: invalidWallet.publicKey,
        })
        .signers([invalidWallet])
        .rpc();
    } catch (err) {
      console.log(err.error.errorCode);
    }
  });
});
