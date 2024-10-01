
const createChatAgent = () => {

    const CS571_WITAI_ACCESS_TOKEN = "..."; 

    let availableItems = []; //Items available to order.
    let cart = {}; //Keeps track of user's order.

    //Initialize the items available to order and display welcome message.
    const handleInitialize = async () => {
        const res = await fetch('...', {
            headers: {
                "X-CS571-ID": "..."
            }
        })
        availableItems = await res.json();

        //Welcome message
        return "Welcome to BadgerMart Voice! :) Type your question, or ask for help if you're lost!"
    }

    //Respond to user command.
    const handleReceive = async (prompt) => {

        //Call WIT ai and get user prompt details.
        const response = await fetch(`...${encodeURIComponent(prompt)}`, {
            headers: {
                Authorization: "Bearer ...",
            }
        })
        const data = await response.json();

        //Response.
        if (data.intents && data.intents.length > 0) {
            const confidence = data.intents[0].confidence;//Used to filter out out of scope prompts.
            const threshold = 0.7; //Random threshold - not provided in assignment writeup. 
            const intentName = data.intents[0].name;

            //Filters out out of scope prompts.
            if (confidence >= threshold) {

                //Get help response - returns an informational message.
                if (intentName === 'get_help') {
                    return "In BadgerMart Voice, you can get the list of items, the price of an item, add or remove an item form your cart, and checkout!"
                } 
                
                //Get items response - parses through available items and lists them out to the user. 
                else if (intentName === "get_items") {
                    let itemsStr = "We have "
                    for (let i = 0; i < availableItems.length; i++) {
                        itemsStr += availableItems[i].name.toLowerCase() + "s";
                        if (i < availableItems.length - 1) {
                            itemsStr += ", ";
                        } if (availableItems.length > 2 && i === availableItems.length - 2)
                            itemsStr += "and ";
                    }
                    return itemsStr + " for sale!";
                } 
                
                //Get price response - returns with specified item price. 
                else if (intentName === "get_price") {
                    for (let i = 0; i < availableItems.length; i++) {

                        //Specified item found
                        if (data.entities && data.entities['item_name:item_name'] && data.entities['item_name:item_name'][0].value === availableItems[i].name.toLowerCase()) {
                            let itemName = data.entities['item_name:item_name'][0].value;
                            let capitalizedItemName = itemName.charAt(0).toUpperCase() + itemName.slice(1); //I realize now that this wasn't necessary. Could have jsut used available item.
                            let roundedCost = availableItems[i].price.toFixed(2); //Round cost to 2 decimal places.
                            let s = capitalizedItemName + "s cost $" + roundedCost + " each";
                            return s;
                        }
                    }

                    //No match.
                    return "Item not in stock"
                } 
                
                //Add item to cart response. Adds 1 or multiple of the same item to the user's cart. 
                else if (intentName === "add_item") {
                    for (let i = 0; i < availableItems.length; i++) {

                        //Find correct item to add.
                        if (data.entities && data.entities['item_name:item_name'] && data.entities['item_name:item_name'][0].value === availableItems[i].name.toLowerCase()) {
                            let num = 1; //Default value

                            //Number specified. 
                            if (data.entities['item_num:item_num']) {
                                num = parseInt(data.entities['item_num:item_num'][0].value)
                                num = Math.floor(num);
                                if (num < 1) {
                                    return "Quantity invalid";
                                }
                            }

                            //Response message.
                            let itemName = data.entities['item_name:item_name'][0].value;
                            let s = "Sure, adding " + num + " " + itemName + "(s) to your cart";

                            //Add to cart
                            if (cart[itemName]) {
                                cart[itemName] += num;
                            }
                            else {
                                cart[itemName] = num;
                            }
                            return s;
                        }
                    }

                    //No match.
                    return "Item not in stock"
                } 
                
                //Remove item response.
                else if (intentName === "remove_item") {
                    for (let i = 0; i < availableItems.length; i++) {

                        //Finds specified item.
                        if (data.entities && data.entities['item_name:item_name'] && data.entities['item_name:item_name'][0].value === availableItems[i].name.toLowerCase()) {
                            let num = 1; //Default number

                            //Number specified.
                            if (data.entities['item_num:item_num']) {
                                num = parseInt(data.entities['item_num:item_num'][0].value)
                                num = Math.floor(num);
                                if (num < 1) {
                                    return "Quantity invalid";
                                }
                            }

                            //Create response message.
                            let itemName = data.entities['item_name:item_name'][0].value;
                            let s = "Sure, removing " + num + " " + itemName + "(s) from your cart";

                            //Add to cart
                            if (cart[itemName]) {
                                if (cart[itemName] < num) {
                                    cart[itemName] = 0;
                                } else {
                                    cart[itemName] -= num;
                                }
                            }
                            return s;
                        }
                    }

                    //No match.
                    return "Item not in stock"
                } 
                
                //Displays user's cart.
                else if (intentName === "view_cart") {
                    //Show cart
                    let s = "You have "; //Return string.
                    let totalCost = 0; //Cost of cart.
                    let items = false; //Used to determine whether cart is empty or not.

                    //Check each item in cart. 
                    for (let i = 0; i < availableItems.length; i++) {
                        let itemName = availableItems[i].name.toLowerCase()
                        if (cart[itemName] > 0) {
                            items = true;
                            s += cart[itemName] + " " + itemName + "(s)"
                            totalCost += cart[itemName] * availableItems[i].price;
                            if (i < availableItems.length - 1) {
                                s += ", ";
                            } if (availableItems.length > 2 && i === availableItems.length - 2) {
                                s += "and ";
                            }
                        }
                    }

                    //Empty cart.
                    if (!items) {
                        s += "nothing in your cart, totaling $" + totalCost.toFixed(2);

                    } 
                    
                    //Non-empty cart.
                    else {
                        s += " in your cart, totaling $" + totalCost.toFixed(2);
                    }
                    return s;

                } 
                
                //Checkout response. 
                else if (intentName === "checkout") {
                    let items = false; //Used to determine if cart is empty.
                    const cartBody = {}; //Used to format data for fetch.
                   
                    //Format cartBody.
                    for (let i = 0; i < availableItems.length; i++) {
                        let itemName = availableItems[i].name.toLowerCase();
                        let checkoutName = availableItems[i].name;
                        if (cart[itemName] > 0) {
                            items = true;
                            cartBody[checkoutName] = cart[itemName];
                        } else if (!cart[itemName] || cart[itemName] === 0) {
                            cartBody[checkoutName] = 0;
                        }
                    }

                    //Empty cart.
                    if (!items) {
                        return "Your cart is empty";
                    }

                    //Checkout fetch.
                    const res = await fetch(`...`, {
                        method: "POST",
                        headers: {
                            "X-CS571-ID": "...",
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(cartBody)
                    })
                    if (res.status === 200) {
                        //Success - print out confirmation id.
                        const data = await res.json();
                        cart = {};
                        return `Success! Your confirmation ID is ${data.confirmationId}`;
                    } else if (res === 400) {
                        //Error.
                        return "Error occurred."
                    }
                }
            }
        }

        //If confidence is not enough, inform user. 
        return "Sorry, I didn't get that. Type 'help' to see what you can do!";
    }

    return {
        handleInitialize,
        handleReceive
    }
}

export default createChatAgent;