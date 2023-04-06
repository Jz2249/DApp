// =============================================================================
//                                  Config
// =============================================================================

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
var defaultAccount;


// Constant we use later
var GENESIS = '0x0000000000000000000000000000000000000000000000000000000000000000';

// This is the ABI for your contract (get it from Remix, in the 'Compile' tab)
// ============================================================
var abi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "creditor",
          "type": "address"
        },
        {
          "internalType": "uint32",
          "name": "amount",
          "type": "uint32"
        }
      ],
      "name": "add_IOU",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "all_users",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "debtor",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "creditor",
          "type": "address"
        }
      ],
      "name": "lookup",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "ret",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "user_debts",
      "outputs": [
        {
          "internalType": "uint32",
          "name": "",
          "type": "uint32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "users",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]; // FIXME: fill this in with your contract's ABI //Be sure to only have one array, not two
// ============================================================
abiDecoder.addABI(abi);
// call abiDecoder.decodeMethod to use this - see 'getAllFunctionCalls' for more

var contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // FIXME: fill this in with your contract's address/hash

var BlockchainSplitwise = new ethers.Contract(contractAddress, abi, provider.getSigner());

// =============================================================================
//                            Functions To Implement
// =============================================================================

// TODO: Add any helper functions here!
async function lookup(from, to) {
	let amt = await BlockchainSplitwise.lookup(from, to);
	return amt;
}

async function getNeighbors(user) {
	let users = await getUsers();
	let neigh = [];
	for (let i = 0; i < users.length; i++) {
		let amt = await lookup(user, users[i]);
		if (amt > 0) {
			neigh.push(users[i]);
		}
	}
	return neigh;
}


// TODO: Return a list of all users (creditors or debtors) in the system
// All users in the system are everyone who has ever sent or received an IOU
async function getUsers() {
	// console.log( "haha21312");
	let users = await BlockchainSplitwise.all_users();
	return users;
}

// TODO: Get the total amount owed by the user specified by 'user'
async function getTotalOwed(user) {
	let totalOwed = 0;
	let users = await getUsers();
	for (let i = 0; i < users.length; i++) {
		amt = await lookup(user, users[i]);
		if (parseInt(amt) > 0) {
			totalOwed += amt;
		}
	}
	return totalOwed;
}

// TODO: Get the last time this user has sent or received an IOU, in seconds since Jan. 1, 1970
// Return null if you can't find any activity for the user.
// HINT: Try looking at the way 'getAllFunctionCalls' is written. You can modify it if you'd like.
async function getLastActive(user) {
	let results = await getAllFunctionCalls(contractAddress, "add_IOU");
	console.log(results);
	for (let i = 0; i < results.length; i++) {
		let result = results[i];
		// console.log('result.args is' + result.args[0]);
		// console.log('result is' + result.from);
		// console.log(result);
		if (result.from.toLowerCase() == user.toLowerCase() || result.args[0] == user.toLowerCase()) { // last activity is defined
			console.log(result.t)
			return result.t;
		}
	}
	return null;
}

// TODO: add an IOU ('I owe you') to the system
// The person you owe money is passed as 'creditor'
// The amount you owe them is passed as 'amount'
async function add_IOU(creditor, amount) {
	var from = defaultAccount;
	console.log("add_iou from %s", from);
	from = parseInt(from);
	var path = doBFS(creditor, from, getNeighbors);
	var amt = 0;
	if (path !== null) {
		var min = amount;
		for (let i = 0; i < path.length - 1; i++) {
			amt = await lookup(path[i], path[i + 1]);
			if (amt < min) min = amt;
		}
		for (let i = 0; i < path.length - 1; i++) {
			await BlockchainSplitwise.reduce_debt(path[i], path[i + 1], amt);
		}
	}
	await BlockchainSplitwise.add_IOU(creditor, amount - amt);
}

// =============================================================================
//                              Provided Functions
// =============================================================================
// Reading and understanding these should help you implement the above

// This searches the block history for all calls to 'functionName' (string) on the 'addressOfContract' (string) contract
// It returns an array of objects, one for each call, containing the sender ('from'), arguments ('args'), and the timestamp ('t')
async function getAllFunctionCalls(addressOfContract, functionName) {
	var curBlock = await provider.getBlockNumber();
	var function_calls = [];

	while (curBlock !== GENESIS) {
	  var b = await provider.getBlockWithTransactions(curBlock);
	  var txns = b.transactions;
	  for (var j = 0; j < txns.length; j++) {
	  	var txn = txns[j];

	  	// check that destination of txn is our contract
			if(txn.to == null){continue;}
	  	if (txn.to.toLowerCase() === addressOfContract.toLowerCase()) {
	  		var func_call = abiDecoder.decodeMethod(txn.data);

				// check that the function getting called in this txn is 'functionName'
				if (func_call && func_call.name === functionName) {
					var timeBlock = await provider.getBlock(curBlock);
		  		var args = func_call.params.map(function (x) {return x.value});
	  			function_calls.push({
	  				from: txn.from.toLowerCase(),
	  				args: args,
						t: timeBlock.timestamp
	  			})
	  		}
	  	}
	  }
	  curBlock = b.parentHash;
	}
	return function_calls;
}

// We've provided a breadth-first search implementation for you, if that's useful
// It will find a path from start to end (or return null if none exists)
// You just need to pass in a function ('getNeighbors') that takes a node (string) and returns its neighbors (as an array)
async function doBFS(start, end, getNeighbors) {
	var queue = [[start]];
	while (queue.length > 0) {
		var cur = queue.shift();
		var lastNode = cur[cur.length-1]
		if (lastNode.toLowerCase() === end.toString().toLowerCase()) {
			return cur;
		} else {
			var neighbors = await getNeighbors(lastNode);
			for (var i = 0; i < neighbors.length; i++) {
				queue.push(cur.concat([neighbors[i]]));
			}
		}
	}
	return null;
}

// =============================================================================
//                                      UI
// =============================================================================

// This sets the default account on load and displays the total owed to that
// account.
provider.listAccounts().then((response)=> {
	// console.log('response is ',response[0]);
	defaultAccount = response[0];

	getTotalOwed(defaultAccount).then((response)=>{
		$("#total_owed").html("$"+response);
	});

	getLastActive(defaultAccount).then((response)=>{
		time = timeConverter(response)
		$("#last_active").html(time)
	});
});

// This code updates the 'My Account' UI with the results of your functions
$("#myaccount").change(function() {
	defaultAccount = $(this).val();

	getTotalOwed(defaultAccount).then((response)=>{
		$("#total_owed").html("$"+response);
	})

	getLastActive(defaultAccount).then((response)=>{
		time = timeConverter(response)
		$("#last_active").html(time)
	});
});

// Allows switching between accounts in 'My Account' and the 'fast-copy' in 'Address of person you owe
provider.listAccounts().then((response)=>{
	var opts = response.map(function (a) { return '<option value="'+
			a.toLowerCase()+'">'+a.toLowerCase()+'</option>' });
	$(".account").html(opts);
	$(".wallet_addresses").html(response.map(function (a) { return '<li>'+a.toLowerCase()+'</li>' }));
});

// This code updates the 'Users' list in the UI with the results of your function
getUsers().then((response)=>{
	$("#all_users").html(response.map(function (u,i) { return "<li>"+u+"</li>" }));
});

// This runs the 'add_IOU' function when you click the button
// It passes the values from the two inputs above
$("#addiou").click(function() {
	defaultAccount = $("#myaccount").val(); //sets the default account
  add_IOU($("#creditor").val(), $("#amount").val()).then((response)=>{
		window.location.reload(false); // refreshes the page after add_IOU returns and the promise is unwrapped
	})
});

// This is a log function, provided if you want to display things to the page instead of the JavaScript console
// Pass in a discription of what you're printing, and then the object to print
function log(description, obj) {
	$("#log").html($("#log").html() + description + ": " + JSON.stringify(obj, null, 2) + "\n\n");
}


// =============================================================================
//                                      TESTING
// =============================================================================

// This section contains a sanity check test that you can use to ensure your code
// works. We will be testing your code this way, so make sure you at least pass
// the given test. You are encouraged to write more tests!

// Remember: the tests will assume that each of the four client functions are
// async functions and thus will return a promise. Make sure you understand what this means.

function check(name, condition) {
	if (condition) {
		console.log(name + ": SUCCESS");
		return 3;
	} else {
		console.log(name + ": FAILED");
		return 0;
	}
}

async function sanityCheck() {
	console.log ("\nTEST", "Simplest possible test: only runs one add_IOU; uses all client functions: lookup, getTotalOwed, getUsers, getLastActive");

	var score = 0;

	var accounts = await provider.listAccounts();
	// defaultAccount = accounts[0];

	// var users = await getUsers();
	// score += check("getUsers() initially empty", users.length === 0);

	// var owed = await getTotalOwed(accounts[1]);
	// score += check("getTotalOwed(0) initially empty", owed === 0);

	// var lookup_0_1 = await BlockchainSplitwise.lookup(accounts[0], accounts[1]);
	// console.log("lookup(0, 1) current value" + lookup_0_1);
	// score += check("lookup(0,1) initially 0", parseInt(lookup_0_1, 10) === 0);

	// var response = await add_IOU(accounts[1], "10");

	// users = await getUsers();
	// score += check("getUsers() now length 2", users.length === 2);

	// owed = await getTotalOwed(accounts[0]);
	// score += check("getTotalOwed(0) now 10", owed === 10);

	// lookup_0_1 = await BlockchainSplitwise.lookup(accounts[0], accounts[1]);
	// score += check("lookup(0,1) now 10", parseInt(lookup_0_1, 10) === 10);

	// var timeLastActive = await getLastActive(accounts[0]);
	// var timeNow = Date.now()/1000;
	// var difference = timeNow - timeLastActive;
	// score += check("getLastActive(0) works", difference <= 60 && difference >= -3); // -3 to 60 seconds

	// console.log("Final Score: " + score +"/21");
	// // custom test
	// var response = await add_IOU(accounts[2], "10");
	// users = await getUsers();
	// score += check("getUsers() now length 3", users.length === 3);
	// owed = await getTotalOwed(accounts[0]);
	// score += check("getTotalOwed(0) now 10", owed === 20);
	// lookup_0_2 = await BlockchainSplitwise.lookup(accounts[0], accounts[2]);
	// score += check("lookup(0,2) now 10", parseInt(lookup_0_2, 10) === 10);

	// defaultAccount = await accounts[1];
	// var response = await add_IOU(accounts[0], "10");
	// users = await getUsers();
	// score += check("getUsers() now length 3", users.length === 3);
	// owed = await getTotalOwed(accounts[1]);
	// score += check("getTotalOwed(0) now 10", owed === 0);
	// lookup_1_0 = await BlockchainSplitwise.lookup(accounts[1], accounts[0]);
	// score += check("lookup(1,0) now 0", parseInt(lookup_1_0, 10) === 0);

	var score = 0;

	// var accounts = await web3.eth.getAccounts();
	defaultAccount = accounts[0];

	var users = await getUsers();
	score += check("getUsers() initially empty", users.length === 0);

	var owed = await getTotalOwed(accounts[0]);
	score += check("getTotalOwed(0) initially empty", owed === 0);

	var lookup_0_1 = await BlockchainSplitwise.lookup(accounts[0], accounts[1]);
	score += check("lookup(0,1) initially 0", parseInt(lookup_0_1, 10) === 0);

	var response = await add_IOU(accounts[1], "10");

	users = await getUsers();
	score += check("getUsers() now length 2", users.length === 2);

	owed = await getTotalOwed(accounts[0]);
	score += check("getTotalOwed(0) now 10", owed === 10);

	lookup_0_1 = await BlockchainSplitwise.lookup(accounts[0], accounts[1]);
	score += check("lookup(0,1) now 10", parseInt(lookup_0_1, 10) === 10);

	var timeLastActive = await getLastActive(accounts[0]);
	var timeNow = Date.now()/1000;
	var difference = timeNow - timeLastActive;
	score += check("getLastActive(0) works", difference <= 60 && difference >= -3); // -3 to 60 seconds

	// Loop 3->4, 4->5, 5->3
	defaultAccount = accounts[3];
	var response = await add_IOU(accounts[4], "50");
	var lookup_3_4 = await BlockchainSplitwise.lookup(accounts[3], accounts[4]);
	score += check("lookup(3,4) now 50", parseInt(lookup_3_4, 10) === 50);
	
	defaultAccount = accounts[4];
	var response = await add_IOU(accounts[5], "50");
	var lookup_4_5 = await BlockchainSplitwise.lookup(accounts[4], accounts[5]);
	score += check("lookup(4,5) now 50", parseInt(lookup_4_5, 10) === 50);
	
	defaultAccount = accounts[5];
	var response = await add_IOU(accounts[3], "50");
	var lookup_5_3 = await BlockchainSplitwise.lookup(accounts[5], accounts[3]);
	score += check("Resolved loop: lookup(5,3) now 0", parseInt(lookup_5_3, 10) === 0);
	
	// END OF LOOP 1
	
	// loop 6->7, 7->8, 8->6
	defaultAccount = accounts[6];
	var response = await add_IOU(accounts[7], "50");
	var lookup_6_7 = await BlockchainSplitwise.lookup(accounts[6], accounts[7]);
	score += check("lookup(6,7) now 50", parseInt(lookup_6_7, 10) === 50);
	
	defaultAccount = accounts[7];
	var response = await add_IOU(accounts[8], "50");
	var lookup_7_8 = await BlockchainSplitwise.lookup(accounts[7], accounts[8]);
	score += check("lookup(7,8) now 50", parseInt(lookup_7_8, 10) === 50);
	
	defaultAccount = accounts[8];
	var response = await add_IOU(accounts[6], "40");
	var lookup_8_6 = await BlockchainSplitwise.lookup(accounts[8], accounts[6]);
	score += check("Resolved loop: lookup(8,6) now 0", parseInt(lookup_8_6, 10) === 0);
	
	// END OF LOOP 1

	// Verify the weight has been reduced from 50 to 10.
	lookup_6_7 = await BlockchainSplitwise.lookup(accounts[6], accounts[7]);
	score += check("lookup(6,7) now 10", parseInt(lookup_6_7, 10) === 10);
	
	lookup_7_8 = await BlockchainSplitwise.lookup(accounts[7], accounts[8]);
	score += check("lookup(7,8) now 10", parseInt(lookup_7_8, 10) === 10);
	
	console.log("Final Score: " + score +"/45");
}


sanityCheck() //Uncomment this line to run the sanity check when you first open index.html
