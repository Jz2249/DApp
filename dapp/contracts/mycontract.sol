// SPDX-License-Identifier: UNLICENSED

// DO NOT MODIFY BELOW THIS
pragma solidity ^0.8.17;

import "hardhat/console.sol";

contract Splitwise {

    address[] public users;
    // {addr:{owned_addr: amt}}
    mapping(address => mapping(address => uint32)) public user_debts;

    function all_users() public view returns(address[] memory) {
        // for (uint i = 0; i < users.length; i++) console.logAddress(users[i]);
        return users;
    }

    // returns the amt that the debtor owns the creditor
    function lookup(address debtor, address creditor) public view returns (uint32 ret) {
        return user_debts[debtor][creditor];
    }

    // Inform the contract that msg.sender now owes amt more dollars to creditor.
    function add_IOU(address creditor, uint32 amount, address debtor) public {      
        require(debtor != creditor, "wrong transaction");
        user_debts[debtor][creditor] += amount;
        console.log("#################################");
        console.log( debtor);
        console.log("#################################");
        addUser(debtor);
        addUser(creditor);
        console.log("transcation from %s to %s with", debtor, creditor);
    }

    function reduce_debt(address debtor, address creditor, uint32 amount) public {
        user_debts[debtor][creditor] -= amount;
    }
    function addUser(address user) private {
        for (uint i = 0; i < users.length; i++) {
            if (users[i] == user) return;
        }
        users.push(user);
    }
}
