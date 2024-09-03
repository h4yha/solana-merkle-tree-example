use anchor_lang::prelude::*;

pub mod merkle_proof;

declare_id!("2e9Bh6JTg7kqFGaGXdGrbCop9E46Qcba6Xanf1G2iWE7");

#[program]
pub mod solana_merkle_tree_example {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, root: [u8; 32]) -> Result<()> {
        let merkle_tree = &mut ctx.accounts.merkle_tree;

        merkle_tree.base = ctx.accounts.signer.key();
        merkle_tree.bump = *ctx.bumps.get("merkle_tree").unwrap();
        merkle_tree.root = root;

        Ok(())
    }

    pub fn whitelist_log(ctx: Context<WhitelistLog>, proof: Vec<[u8; 32]>) -> Result<()> {
        let signer = ctx.accounts.signer.key();
        let root = ctx.accounts.merkle_tree.root;

        let node = anchor_lang::solana_program::keccak::hash(signer.key().as_ref());
        require!(merkle_proof::verify(proof, root, node.0), InvalidProof);

        msg!("You're whitelist {} 👍", signer.key());

        Ok(())
    }
}

#[account]
#[derive(Default)]
pub struct MerkleTree {
    pub base: Pubkey,
    pub bump: u8,
    // 256 bit
    pub root: [u8; 32],
}

impl MerkleTree {
    // base + bump + root
    pub const LEN: usize = 32 + 1 + (1 * 32);
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        seeds = [
            b"merkle-tree".as_ref(),
            signer.key().as_ref()
        ],
        bump,
        payer = signer,
        space = 8 + 32 + 1 + (1 * 32)
    )]
    pub merkle_tree: Account<'info, MerkleTree>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WhitelistLog<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub merkle_tree: Account<'info, MerkleTree>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid proof")]
    InvalidProof,
}
