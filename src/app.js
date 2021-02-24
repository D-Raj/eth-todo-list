App = {
    loading: false,
    contracts: {},

    load: async () => {
        await App.loadWeb3();
        await App.loadAccount();
        await App.loadContract();
        await App.render();
    },

    // newWay to connect to the newUser
    loadAccount: async () => {
        const accounts = await ethereum.request({ method: "eth_accounts" });
        App.account = accounts[0];
    },

    loadContract: async () => {
        // Create a JavaScript version of the smart contract
        const todoList = await $.getJSON('TodoList.json')
        App.contracts.TodoList = TruffleContract(todoList)
        App.contracts.TodoList.setProvider(App.web3Provider)

        // Hydrate the smart contract with values from the blockchain
        App.todoList = await App.contracts.TodoList.deployed()
    },

    render: async () => {
        // Prevent double-rendering
        $("#account").html(App.account);

        if (App.loading) return;

        // UI/UX purposes
        App.setLoading(true);

        await App.renderTasks();
        App.setLoading(false);
    },

    renderTasks: async () => {

        const $taskTemplate = $(".taskTemplate");
        const taskCount = await App.todoList.taskCount();

        // Render out each task with a new task template
        for (var i = 1; i <= taskCount; i++) {
            // Fetch the task data from the blockchain
            const task = await App.todoList.tasks(i)
            const taskId = task[0].toNumber()
            const taskContent = task[1]
            const taskCompleted = task[2]

            // Create the html for the task
            const $newTaskTemplate = $taskTemplate.clone()
            $newTaskTemplate.find('.content').html(taskContent)
            $newTaskTemplate.find('input')
                .prop('name', taskId)
                .prop('checked', taskCompleted)
                .on('click', App.toggleCompleted)

            // Put the task in the correct list
            if (taskCompleted) {
                $('#completedTaskList').append($newTaskTemplate)
            } else {
                $('#taskList').append($newTaskTemplate)
            }

            // Show the task
            $newTaskTemplate.show()
        }
    },

    createTask: async () => {
        App.setLoading(true)
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        const content = $('#newTask').val()

        const transactionParameters = {
            from: account,
            value: '0x29a2241af62c0000',
            gasPrice: '0x09184e72a000',
            gas: '0x2710',
        };

        App.todoList.createTask(content).send( {from: account}).then( function(tx) {
            console.log("Transaction: ", tx);
        });

        // await ethereum.request({
        //     method: 'eth_sendTransaction',
        //     params: [transactionParameters],
        // });
        window.location.reload()
    },

    toggleCompleted: async (e) => {
        App.setLoading(true)
        const taskId = e.target.name
        await App.todoList.toggleCompleted(taskId)
        window.location.reload()
    },

    setLoading: (state) => {
        App.loading = state;
        const loader = $("#loader");
        const content = $("#content");

        if (state) {
            loader.show();
            content.hide();
        } else {
            loader.hide();
            content.show();
        }
    },

    loadWeb3: async () => {
        if (typeof web3 !== "undefined") {
            App.web3Provider = web3.currentProvider;
            web3 = new Web3(web3.currentProvider);
        } else {
            window.alert("Please connect to Metamask.");
        }
        // Modern dapp browsers...
        if (window.ethereum) {
            window.web3 = new Web3(ethereum);
            try {
                // ask user for permission
                await ethereum.enable();
                // user approved permission
            } catch (error) {
                // user rejected permission
                console.log('user rejected permission');
            }
        }
        // Old web3 provider
        else if (window.web3) {
            window.web3 = new Web3(web3.currentProvider);
            // no need to ask for permission
        }
        // No web3 provider
        else {
            console.log('No web3 provider detected');
        }
    },
};

$(() => {
    $(window).load(() => {
        App.load();
    });
});