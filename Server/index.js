const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./dataBase");
const crypto = require('crypto');

//Middle
app.use(cors());
app.use(express.json());


//ROUTES
                                    //USERD FUNCTION
async function userFromApiKey(apiKey){
    console.log("apikey->"+apiKey);
    const username = await pool.query("select userName FROM CLIENT WHERE apikey = $1;",
        [apiKey]);
        if (username.rows.length!=1){
            throw new Error("apiKey non riconosciuta!"+username.rows.length);
        }
    console.log("Username->"+username.rows[0].username);
    return username.rows[0].username;
}

async function verifyProductCod(productCod){
    console.log("productCod->"+productCod);
    const count = await pool.query("select * FROM PRODOTTI WHERE productCod = $1;",
        [productCod]);
        if (count.rows.length!=1){
            throw new Error("productCod non riconosciuto!"+count.rows.length);
        }
}

async function verifyAuthorizationOnCart(username, cartCod){
    console.log("username->"+username+"  cartCod->"+cartCod);
    const count = await pool.query("select C.userNameCreator from CARRELLI as C where C.cartCod = $1 and C.userNameCreator = $2 UNION select CC.userName from CARRELLI_CONDIVISI as CC where CC.cartCod = $1 and CC.userName = $2;",
        [cartCod, username]);
        if (count.rows.length==0){
            throw new Error("AuthorizationOnCart NEGATA"+count.rows.length);
        }
}

async function VerifyProductInCart(cartCod, productCod, sellerCod){
    console.log("productCod->"+productCod+"  cartCod->"+cartCod+" sellerCod->"+sellerCod);
    const count = await pool.query("select * from PRODOTTI_CARRELLI where cartCod = $1 AND productCod = $2 AND sellerCod = $3",
                [cartCod, productCod, sellerCod]);
        if (count.rows.length!=1){
            throw new Error("Prodotto non presente nel carrello!"+count.rows.length);
        }
}

                                    //CARRELLO 
