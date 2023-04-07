// SPDX-License-Identifier: UNLICENSED

// DO NOT MODIFY BELOW THIS
pragma solidity ^0.8.17;

import "hardhat/console.sol";

contract Splitwise {
    address[] public users;
    // {addr:{owned_addr: amt}}
    mapping(address => mapping(address => uint32)) public user_debts;

    function all_users() public view returns(address[] memory) {
        return users;
    }

    // returns the amt that the debtor owns the creditor
    function lookup(address debtor, address creditor) public view returns (uint32 ret) {
        return user_debts[debtor][creditor];
    }

    // Inform the contract that msg.sender now owes amt more dollars to creditor.
    function add_IOU(address creditor, uint32 amount, address[] memory path) public {
        require(msg.sender != creditor, "wrong transaction");
        uint32 min = 0;
        if (path.length > 0) {
            min = amount;
            for (uint i = 0; i < path.length - 1; i++) {
            uint32 amt = lookup(path[i], path[i+1]);
                if (amt < min) {
                    min = amt;
                }   
            }
            for (uint i = 0; i < path.length - 1; i++) {
                user_debts[path[i]][path[i+1]] -= min;
            }    
        }
        user_debts[msg.sender][creditor] += amount - min;
        addUser(msg.sender);
        addUser(creditor);
    }

    function addUser(address user) private {
        for (uint i = 0; i < users.length; i++) {
            if (users[i] == user) return;
        }
        users.push(user);
    }
}
