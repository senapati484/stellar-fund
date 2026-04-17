#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Map, String, Vec,
};

const CAMPAIGNS_KEY: soroban_sdk::Symbol = symbol_short!("CAMPS");

#[contracttype]
#[derive(Clone)]
pub struct Campaign {
    pub id: u64,
    pub owner: Address,
    pub title: String,
    pub description: String,
    pub goal: i128,
    pub raised: i128,
    pub deadline: u64,
    pub withdrawn: bool,
    pub active: bool,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Donation {
    pub campaign_id: u64,
    pub donor: Address,
    pub amount: i128,
    pub message: String,
    pub timestamp: u64,
}

#[contract]
pub struct StellarFund;

#[contractimpl]
impl StellarFund {
    pub fn create_campaign(
        env: Env,
        owner: Address,
        title: String,
        description: String,
        goal: i128,
        duration_days: u32,
    ) -> u64 {
        owner.require_auth();

        // Generate random u64 ID using Soroban PRNG
        let new_id: u64 = env.prng().u64_in_range(100_000_000..u64::MAX);

        let deadline = env.ledger().timestamp() + (duration_days as u64) * 86400;
        let campaign = Campaign {
            id: new_id,
            owner: owner.clone(),
            title,
            description,
            goal,
            raised: 0,
            deadline,
            withdrawn: false,
            active: true,
            created_at: env.ledger().timestamp(),
        };

        // Store in Map<u64, Campaign> in persistent storage
        let mut campaigns: Map<u64, Campaign> = env
            .storage()
            .persistent()
            .get(&CAMPAIGNS_KEY)
            .unwrap_or(Map::new(&env));
        campaigns.set(new_id, campaign.clone());
        env.storage().persistent().set(&CAMPAIGNS_KEY, &campaigns);

        env.events()
            .publish(("campaign_created",), (new_id, owner, goal));

        new_id
    }

    pub fn donate(env: Env, donor: Address, campaign_id: u64, amount: i128, message: String) {
        donor.require_auth();

        let mut campaigns: Map<u64, Campaign> = env
            .storage()
            .persistent()
            .get(&CAMPAIGNS_KEY)
            .unwrap_or(Map::new(&env));

        let mut campaign = campaigns.get(campaign_id).expect("Campaign not found");

        assert!(campaign.active, "Campaign is not active");
        assert!(amount > 0, "Amount must be positive");

        // Record donation
        let donation = Donation {
            campaign_id,
            donor: donor.clone(),
            amount,
            message,
            timestamp: env.ledger().timestamp(),
        };

        // Update campaign raised amount
        campaign.raised += amount;
        campaigns.set(campaign_id, campaign.clone());
        env.storage().persistent().set(&CAMPAIGNS_KEY, &campaigns);

        env.events()
            .publish(("donation",), (campaign_id, donor, amount));
    }

    pub fn withdraw(env: Env, campaign_id: u64) {
        let mut campaigns: Map<u64, Campaign> = env
            .storage()
            .persistent()
            .get(&CAMPAIGNS_KEY)
            .unwrap_or(Map::new(&env));

        let mut campaign = campaigns.get(campaign_id).expect("Campaign not found");

        campaign.owner.require_auth();
        assert!(!campaign.withdrawn, "Already withdrawn");
        assert!(campaign.raised > 0, "No funds to withdraw");

        campaign.withdrawn = true;
        campaign.active = false;
        campaigns.set(campaign_id, campaign.clone());
        env.storage().persistent().set(&CAMPAIGNS_KEY, &campaigns);

        env.events().publish(
            ("withdrawal",),
            (campaign_id, campaign.owner, campaign.raised),
        );
    }

    pub fn update_campaign_status(env: Env, campaign_id: u64) -> bool {
        let mut campaigns: Map<u64, Campaign> = env
            .storage()
            .persistent()
            .get(&CAMPAIGNS_KEY)
            .unwrap_or(Map::new(&env));

        let mut campaign = campaigns.get(campaign_id).expect("Campaign not found");

        let is_active = campaign.active;
        if env.ledger().timestamp() > campaign.deadline {
            let mut c = campaign.clone();
            c.active = false;
            campaigns.set(campaign_id, c);
            env.storage().persistent().set(&CAMPAIGNS_KEY, &campaigns);
            false
        } else {
            is_active
        }
    }

    pub fn get_campaign(env: Env, id: u64) -> Campaign {
        let campaigns: Map<u64, Campaign> = env
            .storage()
            .persistent()
            .get(&CAMPAIGNS_KEY)
            .unwrap_or(Map::new(&env));
        campaigns.get(id).unwrap()
    }

    pub fn get_all_campaigns(env: Env) -> Vec<Campaign> {
        let campaigns: Map<u64, Campaign> = env
            .storage()
            .persistent()
            .get(&CAMPAIGNS_KEY)
            .unwrap_or(Map::new(&env));

        // Only return campaigns with goal > 0 (actually created)
        let mut result = Vec::new(&env);
        for campaign in campaigns.values() {
            if campaign.goal > 0 {
                result.push_back(campaign);
            }
        }
        result
    }

    pub fn get_active_campaigns(env: Env) -> Vec<Campaign> {
        let all = Self::get_all_campaigns(env.clone());
        let mut result = Vec::new(&env);
        for i in 0..all.len() {
            let c = all.get(i).unwrap();
            if c.active {
                result.push_back(c);
            }
        }
        result
    }

    pub fn get_user_campaigns(env: Env, owner: Address) -> Vec<Campaign> {
        let all = Self::get_all_campaigns(env.clone());
        let mut result = Vec::new(&env);
        for i in 0..all.len() {
            let c = all.get(i).unwrap();
            if c.owner == owner {
                result.push_back(c);
            }
        }
        result
    }

    pub fn get_campaign_count(env: Env) -> u32 {
        let campaigns: Map<u64, Campaign> = env
            .storage()
            .persistent()
            .get(&CAMPAIGNS_KEY)
            .unwrap_or(Map::new(&env));
        campaigns.keys().len() as u32
    }
}

#[cfg(test)]
mod tests {
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    use super::*;

    #[test]
    fn test_create_campaign_returns_random_id() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StellarFund);
        let client = StellarFundClient::new(&env, &contract_id);
        let owner = Address::generate(&env);

        let id = client.create_campaign(
            &owner,
            &String::from_str(&env, "Test Campaign"),
            &String::from_str(&env, "Test Description"),
            &1_000_000_000,
            &30,
        );

        // ID should be >= 100_000_000
        assert!(id >= 100_000_000);
    }

    #[test]
    fn test_donate_increases_raised() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StellarFund);
        let client = StellarFundClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let donor = Address::generate(&env);

        let id = client.create_campaign(
            &owner,
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "Desc"),
            &1_000_000_000,
            &30,
        );

        client.donate(
            &donor,
            &id,
            &500_000_000,
            &String::from_str(&env, "Good luck!"),
        );

        let campaign = client.get_campaign(&id);
        assert_eq!(campaign.raised, 500_000_000);
    }

    #[test]
    fn test_get_all_returns_only_valid_campaigns() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StellarFund);
        let client = StellarFundClient::new(&env, &contract_id);
        let owner = Address::generate(&env);

        client.create_campaign(
            &owner,
            &String::from_str(&env, "Campaign 1"),
            &String::from_str(&env, "Desc 1"),
            &1_000_000_000,
            &30,
        );

        let all = client.get_all_campaigns();
        assert_eq!(all.len(), 1);
    }
}