//create CARRELLO
app.post("/cart/create",async(req, res) =>{
    try {

        const {apiKey, titolo} = await req.body;
        
        //USER from apiKey
        const user = await userFromApiKey(apiKey);
        console.log("user->"+user);

        //UUID generation
        const result = await pool.query('select uuid_generate_v4() as uuid');
        const cartCod =result.rows[0].uuid;

        //INSERT CARRELLI 
        const response = await pool.query(
            "INSERT INTO CARRELLI(cartCod, userNameCreator, titolo) values ($1, $2, $3)",
            [cartCod, user, titolo]);
        
        //RESPONSE
        res.json({cartCod});

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

//renameCarrello
app.post("/cart/rename",async(req, res) =>{
    try {

        const {apiKey, cartCod, titolo} = await req.body;
        
        //USER from apiKey
        const user = await userFromApiKey(apiKey);
        verifyAuthorizationOnCart(user, cartCod);
        console.log("user->"+user);


        //INSERT CARRELLI 
        const response = await pool.query(
            "UPDATE CARRELLI SET titolo = $2 where cartcod = $1",
            [cartCod, titolo]);
        
        //RESPONSE
        res.json({cartCod});

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});


//get CARRELLI from USER creator
app.post("/cart/get",async(req, res) =>{
    try {

        const {apiKey} = await req.body;

        //USER from apiKey
        const user = await userFromApiKey(apiKey);

        //SELECT CARRELLI 
        const response= await pool.query(
            "SELECT * from CARRELLI where usernamecreator = $1;",
            [user]);
        
        //RESPONSE
        res.json(response.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

//delete CARRELLI from cartCod
app.delete("/cart/delete",async(req, res) =>{
    try {

        const {apiKey, cartCod} = await req.body;

        //USER from apiKey
        const user = await userFromApiKey(apiKey);
        verifyAuthorizationOnCart(user,cartCod);

        //SELECT CARRELLI 
        const response = await pool.query(
            "SELECT * from CARRELLI where usernamecreator = $1 and cartcod = $2;",
            [user,cartCod]);

        //DELETE AND RESPONSE -> true or false
        if (response.rows.length != 0){
            del = newCarrello = await pool.query(
                "DELETE FROM CARRELLI where usernamecreator = $1 and cartcod = $2;",
                [user,cartCod]);
            cors.log("Eliminazione riuscita");
            res.json(true);
        }else 
            res.json(false);
        

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

// addSheding CARRELLO 
app.post("/cart/shere",async(req, res) =>{
    try {

        const { apiKey, cartCod, newUsers} = await req.body;
        console.log("apikey->"+apiKey+"\nCartCod->"+cartCod);
        //USER from apiKey
        const user = await userFromApiKey(apiKey);

        //verifica propietà carrello
        const response = await pool.query(
            "SELECT * from CARRELLI where usernamecreator = $1 and cartcod = $2;",
            [user,cartCod]);

        if (response.rows.length!=1){
            res.json(false);
            throw new Error("Propietà del carrello non riconosciuta("+response.rows.length+")!");
        }
        //INSERT SHERE
        req.body.newUsers.forEach(element => {
            const ins =  pool.query(
                "INSERT INTO CARRELLI_CONDIVISI(cartCod, userName) values($1, $2)",
                [cartCod,element]);
        });        
        //RESPONSE  ->UUID of cartCod
        res.json({cartCod});

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

// getAllProduct 
app.post("/cart/allProducts",async(req, res) =>{
    try {

        const { apiKey, cartCod} = await req.body;
        console.log("apikey->"+apiKey+"\nCartCod->"+cartCod);
        //USER from apiKey
        const user = await userFromApiKey(apiKey);
        await verifyAuthorizationOnCart(user,cartCod);

        //SELECT PRODUCTS
        const allProducts = await pool.query(
            "SELECT * FROM PRODOTTI_CARRELLI where cartCod = $1",
            [cartCod]);
    
        //RESPONSE -> ALL PRODUCTS BATABASE FORMAT
        res.json(allProducts.rows);

    } catch (err) {
        console.error(err.message);
        res.json(false);
        res.status(500).send("Server error");
    }
});


//getSellers
app.post("/cart/getSellers",async(req, res) =>{
    try {

        const { apiKey, cartCod} = await req.body;
        console.log("apikey->"+apiKey+"\nCartCod->"+cartCod);
        //USER from apiKey
        const user = await userFromApiKey(apiKey);
        await verifyAuthorizationOnCart(user,cartCod);

        //SELECT SHOP
        const allSellers = await pool.query(
            "SELECT * FROM NEGOZI where sellerCod IN (SELECT distinct sellerCod from PRODOTTI_CARRELLI where cartCod = $1)",
            [cartCod]);
    
        //RESPONSE -> ALL PRODUCTS BATABASE FORMAT
        res.json(allSellers.rows);

    } catch (err) {
        console.error(err.message);
        res.json(false);
        res.status(500).send("Server error");
    }
});

//getProductForSeller
app.post("/cart/getProductForSeller",async(req, res) =>{
    try {

        const { apiKey, cartCod, sellerCod} = await req.body;
        console.log("apikey->"+apiKey+"\nCartCod->"+cartCod);
        //USER from apiKey
        const user = await userFromApiKey(apiKey);
        await verifyAuthorizationOnCart(user,cartCod);

        //SELECT PRODUCT
        const allProducts = await pool.query(
            "SELECT * FROM PRODOTTI_CARRELLI where cartCod = $1 and sellerCod = $2",
            [cartCod, sellerCod]);
    
        //RESPONSE -> ALL PRODUCTS BATABASE FORMAT
        res.json(allProducts.rows);

    } catch (err) {
        console.error(err.message);
        res.json(false);
        res.status(500).send("Server error");
    }
});

//getProductForSellerInfo
app.post("/cart/getProductForSellerInfo",async(req, res) =>{
    try {

        const { apiKey, cartCod, sellerCod} = await req.body;
        console.log("apikey->"+apiKey+"\nCartCod->"+cartCod);
        //USER from apiKey
        const user = await userFromApiKey(apiKey);
        await verifyAuthorizationOnCart(user,cartCod);

        //SELECT PRODUCT
        const allProductsInfo = await pool.query(
            "select sum(tab.quant) as quant, sum(tab.priceSum) as priceSum\n" +
            "from (select sum(PC.quantity) as quant, sum(P.price) as priceSum\n" +
            "      from PREZZI as P, PRODOTTI_CARRELLI as PC\n" +
            "      where PC.cartCod = $1 and PC.sellerCod = $2\n" +
            "        and P.offert = false\n" +
            "        and PC.productCod = P.productCod and PC.sellerCod = P.sellerCod\n" +
            "      group by PC.cartCod\n" +
            "      UNION\n" +
            "      select sum(PC.quantity) as quant, sum(P.offertPrice) as priceSum\n" +
            "       from PREZZI as P, PRODOTTI_CARRELLI as PC\n" +
            "       where PC.cartCod = $1 and PC.sellerCod = $2\n" +
            "         and P.offert = true\n" +
            "         and PC.productCod = P.productCod and PC.sellerCod = P.sellerCod\n" +
            "       group by PC.cartCod) as tab;",
            [cartCod, sellerCod]);
    
        //RESPONSE -> INFO (quantity, priceSum)
        res.json(allProductsInfo.rows);
    } catch (err) {
        console.error(err.message);
        res.json(false);
        res.status(500).send("Server error");
    }
});


                                    //PRODOTTI
//getAllProduct
app.post("/product/getAllProduct",async(req, res) =>{
    try {

        const {apiKey} = await req.body;

        //USER from apiKey
        const user = await userFromApiKey(apiKey);

        //SELECT CARRELLI 
        const allProducts= await pool.query(
            "SELECT * from PRODOTTI");
        
        //RESPONSE
        res.json(allProducts.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

//getProduct
app.post("/product/getProduct",async(req, res) =>{
    try {

        const {apiKey, productCod} = await req.body;

        //USER from apiKey
        const user = await userFromApiKey(apiKey);

        //SELECT CARRELLI 
        const allProducts= await pool.query(
            "SELECT * from PRODOTTI where productcod = $1",[productCod]);
        
        //RESPONSE
        res.json(allProducts.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});


//getPrice
app.post("/product/getPrice",async(req, res) =>{
    try {

        const {apiKey, productCod, sellerCod} = await req.body;

        //USER from apiKey
        const user = await userFromApiKey(apiKey);

        //SELECT CARRELLI 
        const allProducts= await pool.query(
            "SELECT * from PREZZI where productcod = $1 AND sellercod = $2",[productCod, sellerCod]);
        
        //RESPONSE
        res.json(allProducts.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

//getBestOfferts
app.post("/product/getBestOfferts",async(req, res) =>{
    try {

        const {apiKey, num} = await req.body;

        //USER from apiKey
        const user = await userFromApiKey(apiKey);

        //SELECT CARRELLI 
        const offerts= await pool.query(
            "select * from PREZZI where offert = true order by ((100*offertPrice)/price) limit $1; ",[num]);
        
        //RESPONSE
        res.json(offerts.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

//getAllProductPrices
app.post("/product/getAllPrices",async(req, res) =>{
    try {

        const {apiKey, productCod} = await req.body;

        //Verify USER and productcCod
        const user = await userFromApiKey(apiKey);
        await verifyProductCod(productCod);
        
        //SELECT CARRELLI 
        const allPrices= await pool.query(
            "SELECT * from PREZZI where productCod = $1",
            [productCod]);
        
        //RESPONSE
        res.json(allPrices.rows);

    } catch (err) {
        res.json(false);
        console.error(err.message);
        res.status(500).send("Server error");
    }
});
                                
//addProductToCart
app.post("/product/addToCart",async(req, res) =>{
    try {

        const {apiKey, productCod, cartCod, sellerCod, quantity} = await req.body;
        console.log("quan->"+quantity);
        //Verify USER and productcCod and permit 
        const user = await userFromApiKey(apiKey);
        await verifyProductCod(productCod);
        await verifyAuthorizationOnCart(user, cartCod);
        console.log("Tutto in regola marescià");
        
        //INSERT PRODOTTO
        const count = await pool.query("select * from PRODOTTI_CARRELLI where cartCod = $1 AND productCod = $2 AND sellerCod = $3",
                [cartCod, productCod, sellerCod]);
        if (count.rows.length==0){
            const ins= await pool.query(
                "INSERT INTO PRODOTTI_CARRELLI(cartCod, productCod, sellerCod, userName, quantity)"+
                "values($1,$2,$3,$4,$5)",
                [cartCod, productCod, sellerCod, user, quantity]);
        }else
                ins= await pool.query(
                   "UPDATE PRODOTTI_CARRELLI SET quantity = $1",
                 [quantity]);
                
        //RESPONSE
        res.json(true);

    } catch (err) {
        res.json(false);
        console.error(err.message);
        res.status(500).send("Server error");
    }
});


//remProductFromCart
app.delete("/product/remFromCart",async(req, res) =>{
    try {

        const {apiKey, productCod, cartCod, sellerCod} = await req.body;

        //Verify USER and productcCod and permit 
        const user = await userFromApiKey(apiKey);
        await verifyProductCod(productCod);
        await verifyAuthorizationOnCart(user, cartCod);
        await VerifyProductInCart(cartCod,productCod, sellerCod);
        console.log("Tutto in regola marescià");
        
        //SELECT CARRELLI
        const ins= await pool.query(
            "DELETE FROM PRODOTTI_CARRELLI WHERE cartCod = $1 AND productCod = $2 AND sellerCod = $3",
            [cartCod, productCod, sellerCod]);
        
        //RESPONSE
        res.json(true);

    } catch (err) {
        res.json(false);
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

                                    //NEGOZI

//getAllShop
app.post("/shop/getAllShop",async(req, res) =>{
    try {

        const {apiKey} = await req.body;

        //Verify USER 
        const user = await userFromApiKey(apiKey);
        
        //SELECT NEGOZI
        const allShop= await pool.query(
            "SELECT * from NEGOZI ");
        
        //RESPONSE
        res.json(allShop.rows);

    } catch (err) {
        res.json(false);
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

                                    //Search

function strcmp(a, b) {
    console.log("a->"+a+"  b->"+b);
    if (a+"" < b+"") return -1;
    if (a+"" > b+"") return 1;
    return 0;
}
                                    
//searchProd
app.post("/product/search",async(req, res) =>{
    try {

        const {apiKey,richiesta,limit} = await req.body;

        //Verify USER 
        const user = await userFromApiKey(apiKey);
        
        //SELECT NEGOZI
        const risp= await pool.query(
            "SELECT * from PRODOTTI where LOWER(name) LIKE $1 LIMIT $2;",[richiesta,limit]);
        
        //RESPONSE
        res.json(risp.rows);

    } catch (err) {
        res.json(false);
        console.error(err.message);
        res.status(500).send("Server error");
    }
});                                    

                //Token
const serverToken = "3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0";                
const clientToken = "f0a05aabd049f6cb62f425bc793534fe24161de60199a6295944a9f2f52b8ff6";

app.post("/token",async(req, res) =>{
    try {
        console.log("GET TOKEN");
        const {client} = await req.body;
        if (strcmp(client+"",clientToken)==0){
            res.json(serverToken);
            return;
        }
        res.json("false");

    } catch (err) {
        res.json(false);
        console.error(err.message);
        res.status(500).send("Server error");
    }
});  

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str; 
}

                //Users

app.post("/user/create",async(req, res) =>{
    try {
        console.log("NEW USER");
        const {token, username, password, name, surname, email, address, avatar} = await req.body;

        if (strcmp(token+"", serverToken)!=0)
            throw new Error("Token non riconosciuto!");
        

        //User check
        var risp= await pool.query(
            "SELECT * from CLIENT where $1 = userName;",[username]);
        if (risp.rows.length!= 0)
            throw new Error("User già esistente!");
        
        var key;
        while (true){
            var i=Math.random();
            var sha = crypto.createHash("sha256")
                .update(surname+name+username+password+i+"ciper")
                .digest("hex");
           
            var us = await pool.query("select userName FROM CLIENT WHERE apikey = $1;",
            [sha]);
             if (us.rows.length==0){
                  key = sha;
                  break;
            }
        }

        console.log("gne"+key);   
        risp = await pool.query(
            "INSERT INTO CLIENT(userName, name, surname, apiKey, password)"+
            "values($1,$2,$3,$4,$5);",
            [username, name, surname, key, password]
        );
        risp = await pool.query(
            "INSERT INTO CLIENT_INFO(userName, email, address, avatarID)"+
            "values ($1,$2,$3,$4);",
            [username,email,address,avatar]
        );
        
        //RESPONSE
        res.json(key);

    } catch (err) {
        res.json("false");
        console.error(err.message);
    }
});

app.listen(5000, ()=>{
    console.log("server has started on port 5000");
    
});

//Login
app.post("/user/login",async(req, res) =>{
    try {
        console.log("USER LOGIN");
        const {token, username, password} = await req.body;
        if (strcmp(token+"", serverToken)!=0)
            res.json("token error");

        risp = await pool.query(
            "SELECT * FROM CLIENT where username = $1 and password =$2",
            [username,password]
        );
        
        if (risp.rows.length!=0){
            res.json({ "status" : true , "apiKey" : risp.rows[0].apikey});
        }else
            res.json({ "status" : false , "apiKey" : ""});
            
    } catch (err) {
        res.json(false);
        console.error(err.message);
        res.status(500).send("Server error");
    }
});  

                    //Category
                    
app.post("/product/getAllCategories",async(req,res)=>{
    try {
        const {apiKey} = await req.body;
        console.log("apikey->"+apiKey);
        //USER from apiKey
        const user = await userFromApiKey(apiKey);

        const allCategories = await pool.query(
            "SELECT * FROM CATEGORIES ");
    
        //RESPONSE -> ALL CATEGORIES
        res.json(allCategories.rows);

    } catch (err) {
        console.error(err.message);
        res.json(false);
        res.status(500).send("Server error");
    } 
});

app.post("/product/getCategories",async(req,res)=>{
    try {
        const {apiKey, productCod} = await req.body;
        console.log("apikey->"+apiKey);
        //USER from apiKey
        const user = await userFromApiKey(apiKey);

        const allCategorys = await pool.query(
            "SELECT * FROM CATEGORIES as C, PRODUCT_CATEGORY as PC where C.categoryID = PC.categoryID AND PC.productCod = $1",[productCod]);
    
        //RESPONSE -> ALL CATEGORIES
        res.json(allCategorys.rows);

    } catch (err) {
        console.error(err.message);
        res.json(false);
        res.status(500).send("Server error");
    } 
});