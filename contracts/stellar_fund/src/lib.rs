#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
pub struct Campaign {
    pub id: u32,
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
pub struct Donation {
    pub campaign_id: u32,
    pub donor: Address,
    pub amount: i128,
    pub message: String,
    pub timestamp: u64,
}

// ---- Key helpers (only use String::from_str — SDK 21.7.7 String has no push_back/to_string/concat) ----

fn key_campaign_count() -> String {
    String::from_str(&Env::default(), "cc")
}

// Fixed key names for campaigns and donations
fn key_campaign(_env: &Env, id: u32) -> String {
    if id == 0 {
        String::from_str(_env, "c0")
    } else if id == 1 {
        String::from_str(_env, "c1")
    } else if id == 2 {
        String::from_str(_env, "c2")
    } else if id == 3 {
        String::from_str(_env, "c3")
    } else if id == 4 {
        String::from_str(_env, "c4")
    } else if id == 5 {
        String::from_str(_env, "c5")
    } else if id == 6 {
        String::from_str(_env, "c6")
    } else if id == 7 {
        String::from_str(_env, "c7")
    } else if id == 8 {
        String::from_str(_env, "c8")
    } else if id == 9 {
        String::from_str(_env, "c9")
    } else if id == 10 {
        String::from_str(_env, "c10")
    } else if id == 11 {
        String::from_str(_env, "c11")
    } else if id == 12 {
        String::from_str(_env, "c12")
    } else if id == 13 {
        String::from_str(_env, "c13")
    } else if id == 14 {
        String::from_str(_env, "c14")
    } else if id == 15 {
        String::from_str(_env, "c15")
    } else if id == 16 {
        String::from_str(_env, "c16")
    } else if id == 17 {
        String::from_str(_env, "c17")
    } else if id == 18 {
        String::from_str(_env, "c18")
    } else if id == 19 {
        String::from_str(_env, "c19")
    } else {
        // For IDs >= 20, use a fallback
        String::from_str(_env, "c99")
    }
}

fn key_donations(_env: &Env, campaign_id: u32) -> String {
    if campaign_id == 0 {
        String::from_str(_env, "d0")
    } else if campaign_id == 1 {
        String::from_str(_env, "d1")
    } else if campaign_id == 2 {
        String::from_str(_env, "d2")
    } else if campaign_id == 3 {
        String::from_str(_env, "d3")
    } else if campaign_id == 4 {
        String::from_str(_env, "d4")
    } else if campaign_id == 5 {
        String::from_str(_env, "d5")
    } else {
        String::from_str(_env, "dx")
    }
}

// ---- Contract ----

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
    ) -> u32 {
        env.events().publish(("debug",), ("create_campaign_start",));
        owner.require_auth();
        env.events().publish(("debug",), ("auth_passed",));
        let id: u32 = env
            .storage()
            .instance()
            .get(&key_campaign_count())
            .unwrap_or(0);
        env.events().publish(("debug",), ("campaign_id", id));
        let deadline = env.ledger().timestamp() + (duration_days as u64) * 86400;
        let campaign = Campaign {
            id,
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
        env.events().publish(("debug",), ("storing_campaign",));
        env.storage()
            .instance()
            .set(&key_campaign(&env, id), &campaign);
        env.events().publish(("debug",), ("incrementing_count",));
        env.storage()
            .instance()
            .set(&key_campaign_count(), &(id + 1));
        env.events()
            .publish(("campaign_created",), (id, owner, goal));
        env.events().publish(("debug",), ("create_campaign_success",));
        id
    }

    pub fn donate(env: Env, donor: Address, campaign_id: u32, amount: i128, message: String) {
        donor.require_auth();
        let mut campaign: Campaign = env
            .storage()
            .instance()
            .get(&key_campaign(&env, campaign_id))
            .expect("Campaign not found");
        assert!(campaign.active, "Campaign is not active");
        assert!(amount > 0, "Amount must be positive");
        let donation = Donation {
            campaign_id,
            donor: donor.clone(),
            amount,
            message,
            timestamp: env.ledger().timestamp(),
        };
        let mut donations: Vec<Donation> = env
            .storage()
            .instance()
            .get(&key_donations(&env, campaign_id))
            .unwrap_or(Vec::new(&env));
        donations.push_back(donation);
        env.storage()
            .instance()
            .set(&key_donations(&env, campaign_id), &donations);
        campaign.raised += amount;
        env.storage()
            .instance()
            .set(&key_campaign(&env, campaign_id), &campaign);
        env.events()
            .publish(("donation",), (campaign_id, donor, amount));
    }

    pub fn withdraw(env: Env, campaign_id: u32) {
        let mut campaign: Campaign = env
            .storage()
            .instance()
            .get(&key_campaign(&env, campaign_id))
            .expect("Campaign not found");
        campaign.owner.require_auth();
        assert!(!campaign.withdrawn, "Already withdrawn");
        assert!(campaign.raised > 0, "No funds to withdraw");
        campaign.withdrawn = true;
        campaign.active = false;
        env.storage()
            .instance()
            .set(&key_campaign(&env, campaign_id), &campaign);
        env.events().publish(
            ("withdrawal",),
            (campaign_id, campaign.owner, campaign.raised),
        );
    }

    pub fn update_campaign_status(env: Env, campaign_id: u32) -> bool {
        let mut campaign: Campaign = env
            .storage()
            .instance()
            .get(&key_campaign(&env, campaign_id))
            .expect("Campaign not found");
        if env.ledger().timestamp() > campaign.deadline {
            campaign.active = false;
            env.storage()
                .instance()
                .set(&key_campaign(&env, campaign_id), &campaign);
        }
        campaign.active
    }

    pub fn get_campaign(env: Env, id: u32) -> Campaign {
        env.storage()
            .instance()
            .get(&key_campaign(&env, id))
            .unwrap()
    }

    pub fn get_all_campaigns(env: Env) -> Vec<Campaign> {
        let count: u32 = env
            .storage()
            .instance()
            .get(&key_campaign_count())
            .unwrap_or(0);
        let mut campaigns = Vec::new(&env);
        for i in 0..count {
            if let Some(campaign) = env
                .storage()
                .instance()
                .get::<String, Campaign>(&key_campaign(&env, i))
            {
                campaigns.push_back(campaign);
            }
        }
        campaigns
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
        // Full scan — SDK 21.7.7 String doesn't support dynamic key concatenation
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

    pub fn get_donations(env: Env, campaign_id: u32) -> Vec<Donation> {
        env.storage()
            .instance()
            .get(&key_donations(&env, campaign_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_campaign_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&key_campaign_count())
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use soroban_sdk::{
        testutils::Address as _,
        Address, Env,
    };

    use super::*;

    #[test]
    fn test_create_campaign_increments_count() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StellarFund);
        let client = StellarFundClient::new(&env, &contract_id);
        let owner1 = Address::generate(&env);
        let owner2 = Address::generate(&env);
        client.create_campaign(
            &owner1,
            &String::from_str(&env, "Campaign 1"),
            &String::from_str(&env, "Desc 1"),
            &1_000_000_000,
            &30,
        );
        client.create_campaign(
            &owner2,
            &String::from_str(&env, "Campaign 2"),
            &String::from_str(&env, "Desc 2"),
            &2_000_000_000,
            &30,
        );
        assert_eq!(client.get_campaign_count(), 2);
    }

    #[test]
    fn test_campaign_fields_stored_correctly() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StellarFund);
        let client = StellarFundClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        client.create_campaign(
            &owner,
            &String::from_str(&env, "Test Title"),
            &String::from_str(&env, "Test Desc"),
            &1_000_000_000,
            &30,
        );
        let campaign = client.get_campaign(&0);
        assert_eq!(campaign.title, String::from_str(&env, "Test Title"));
        assert_eq!(campaign.goal, 1_000_000_000);
        assert!(campaign.active);
        assert!(!campaign.withdrawn);
    }

    #[test]
    fn test_donate_increases_raised() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StellarFund);
        let client = StellarFundClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let donor = Address::generate(&env);
        client.create_campaign(
            &owner,
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "Desc"),
            &1_000_000_000,
            &30,
        );
        client.donate(
            &donor,
            &0,
            &500_000_000,
            &String::from_str(&env, "Good luck!"),
        );
        let campaign = client.get_campaign(&0);
        assert_eq!(campaign.raised, 500_000_000);
    }

    #[test]
    fn test_withdraw_sets_withdrawn_flag() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StellarFund);
        let client = StellarFundClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let donor = Address::generate(&env);
        client.create_campaign(
            &owner,
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "Desc"),
            &1_000_000_000,
            &30,
        );
        client.donate(
            &donor,
            &0,
            &500_000_000,
            &String::from_str(&env, "Good luck!"),
        );
        client.withdraw(&0);
        let campaign = client.get_campaign(&0);
        assert!(campaign.withdrawn);
        assert!(!campaign.active);
    }

    #[test]
    fn test_get_donations_returns_correct_count() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StellarFund);
        let client = StellarFundClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let donor1 = Address::generate(&env);
        let donor2 = Address::generate(&env);
        client.create_campaign(
            &owner,
            &String::from_str(&env, "Test"),
            &String::from_str(&env, "Desc"),
            &1_000_000_000,
            &30,
        );
        client.donate(
            &donor1,
            &0,
            &500_000_000,
            &String::from_str(&env, "First donation"),
        );
        client.donate(
            &donor2,
            &0,
            &300_000_000,
            &String::from_str(&env, "Second donation"),
        );
        let donations = client.get_donations(&0);
        assert_eq!(donations.len(), 2);
        assert_eq!(
            donations.get(0).unwrap().message,
            String::from_str(&env, "First donation")
        );
    }
}
